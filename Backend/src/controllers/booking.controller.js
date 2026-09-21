import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Slot } from "../models/slot.model.js";
import { Booking } from "../models/booking.model.js";
import { notify } from "../utils/notify.js";
import { updateQueueNotifications } from "../utils/queueNotifier.js";
/**
 * The capacity check and the seat reservation happen as a single atomic
 * findOneAndUpdate: "find this slot WHERE bookedCount is still less than
 * capacity, and if found, increment it." If two farmers race for the last
 * seat, only one of these calls actually matches — the other gets null
 * back and is correctly rejected. No explicit locking needed.
 */
const createBooking = asyncHandler(async (req, res) => {
    const { farmer_id, slot_id } = req.body;
    if (!farmer_id || !slot_id) {
        throw new ApiError(400, "farmer_id and slot_id are required");
    }

    const slot = await Slot.findOneAndUpdate(
        { _id: slot_id, $expr: { $lt: ["$bookedCount", "$capacity"] } },
        { $inc: { bookedCount: 1 } },
        { new: true }
    );

    if (!slot) {
        throw new ApiError(409, "Slot is full or not found, please choose another slot");
    }

    try {
        const tokenNumber = `${slot.cropType.slice(0, 3).toUpperCase()}-${slot.bookedCount}`;
        const booking = await Booking.create({
            farmerId: farmer_id,
            slotId: slot_id,
            centerId: slot.centerId,
            tokenNumber,
            status: "booked",
        });

        await notify(
            farmer_id,
            "booking_confirmed",
            `Slot booked for ${slot.cropType} at ${slot.startTime.toLocaleString()}. Your token: ${tokenNumber}`
        );

        return res.status(201).json(new ApiResponse(201, booking, "Booking created"));
    } catch (error) {
        // compensating action: booking failed after the seat was already reserved, so release it
        await Slot.updateOne({ _id: slot_id }, { $inc: { bookedCount: -1 } });
        throw new ApiError(500, "Failed to create booking");
    }
});

// Staff only — marks a farmer as physically present at the counter
const checkInBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findOneAndUpdate(
        { _id: req.params.id, status: "booked" },
        { status: "checked_in", checkedInAt: new Date() },
        { new: true }
    );
    if (!booking) {
        throw new ApiError(409, "Booking not found or not in booked state");
    }
    return res.status(200).json(new ApiResponse(200, booking, "Farmer checked in"));
});

// Releases the seat back to the slot
const cancelBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findOneAndUpdate(
        { _id: req.params.id, status: { $in: ["booked", "checked_in"] } },
        { status: "cancelled" },
        { new: true }
    );
    if (!booking) {
        throw new ApiError(409, "Booking not found or already finalized");
    }
    await Slot.updateOne({ _id: booking.slotId }, { $inc: { bookedCount: -1 } });
    await updateQueueNotifications(booking.centerId);
    return res.status(200).json(new ApiResponse(200, booking, "Booking cancelled"));
});

// Live queue for a center — poll this from the frontend, or upgrade to a
// change stream + Socket.io later for real push updates
const getQueue = asyncHandler(async (req, res) => {
    const centerObjectId = new mongoose.Types.ObjectId(req.params.center_id);

    // 1. Physically checked-in tractors inside the Mandi yard waiting for scale (sorted by check-in arrival time)
    const checkedInQueue = await Booking.aggregate([
        { $match: { centerId: centerObjectId, status: "checked_in" } },
        { $lookup: { from: "slots", localField: "slotId", foreignField: "_id", as: "slot" } },
        { $unwind: { path: "$slot", preserveNullAndEmptyArrays: true } },
        { $sort: { checkedInAt: 1, createdAt: 1 } },
        {
            $project: {
                tokenNumber: 1,
                status: 1,
                cropType: { $ifNull: ["$slot.cropType", "Produce"] },
                startTime: "$slot.startTime",
                checkedInAt: 1,
                createdAt: 1,
            },
        },
    ]);

    // 2. Advance booked tokens for this center awaiting arrival
    const bookedQueue = await Booking.aggregate([
        { $match: { centerId: centerObjectId, status: "booked" } },
        { $lookup: { from: "slots", localField: "slotId", foreignField: "_id", as: "slot" } },
        { $unwind: { path: "$slot", preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: 1 } },
        {
            $project: {
                tokenNumber: 1,
                status: 1,
                cropType: { $ifNull: ["$slot.cropType", "Produce"] },
                startTime: "$slot.startTime",
                createdAt: 1,
            },
        },
    ]);

    // 3. Most recently completed booking (to know last processed token if scale is currently between turns)
    const latestCompleted = await Booking.findOne({ centerId: centerObjectId, status: "completed" })
        .sort({ updatedAt: -1, createdAt: -1 })
        .select("tokenNumber cropType updatedAt");

    const servingToken = checkedInQueue.length > 0
        ? checkedInQueue[0].tokenNumber
        : (latestCompleted ? latestCompleted.tokenNumber : null);

    const avgProcessingMinutes = 12;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                queue: checkedInQueue, // for backward compatibility
                checkedInQueue,
                bookedQueue,
                servingToken,
                lastCompletedToken: latestCompleted?.tokenNumber || null,
                currentlyWaiting: checkedInQueue.length,
                totalBookedWaiting: bookedQueue.length,
                totalActiveToday: checkedInQueue.length + bookedQueue.length,
                avgProcessingMinutes,
            },
            "Live queue fetched"
        )
    );
});

// Staff / Admin — fetch all appointments/bookings for a center with full farmer and slot info
const getCenterBookings = asyncHandler(async (req, res) => {
    const { center_id } = req.params;
    const { status, date, search } = req.query;

    const filter = { centerId: center_id };
    if (status && status !== "all") {
        filter.status = status;
    }

    const bookings = await Booking.find(filter)
        .populate("farmerId", "name phone aadhaarNumber landRecordNumber bankAccount")
        .populate("slotId", "cropType startTime capacity")
        .sort({ createdAt: -1 });

    let result = bookings;

    // Filter by search query (token #, farmer name, phone)
    if (search && search.trim()) {
        const term = search.trim().toLowerCase();
        result = result.filter((b) => {
            const tokenMatch = b.tokenNumber?.toLowerCase().includes(term);
            const nameMatch = b.farmerId?.name?.toLowerCase().includes(term);
            const phoneMatch = b.farmerId?.phone?.includes(term);
            return tokenMatch || nameMatch || phoneMatch;
        });
    }

    // Filter by date if specified
    if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        result = result.filter((b) => {
            if (!b.slotId?.startTime) return true;
            const slotTime = new Date(b.slotId.startTime);
            return slotTime >= start && slotTime <= end;
        });
    }

    return res.status(200).json(new ApiResponse(200, result, "Center bookings fetched"));
});

export { createBooking, checkInBooking, cancelBooking, getQueue, getCenterBookings };

