import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Farmer } from "../models/farmer.model.js";
import { Booking } from "../models/booking.model.js";

const registerFarmer = asyncHandler(async (req, res) => {
    const { name, phone, village, land_record_number, bank_account } = req.body;
    if (!name || !phone) {
        throw new ApiError(400, "name and phone are required");
    }

    const existing = await Farmer.findOne({ phone });
    if (existing) {
        throw new ApiError(409, "Farmer already registered with this phone number");
    }

    const farmer = await Farmer.create({
        name,
        phone,
        village,
        landRecordNumber: land_record_number,
        bankAccount: bank_account,
    });

    return res.status(201).json(new ApiResponse(201, farmer, "Farmer registered successfully"));
});

// Bookings + procurement + payment history for one farmer, newest first
const getFarmerHistory = asyncHandler(async (req, res) => {
    const history = await Booking.aggregate([
        { $match: { farmerId: new mongoose.Types.ObjectId(req.params.id) } },
        { $sort: { createdAt: -1 } },
        { $lookup: { from: "slots", localField: "slotId", foreignField: "_id", as: "slot" } },
        { $unwind: "$slot" },
        { $lookup: { from: "centers", localField: "centerId", foreignField: "_id", as: "center" } },
        { $unwind: "$center" },
        { $lookup: { from: "procurements", localField: "_id", foreignField: "bookingId", as: "procurement" } },
        { $unwind: { path: "$procurement", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "payments", localField: "procurement._id", foreignField: "procurementId", as: "payment" } },
        { $unwind: { path: "$payment", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                tokenNumber: 1,
                status: 1,
                cropType: "$slot.cropType",
                startTime: "$slot.startTime",
                centerName: "$center.name",
                amount: "$payment.amount",
                paymentStatus: "$payment.status",
            },
        },
    ]);

    return res.status(200).json(new ApiResponse(200, history, "Farmer history fetched"));
});

export { registerFarmer, getFarmerHistory };
