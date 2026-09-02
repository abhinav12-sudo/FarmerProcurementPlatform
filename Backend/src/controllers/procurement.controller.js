import mongoose from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Booking } from "../models/booking.model.js";
import { Procurement } from "../models/procurement.model.js";
import { Payment } from "../models/payment.model.js";
import { notify } from "../utils/notify.js";

/**
 * Touches three documents (booking, procurement, payment) that must all
 * succeed together — genuinely multi-document, so it uses a Mongoose
 * session transaction. Requires MongoDB running as a replica set (Atlas
 * gives you this by default; a bare local mongod needs one line to enable it).
 *
 * body: { booking_id, items: [{ crop_type, quantity_kg, grade, rate_per_kg }, ...] }
 */
const recordProcurement = asyncHandler(async (req, res) => {
    const { booking_id, items } = req.body;
    if (!booking_id || !Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, "booking_id and a non-empty items array are required");
    }
    for (const item of items) {
        if (!item.crop_type || !item.quantity_kg || !item.grade || item.rate_per_kg == null) {
            throw new ApiError(400, "each item needs crop_type, quantity_kg, grade, rate_per_kg");
        }
    }

    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const booking = await Booking.findOneAndUpdate(
                { _id: booking_id, status: "checked_in" },
                { status: "completed" },
                { new: true, session }
            );
            if (!booking) {
                throw new ApiError(409, "Booking not found or not checked in yet");
            }

            const mappedItems = items.map((i) => ({
                cropType: i.crop_type,
                quantityKg: i.quantity_kg,
                grade: i.grade,
                ratePerKg: i.rate_per_kg,
            }));
            const totalAmount = mappedItems.reduce((sum, i) => sum + i.quantityKg * i.ratePerKg, 0);

            const [procurement] = await Procurement.create([{ bookingId: booking_id, items: mappedItems }], { session });
            const [payment] = await Payment.create(
                [{ procurementId: procurement._id, amount: totalAmount.toFixed(2), status: "pending" }],
                { session }
            );

            result = { booking, procurement, payment, totalAmount };
        });
    } finally {
        session.endSession();
    }

    await notify(
        result.booking.farmerId,
        "procurement_completed",
        `Procurement recorded. Total amount due: Rs ${result.totalAmount.toFixed(2)}. Payment is now pending.`
    );

    return res.status(201).json(new ApiResponse(201, result, "Procurement recorded"));
});

const getProcurement = asyncHandler(async (req, res) => {
    const procurement = await Procurement.findById(req.params.id);
    if (!procurement) {
        throw new ApiError(404, "Procurement not found");
    }
    return res.status(200).json(new ApiResponse(200, procurement, "Procurement fetched"));
});

export { recordProcurement, getProcurement };
