import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utility/sendResponse";
import { loginUser, signupUser } from "./auth.service";
import type { AuthError } from "./auth.interface";

const isAuthError = (error: unknown): error is AuthError =>
  typeof error === "object" &&
  error !== null &&
  "statusCode" in error &&
  "message" in error &&
  "errors" in error;

export const signup = async (req: Request, res: Response) => {
  try {
    const user = await signupUser(req.body);
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "User registered successfully",
      data: user,
    });
  } catch (error) {
    if (isAuthError(error)) {
      sendResponse(res, {
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        errors: error.errors,
      });
      return;
    }

    sendResponse(res, {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Failed to create user",
      errors: "Unexpected error",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const authResponse = await loginUser(req.body);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Login successful",
      data: authResponse,
    });
  } catch (error) {
    if (isAuthError(error)) {
      sendResponse(res, {
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        errors: error.errors,
      });
      return;
    }

    sendResponse(res, {
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Failed to login",
      errors: "Unexpected error",
    });
  }
};
