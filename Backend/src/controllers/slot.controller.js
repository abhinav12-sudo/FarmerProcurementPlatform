import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Slot } from "../models/slot.model.js";
import { Booking } from "../models/booking.model.js";

// GET /?center_id=&crop_type=&date=YYYY-MM-DD — only returns slots with room left
const getSlots = asyncHandler(async (req, res) => {
    const { center_id, crop_type, date } = req.query;

    const filter = { $expr: { $lt: ["$bookedCount", "$capacity"] } };
    if (center_id) filter.centerId = center_id;
    if (crop_type) filter.cropType = { $regex: new RegExp(`^${crop_type}$`, 'i') };
    if (date) {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);
        filter.startTime = { $gte: start, $lt: end };
    }

    const slots = await Slot.find(filter).sort({ startTime: 1 });

    // Check if the requested date is today and if today's capacity has already exceeded 5:00 PM
    const now = new Date();
    const isToday = date ? new Date(date).toDateString() === now.toDateString() : false;
    let isTodayCapacityFull = false;

    if (isToday && center_id) {
        if (now.getHours() >= 17) {
            isTodayCapacityFull = true;
        } else {
            const activeCount = await Booking.countDocuments({
                centerId: center_id,
                status: { $in: ["booked", "checked_in"] },
            });

            const avgMinutes = 12;
            const nineAm = new Date(now);
            nineAm.setHours(9, 0, 0, 0);
            const baseTime = now > nineAm ? now : nineAm;

            let projectedMs = baseTime.getTime() + activeCount * avgMinutes * 60 * 1000;
            const onePm = new Date(now);
            onePm.setHours(13, 0, 0, 0);
            const twoPm = new Date(now);
            twoPm.setHours(14, 0, 0, 0);

            if (baseTime < onePm && projectedMs >= onePm.getTime()) {
                projectedMs += 60 * 60 * 1000;
            } else if (baseTime >= onePm && baseTime < twoPm) {
                projectedMs = twoPm.getTime() + activeCount * avgMinutes * 60 * 1000;
            }

            const fivePm = new Date(now);
            fivePm.setHours(17, 0, 0, 0);

            if (projectedMs > fivePm.getTime()) {
                isTodayCapacityFull = true;
            }
        }
    }

    const withSeatsLeft = slots.map((s) => ({
        ...s.toObject(),
        seatsLeft: Math.max(0, s.capacity - s.bookedCount),
        isTodayCapacityFull,
    }));

    return res.status(200).json(new ApiResponse(200, withSeatsLeft, "Slots fetched"));
});

// Staff / Admin — view all slots for a center with full capacity breakdown
const getCenterSlots = asyncHandler(async (req, res) => {
    const { center_id } = req.params;
    const { date } = req.query;

    const filter = { centerId: center_id };
    if (date) {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);
        filter.startTime = { $gte: start, $lt: end };
    }

    const slots = await Slot.find(filter).sort({ startTime: 1 });
    const withSeatsLeft = slots.map((s) => ({
        ...s.toObject(),
        seatsLeft: Math.max(0, s.capacity - s.bookedCount),
    }));

    return res.status(200).json(new ApiResponse(200, withSeatsLeft, "Center slots fetched"));
});

// Staff & Admin — creating slots
const createSlot = asyncHandler(async (req, res) => {
    const { center_id, crop_type, start_time, capacity } = req.body;
    if (!center_id || !crop_type || !start_time || !capacity) {
        throw new ApiError(400, "center_id, crop_type, start_time, capacity are required");
    }

    const slot = await Slot.create({
        centerId: center_id,
        cropType: crop_type,
        startTime: start_time,
        capacity,
    });

    return res.status(201).json(new ApiResponse(201, slot, "Slot created"));
});

export { getSlots, getCenterSlots, createSlot };

