import { Router } from "express";
import requireAuth from "../../middleware/requireAuth";
import requireRole from "../../middleware/requireRole";
import {
  createIssue,
  deleteIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
} from "./issues.controller";

const router = Router();

router.post("/", requireAuth, createIssue);
router.get("/", getAllIssues);
router.get("/:id", getSingleIssue);
router.patch("/:id", requireAuth, updateIssue);
router.delete("/:id", requireAuth, requireRole(["maintainer"]), deleteIssue);

export default router;
