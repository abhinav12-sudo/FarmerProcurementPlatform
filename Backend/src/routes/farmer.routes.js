import { Router } from "express";
import { registerFarmer, getFarmerHistory } from "../controllers/farmer.controller.js";

const router = Router();

router.route("/register").post(registerFarmer);
router.route("/:id/history").get(getFarmerHistory);

export default router;
