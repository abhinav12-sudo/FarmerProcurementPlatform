import { Router } from "express";
import { recordProcurement, getProcurement, getCenterProcurements } from "../controllers/procurement.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, recordProcurement); // staff only — recorded at the counter
router.route("/center/:center_id").get(verifyJWT, getCenterProcurements); // staff & admin — center procurements ledger
router.route("/:id").get(verifyJWT, getProcurement); // staff only

export default router;

