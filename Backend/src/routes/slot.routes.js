import { Router } from "express";
import { getSlots, createSlot } from "../controllers/slot.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(getSlots); // public — farmers browse available slots
router.route("/").post(verifyJWT, authorizeRoles("admin"), createSlot); // admin only

export default router;
