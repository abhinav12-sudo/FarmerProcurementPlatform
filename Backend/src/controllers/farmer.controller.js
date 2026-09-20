import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Farmer } from "../models/farmer.model.js";
import { Booking } from "../models/booking.model.js";
import { notify } from "../utils/notify.js";

const OTP_EXPIRY_MINUTES = 5;

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
};

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

// Step 1 of login — generate, hash, store, and text a 6-digit OTP
const requestOtp = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        throw new ApiError(400, "phone is required");
    }

    const farmer = await Farmer.findOne({ phone });
    if (!farmer) {
        throw new ApiError(404, "No farmer registered with this phone number. Please register first.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    farmer.otp = await bcrypt.hash(otp, 10); // hashed the same way passwords are — never store OTPs in plaintext
    farmer.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await farmer.save({ validateBeforeSave: false });

    await notify(
        farmer._id,
        "otp",
        `Your login OTP is ${otp}. It is valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this with anyone.`
    );

    return res.status(200).json(new ApiResponse(200, { phone, previewOtp: otp }, "OTP sent successfully"));
});

// Step 2 of login — verify the code, issue tokens
const verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
        throw new ApiError(400, "phone and otp are required");
    }

    const farmer = await Farmer.findOne({ phone }).select("+otp +otpExpiry");
    if (!farmer || !farmer.otp) {
        throw new ApiError(400, "No OTP was requested for this number, or it has already been used");
    }

    if (farmer.otpExpiry < new Date()) {
        throw new ApiError(400, "OTP has expired, please request a new one");
    }

    const isValid = await bcrypt.compare(otp, farmer.otp);
    if (!isValid) {
        throw new ApiError(400, "Invalid OTP");
    }

    // one-time use — clear it immediately so it can't be replayed
    farmer.otp = undefined;
    farmer.otpExpiry = undefined;

    const accessToken = farmer.generateAccessToken();
    const refreshToken = farmer.generateRefreshToken();
    farmer.refreshToken = refreshToken;
    await farmer.save({ validateBeforeSave: false });

    return res
        .status(200)
        .cookie("farmerAccessToken", accessToken, cookieOptions)
        .cookie("farmerRefreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    farmer: {
                        _id: farmer._id,
                        name: farmer.name,
                        phone: farmer.phone,
                        village: farmer.village,
                        landRecordNumber: farmer.landRecordNumber,
                        bankAccount: farmer.bankAccount,
                    },
                    accessToken,
                },
                "Logged in successfully"
            )
        );
});


const refreshFarmerToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.farmerRefreshToken || req.body?.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    let decoded;
    try {
        decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(401, "Refresh token is invalid or expired");
    }

    const farmer = await Farmer.findById(decoded._id).select("+refreshToken");
    if (!farmer || farmer.refreshToken !== incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is invalid or has already been used");
    }

    const accessToken = farmer.generateAccessToken();
    const refreshToken = farmer.generateRefreshToken(); // rotated
    farmer.refreshToken = refreshToken;
    await farmer.save({ validateBeforeSave: false });

    return res
        .status(200)
        .cookie("farmerAccessToken", accessToken, cookieOptions)
        .cookie("farmerRefreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { accessToken }, "Access token refreshed"));
});

const logoutFarmer = asyncHandler(async (req, res) => {
    await Farmer.findByIdAndUpdate(req.farmer._id, { $unset: { refreshToken: 1 } });

    return res
        .status(200)
        .clearCookie("farmerAccessToken", cookieOptions)
        .clearCookie("farmerRefreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "Logged out successfully"));
});

const getFarmerHistory = asyncHandler(async (req, res) => {
    const history = await Booking.aggregate([
        { $match: { farmerId: new mongoose.Types.ObjectId(req.params.id) } },
        { $sort: { createdAt: -1 } },
        { $lookup: { from: "slots", localField: "slotId", foreignField: "_id", as: "slot" } },
        { $unwind: { path: "$slot", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "centers", localField: "centerId", foreignField: "_id", as: "center" } },
        { $unwind: { path: "$center", preserveNullAndEmptyArrays: true } },
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

export { registerFarmer, requestOtp, verifyOtp, refreshFarmerToken, logoutFarmer, getFarmerHistory };