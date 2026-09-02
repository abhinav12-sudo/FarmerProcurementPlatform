import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Slot } from "../models/slot.model.js";
import { Booking } from "../models/booking.model.js";
import { notify } from "../utils/notify.js";

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
        { status: "checked_in" },
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
    return res.status(200).json(new ApiResponse(200, booking, "Booking cancelled"));
});

// Live queue for a center — poll this from the frontend, or upgrade to a
// change stream + Socket.io later for real push updates
const getQueue = asyncHandler(async (req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const queue = await Booking.aggregate([
        { $match: { centerId: new mongoose.Types.ObjectId(req.params.center_id), status: "checked_in" } },
        { $lookup: { from: "slots", localField: "slotId", foreignField: "_id", as: "slot" } },
        { $unwind: "$slot" },
        { $match: { "slot.startTime": { $gte: startOfDay, $lt: endOfDay } } },
        { $sort: { createdAt: 1 } },
        { $project: { tokenNumber: 1, status: 1, cropType: "$slot.cropType", startTime: "$slot.startTime" } },
    ]);

    return res.status(200).json(new ApiResponse(200, { queue, currentlyWaiting: queue.length }, "Live queue fetched"));
});

export { createBooking, checkInBooking, cancelBooking, getQueue };
