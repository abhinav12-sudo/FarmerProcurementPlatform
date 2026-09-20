import { Router } from "express";
import {
    registerFarmer,
    requestOtp,
    verifyOtp,
    refreshFarmerToken,
    logoutFarmer,
    getFarmerHistory,
} from "../controllers/farmer.controller.js";
import { verifyFarmerJWT } from "../middlewares/farmerAuth.middleware.js";

const router = Router();

router.route("/register").post(registerFarmer);
router.route("/request-otp").post(requestOtp);
router.route("/verify-otp").post(verifyOtp);
router.route("/refresh-token").post(refreshFarmerToken);
router.route("/logout").post(verifyFarmerJWT, logoutFarmer);
router.route("/:id/history").get(getFarmerHistory);

export default router;