import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utility/sendResponse";
import { getAdmin as getAdminService } from "./admin.service";

export const getAdmin = async (_req: Request, res: Response) => {
  const admin = await getAdminService();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admin retrieved successfully",
    data: admin,
  });
};
