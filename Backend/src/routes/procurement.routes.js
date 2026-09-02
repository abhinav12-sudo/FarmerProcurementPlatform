import { Router } from "express";
import { recordProcurement, getProcurement } from "../controllers/procurement.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, recordProcurement); // staff only — recorded at the counter
router.route("/:id").get(verifyJWT, getProcurement); // staff only

export default router;
