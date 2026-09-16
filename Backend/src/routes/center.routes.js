import { Router } from "express";
import { createCenter, getCenters, getCenterById, updateCenter } from "../controllers/center.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(getCenters); // public
router.route("/:id").get(getCenterById); // public

router.route("/").post(verifyJWT, authorizeRoles("admin"), createCenter); // admin only
router.route("/:id").patch(verifyJWT, authorizeRoles("admin"), updateCenter); // admin only

export default router;