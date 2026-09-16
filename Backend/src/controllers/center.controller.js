import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Center } from "../models/center.model.js";

// Admin only — creating a procurement center is an administrative action
const createCenter = asyncHandler(async (req, res) => {
    const { name, district, daily_capacity } = req.body;
    if (!name || !district) {
        throw new ApiError(400, "name and district are required");
    }

    const center = await Center.create({
        name,
        district,
        dailyCapacity: daily_capacity || 0,
    });

    return res.status(201).json(new ApiResponse(201, center, "Center created"));
});

// Public — farmers/frontend need this to populate a "choose your center" list
const getCenters = asyncHandler(async (req, res) => {
    const { district } = req.query;
    const filter = {};
    if (district) filter.district = district;

    const centers = await Center.find(filter).sort({ name: 1 });
    return res.status(200).json(new ApiResponse(200, centers, "Centers fetched"));
});

const getCenterById = asyncHandler(async (req, res) => {
    const center = await Center.findById(req.params.id);
    if (!center) {
        throw new ApiError(404, "Center not found");
    }
    return res.status(200).json(new ApiResponse(200, center, "Center fetched"));
});

// Admin only
const updateCenter = asyncHandler(async (req, res) => {
    const { name, district, daily_capacity } = req.body;

    const update = {};
    if (name) update.name = name;
    if (district) update.district = district;
    if (daily_capacity != null) update.dailyCapacity = daily_capacity;

    const center = await Center.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!center) {
        throw new ApiError(404, "Center not found");
    }

    return res.status(200).json(new ApiResponse(200, center, "Center updated"));
});

export { createCenter, getCenters, getCenterById, updateCenter };