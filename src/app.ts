import express from "express";
import { StatusCodes } from "http-status-codes";
import sendResponse from "./utility/sendResponse";
import authRoutes from "./modules/auth/auth.route";
import issueRoutes from "./modules/issues/issues.route";
import adminRoutes from "./modules/admin/admin.route";
import globalErrorHandler from "./middleware/globalErrorHandler";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "API is running",
    data: { status: "ok" },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  sendResponse(res, {
    statusCode: StatusCodes.NOT_FOUND,
    success: false,
    message: "Route not found",
    errors: { path: req.originalUrl },
  });
});

app.use(globalErrorHandler);

export default app;
