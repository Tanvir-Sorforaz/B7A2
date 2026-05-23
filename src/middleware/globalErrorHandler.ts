import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../utility/sendResponse";

type ErrorPayload = {
  statusCode?: number;
  message?: string;
  errors?: unknown;
};

const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const normalized =
    err && typeof err === "object" ? (err as ErrorPayload) : undefined;
  const statusCode =
    typeof normalized?.statusCode === "number"
      ? normalized.statusCode
      : StatusCodes.INTERNAL_SERVER_ERROR;
  const message = normalized?.message ?? "Internal server error";
  const errors =
    normalized?.errors ??
    (err instanceof Error ? err.message : "Unexpected error");

  sendResponse(res, {
    statusCode,
    success: false,
    message,
    errors,
  });
};

export default globalErrorHandler;
