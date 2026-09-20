import { Router } from "express";
import { getSlots, getCenterSlots, createSlot } from "../controllers/slot.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(getSlots); // public — farmers browse available slots
router.route("/center/:center_id").get(getCenterSlots); // center slot inventory
router.route("/").post(verifyJWT, authorizeRoles("admin", "staff"), createSlot); // staff & admin

export default router;

