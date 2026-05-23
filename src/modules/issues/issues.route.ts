import { Router } from "express";

import requireRole from "../../middleware/requireRole";
import {
  createIssue,
  deleteIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
} from "./issues.controller";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import config from "../config/index";
import sendResponse from "../utility/sendResponse";
import type { JwtUserPayload } from "../types/jwt";
import { StatusCodes } from "http-status-codes";



const router = Router();


const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header) {
    sendResponse(res, {
      statusCode: StatusCodes.UNAUTHORIZED,
      success: false,
      message: "Authorization token missing",
      errors: "Authorization header is required",
    });
    return;
  }

  try {
    const decoded = jwt.verify(header, config.secret as string) as JwtUserPayload;
    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
    };
    next();
  } catch (error) {
    sendResponse(res, {
      statusCode: StatusCodes.UNAUTHORIZED,
      success: false,
      message: "Invalid or expired token",
      errors: error instanceof Error ? error.message : "Token verification failed",
    });
  }
};

const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      sendResponse(res, {
        statusCode: StatusCodes.UNAUTHORIZED,
        success: false,
        message: "Authentication required",
        errors: "User context missing",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendResponse(res, {
        statusCode: StatusCodes.FORBIDDEN,
        success: false,
        message: "Insufficient permissions",
        errors: { required: roles, current: req.user.role },
      });
      return;
    }

    next();
  };
};



router.post("/", requireAuth, createIssue);
router.get("/", getAllIssues);
router.get("/:id", getSingleIssue);
router.patch("/:id", requireAuth, updateIssue);
router.delete("/:id", requireAuth, requireRole(["maintainer"]), deleteIssue);

export default router;
