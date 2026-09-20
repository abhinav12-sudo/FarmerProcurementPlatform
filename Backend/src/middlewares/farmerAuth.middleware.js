import jwt from "jsonwebtoken";
import { Farmer } from "../models/farmer.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asynchandler.js";

export const verifyFarmerJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.farmerAccessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const farmer = await Farmer.findById(decodedToken?._id).select("-otp -otpExpiry -refreshToken");
        if (!farmer) {
            throw new ApiError(401, "Invalid access token");
        }

        req.farmer = farmer;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});