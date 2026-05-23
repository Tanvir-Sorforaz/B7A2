import { Router } from "express";
import requireAuth from "../../middleware/requireAuth";
import requireRole from "../../middleware/requireRole";
import { getAdmin } from "./admin.controller";

const router = Router();

router.get("/", requireAuth, requireRole(["maintainer"]), getAdmin);

export default router;
