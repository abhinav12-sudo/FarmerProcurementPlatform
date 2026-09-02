import { Router } from "express";
import { updatePaymentStatus } from "../controllers/payment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/:id/status").patch(verifyJWT, updatePaymentStatus); // staff/webhook only

export default router;
