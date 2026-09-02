import { Router } from "express";
import {
    registerStaff,
    loginStaff,
    refreshAccessToken,
    logoutStaff,
    getCurrentStaff,
} from "../controllers/staff.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// public
router.route("/register").post(registerStaff);
router.route("/login").post(loginStaff);
router.route("/refresh-token").post(refreshAccessToken);

// secured
router.route("/logout").post(verifyJWT, logoutStaff);
router.route("/me").get(verifyJWT, getCurrentStaff);

export default router;