import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Staff } from "../models/staff.model.js";

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
};

const generateAccessAndRefreshTokens = async (staffId) => {
    const staff = await Staff.findById(staffId);
    const accessToken = staff.generateAccessToken();
    const refreshToken = staff.generateRefreshToken();

    staff.refreshToken = refreshToken;
    await staff.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
};

const registerStaff = asyncHandler(async (req, res) => {
    const { username, email, fullName, password, role, centerId } = req.body;

    if ([username, email, fullName, password].some((field) => !field?.trim())) {
        throw new ApiError(400, "username, email, fullName and password are required");
    }

    const existing = await Staff.findOne({ $or: [{ username }, { email }] });
    if (existing) {
        throw new ApiError(409, "Username or email already in use");
    }

    const staff = await Staff.create({ username, email, fullName, password, role, centerId });
    const createdStaff = await Staff.findById(staff._id); // password/refreshToken excluded via select:false on the schema

    return res.status(201).json(new ApiResponse(201, createdStaff, "Staff registered successfully"));
});

const loginStaff = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        throw new ApiError(400, "username and password are required");
    }

    const staff = await Staff.findOne({ username }).select("+password");
    if (!staff) {
        throw new ApiError(401, "Invalid credentials");
    }

    const isPasswordValid = await staff.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(staff._id);
    const loggedInStaff = await Staff.findById(staff._id);

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { staff: loggedInStaff, accessToken }, "Logged in successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    let decoded;
    try {
        decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(401, "Refresh token is invalid or expired");
    }

    const staff = await Staff.findById(decoded._id).select("+refreshToken");
    if (!staff || staff.refreshToken !== incomingRefreshToken) {
        // doesn't match what's stored — stale, reused after logout, or forged
        throw new ApiError(401, "Refresh token is invalid or has already been used");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(staff._id); // rotated

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { accessToken }, "Access token refreshed"));
});

const logoutStaff = asyncHandler(async (req, res) => {
    await Staff.findByIdAndUpdate(req.staff._id, { $unset: { refreshToken: 1 } });

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "Logged out successfully"));
});

const getCurrentStaff = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.staff, "Current staff fetched"));
});

export { registerStaff, loginStaff, refreshAccessToken, logoutStaff, getCurrentStaff };
