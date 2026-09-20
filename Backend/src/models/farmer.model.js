import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";

const farmerSchema = new Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    village: String,
    landRecordNumber: String,
    bankAccount: String,

    // OTP login fields — never returned by default, must .select("+otp") to read
    otp: {
        type: String,
        select: false,
    },
    otpExpiry: {
        type: Date,
        select: false,
    },
    refreshToken: {
        type: String,
        select: false,
    },
}, { timestamps: { createdAt: true, updatedAt: false } });

farmerSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        { _id: this._id, phone: this.phone, role: "farmer" },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

farmerSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

export const Farmer = mongoose.model("Farmer", farmerSchema);