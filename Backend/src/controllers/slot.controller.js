import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Slot } from "../models/slot.model.js";

// GET /?center_id=&crop_type=&date=YYYY-MM-DD — only returns slots with room left
const getSlots = asyncHandler(async (req, res) => {
    const { center_id, crop_type, date } = req.query;

    const filter = { $expr: { $lt: ["$bookedCount", "$capacity"] } };
    if (center_id) filter.centerId = center_id;
    if (crop_type) filter.cropType = crop_type;
    if (date) {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);
        filter.startTime = { $gte: start, $lt: end };
    }

    const slots = await Slot.find(filter).sort({ startTime: 1 });
    const withSeatsLeft = slots.map((s) => ({
        ...s.toObject(),
        seatsLeft: s.capacity - s.bookedCount,
    }));

    return res.status(200).json(new ApiResponse(200, withSeatsLeft, "Slots fetched"));
});

// Admin only — creating slots is an administrative action, protected in the routes file
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

export { getSlots, createSlot };
