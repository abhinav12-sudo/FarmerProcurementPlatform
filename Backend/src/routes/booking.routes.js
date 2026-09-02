import { Router } from "express";
import {
    createBooking,
    checkInBooking,
    cancelBooking,
    getQueue,
} from "../controllers/booking.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(createBooking); // public — farmer books a slot
router.route("/:id/checkin").post(verifyJWT, checkInBooking); // staff only
router.route("/:id/cancel").post(cancelBooking); // farmer or staff can cancel
router.route("/queue/:center_id").get(getQueue); // public — live queue display

export default router;
