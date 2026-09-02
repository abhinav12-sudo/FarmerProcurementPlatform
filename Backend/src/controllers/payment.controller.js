import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Payment } from "../models/payment.model.js";
import { Procurement } from "../models/procurement.model.js";
import { Booking } from "../models/booking.model.js";
import { notify } from "../utils/notify.js";

// In production this gets called by a bank/DBT webhook rather than a manual staff action
const updatePaymentStatus = asyncHandler(async (req, res) => {
    const { status } = req.body; // 'processing' | 'paid' | 'failed'
    if (!["processing", "paid", "failed"].includes(status)) {
        throw new ApiError(400, "status must be processing, paid, or failed");
    }

    const update = { status };
    if (status === "paid") update.paidAt = new Date();

    const payment = await Payment.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!payment) {
        throw new ApiError(404, "Payment not found");
    }

    if (status === "paid") {
        const procurement = await Procurement.findById(payment.procurementId);
        const booking = await Booking.findById(procurement.bookingId);
        await notify(
            booking.farmerId,
            "payment_completed",
            `Payment of Rs ${payment.amount} has been credited to your account.`
        );
    }

    return res.status(200).json(new ApiResponse(200, payment, "Payment status updated"));
});

export { updatePaymentStatus };
