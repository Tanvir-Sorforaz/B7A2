import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import config from "../config/index";
import sendResponse from "../utility/sendResponse";
import type { JwtUserPayload } from "../types/jwt";

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

export default requireAuth;
