import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../utility/sendResponse";
import type { IssueServiceError } from "./issues.interface";
import {
  createIssue as createIssueService,
  deleteIssue as deleteIssueService,
  getAllIssues as getAllIssuesService,
  getSingleIssue as getSingleIssueService,
  updateIssue as updateIssueService,
} from "./issues.service";

const isIssueError = (error: unknown): error is IssueServiceError =>
  typeof error === "object" &&
  error !== null &&
  "statusCode" in error &&
  "message" in error &&
  "errors" in error;

export const createIssue = async (req: Request, res: Response) => {
  try {
    const issue = await createIssueService(req.body ?? {}, req.user);
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Issue created successfully",
      data: {
        id: issue.id,
        title: issue.title,
        description: issue.description,
        type: issue.type,
        status: issue.status,
        reporter_id: issue.reporter_id,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      },
    });
  } catch (error) {
    if (isIssueError(error)) {
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
      message: "Failed to create issue",
      errors: "Unexpected error",
    });
  }
};

export const getAllIssues = async (req: Request, res: Response) => {
  try {
    const issues = await getAllIssuesService(req.query as Record<string, string>);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Issues retrieved successfully",
      data: issues,
    });
  } catch (error) {
    if (isIssueError(error)) {
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
      message: "Failed to fetch issues",
      errors: "Unexpected error",
    });
  }
};

export const getSingleIssue = async (req: Request, res: Response) => {
  try {
    const issue = await getSingleIssueService(Number(req.params.id));
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Issue retrieved successfully",
      data: issue,
    });
  } catch (error) {
    if (isIssueError(error)) {
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
      message: "Failed to fetch issue",
      errors: "Unexpected error",
    });
  }
};

export const updateIssue = async (req: Request, res: Response) => {
  try {
    const updatedIssue = await updateIssueService(
      Number(req.params.id),
      req.body ?? {},
      req.user
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Issue updated successfully",
      data: {
        id: updatedIssue.id,
        title: updatedIssue.title,
        description: updatedIssue.description,
        type: updatedIssue.type,
        status: updatedIssue.status,
        reporter_id: updatedIssue.reporter_id,
        created_at: updatedIssue.created_at,
        updated_at: updatedIssue.updated_at,
      },
    });
  } catch (error) {
    if (isIssueError(error)) {
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
      message: "Failed to update issue",
      errors: "Unexpected error",
    });
  }
};

export const deleteIssue = async (req: Request, res: Response) => {
  try {
    await deleteIssueService(Number(req.params.id));
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (error) {
    if (isIssueError(error)) {
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
      message: "Failed to delete issue",
      errors: "Unexpected error",
    });
  }
};
