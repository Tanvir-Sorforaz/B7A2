import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../utility/sendResponse";
import type { UserRole } from "../types/user";

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

export default requireRole;
