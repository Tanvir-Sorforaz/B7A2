
import { createRequire } from 'module';
const require = createRequire(import.meta.url);


// src/config/index.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env")
});
var config = {
  connection_string: process.env.CONNECTIONSTRING,
  port: process.env.PORT,
  secret: process.env.JWT_SECRET,
  refresh_secret: process.env.JWT_REFRESH_SECRET
};
var config_default = config;

// src/db/index.ts
import { Pool } from "pg";
var pool = new Pool({
  connectionString: config_default.connection_string
});
pool.on("error", (err) => {
  console.error("Unexpected PG client error", err);
});
var initDb = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'contributor'
        CHECK (role IN ('contributor', 'maintainer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS issues (
        id SERIAL PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        type VARCHAR(30) NOT NULL
            CHECK (type IN ('bug', 'feature_request')),
        status VARCHAR(20) NOT NULL DEFAULT 'open'
            CHECK (status IN ('open', 'in_progress', 'resolved')),
        reporter_id INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`
  );
};
var db_default = pool;

// src/app.ts
import express from "express";
import { StatusCodes as StatusCodes9 } from "http-status-codes";

// src/utility/sendResponse.ts
var sendResponse = (res, data) => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message,
    data: data.data,
    errors: data.errors
  });
};
var sendResponse_default = sendResponse;

// src/modules/auth/auth.route.ts
import { Router } from "express";

// src/modules/auth/auth.controller.ts
import { StatusCodes as StatusCodes2 } from "http-status-codes";

// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
var allowedRoles = ["contributor", "maintainer"];
var buildUserProfile = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  created_at: row.created_at,
  updated_at: row.updated_at
});
var createAuthError = (statusCode, message, errors) => ({
  statusCode,
  message,
  errors
});
var signupUser = async (input) => {
  const { name, email, password, role } = input;
  if (!name || !email || !password) {
    throw createAuthError(
      StatusCodes.BAD_REQUEST,
      "Missing required fields",
      "name, email, and password are required"
    );
  }
  const normalizedRole = role ?? "contributor";
  if (!allowedRoles.includes(normalizedRole)) {
    throw createAuthError(StatusCodes.BAD_REQUEST, "Invalid role", { allowed: allowedRoles });
  }
  const existing = await db_default.query("select id from users where email = $1", [email]);
  if (existing.rowCount) {
    throw createAuthError(
      StatusCodes.CONFLICT,
      "Email already registered",
      "Duplicate email"
    );
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await db_default.query(
    "insert into users (name, email, password, role) values ($1, $2, $3, $4) returning id, name, email, role, created_at, updated_at",
    [name, email, hashedPassword, normalizedRole]
  );
  return buildUserProfile(result.rows[0]);
};
var loginUser = async (input) => {
  const { email, password } = input;
  if (!email || !password) {
    throw createAuthError(
      StatusCodes.BAD_REQUEST,
      "Missing credentials",
      "email and password are required"
    );
  }
  const result = await db_default.query(
    "select id, name, email, role, password, created_at, updated_at from users where email = $1",
    [email]
  );
  if (!result.rowCount) {
    throw createAuthError(
      StatusCodes.UNAUTHORIZED,
      "Invalid credentials",
      "Email or password is incorrect"
    );
  }
  const userRow = result.rows[0];
  const matches = await bcrypt.compare(password, userRow.password);
  if (!matches) {
    throw createAuthError(
      StatusCodes.UNAUTHORIZED,
      "Invalid credentials",
      "Email or password is incorrect"
    );
  }
  const token = jwt.sign(
    {
      id: userRow.id,
      name: userRow.name,
      role: userRow.role
    },
    config_default.secret,
    { expiresIn: "1d" }
  );
  return {
    token,
    user: buildUserProfile(userRow)
  };
};

// src/modules/auth/auth.controller.ts
var isAuthError = (error) => typeof error === "object" && error !== null && "statusCode" in error && "message" in error && "errors" in error;
var signup = async (req, res) => {
  try {
    const user = await signupUser(req.body);
    sendResponse_default(res, {
      statusCode: StatusCodes2.CREATED,
      success: true,
      message: "User registered successfully",
      data: user
    });
  } catch (error) {
    if (isAuthError(error)) {
      sendResponse_default(res, {
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        errors: error.errors
      });
      return;
    }
    sendResponse_default(res, {
      statusCode: StatusCodes2.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Failed to create user",
      errors: "Unexpected error"
    });
  }
};
var login = async (req, res) => {
  try {
    const authResponse = await loginUser(req.body);
    sendResponse_default(res, {
      statusCode: StatusCodes2.OK,
      success: true,
      message: "Login successful",
      data: authResponse
    });
  } catch (error) {
    if (isAuthError(error)) {
      sendResponse_default(res, {
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        errors: error.errors
      });
      return;
    }
    sendResponse_default(res, {
      statusCode: StatusCodes2.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Failed to login",
      errors: "Unexpected error"
    });
  }
};

// src/modules/auth/auth.route.ts
var router = Router();
router.post("/signup", signup);
router.post("/login", login);
var auth_route_default = router;

// src/modules/issues/issues.route.ts
import { Router as Router2 } from "express";

// src/middleware/requireAuth.ts
import jwt2 from "jsonwebtoken";
import { StatusCodes as StatusCodes3 } from "http-status-codes";
var requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    sendResponse_default(res, {
      statusCode: StatusCodes3.UNAUTHORIZED,
      success: false,
      message: "Authorization token missing",
      errors: "Authorization header is required"
    });
    return;
  }
  try {
    const decoded = jwt2.verify(header, config_default.secret);
    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role
    };
    next();
  } catch (error) {
    sendResponse_default(res, {
      statusCode: StatusCodes3.UNAUTHORIZED,
      success: false,
      message: "Invalid or expired token",
      errors: error instanceof Error ? error.message : "Token verification failed"
    });
  }
};
var requireAuth_default = requireAuth;

// src/middleware/requireRole.ts
import { StatusCodes as StatusCodes4 } from "http-status-codes";
var requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      sendResponse_default(res, {
        statusCode: StatusCodes4.UNAUTHORIZED,
        success: false,
        message: "Authentication required",
        errors: "User context missing"
      });
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendResponse_default(res, {
        statusCode: StatusCodes4.FORBIDDEN,
        success: false,
        message: "Insufficient permissions",
        errors: { required: roles, current: req.user.role }
      });
      return;
    }
    next();
  };
};
var requireRole_default = requireRole;

// src/modules/issues/issues.controller.ts
import { StatusCodes as StatusCodes6 } from "http-status-codes";

// src/modules/issues/issues.service.ts
import { StatusCodes as StatusCodes5 } from "http-status-codes";
var allowedTypes = ["bug", "feature_request"];
var allowedStatuses = ["open", "in_progress", "resolved"];
var allowedSorts = ["newest", "oldest"];
var createIssueError = (statusCode, message, errors) => ({
  statusCode,
  message,
  errors
});
var mapReporter = (reporter) => reporter ? {
  id: reporter.id,
  name: reporter.name,
  role: reporter.role
} : null;
var buildIssueResponse = (issue, reporter) => ({
  id: issue.id,
  title: issue.title,
  description: issue.description,
  type: issue.type,
  status: issue.status,
  reporter: mapReporter(reporter),
  created_at: issue.created_at,
  updated_at: issue.updated_at
});
var fetchReporters = async (reporterIds) => {
  if (!reporterIds.length) {
    return /* @__PURE__ */ new Map();
  }
  const result = await db_default.query(
    "select id, name, role from users where id = any($1)",
    [reporterIds]
  );
  const map = /* @__PURE__ */ new Map();
  for (const row of result.rows) {
    map.set(row.id, row);
  }
  return map;
};
var createIssue = async (input, user) => {
  const { title, description, type } = input;
  if (!user) {
    throw createIssueError(
      StatusCodes5.UNAUTHORIZED,
      "Authentication required",
      "User context missing"
    );
  }
  if (!title || !description || !type) {
    throw createIssueError(
      StatusCodes5.BAD_REQUEST,
      "Missing required fields",
      "title, description, and type are required"
    );
  }
  if (title.length > 150) {
    throw createIssueError(
      StatusCodes5.BAD_REQUEST,
      "Title too long",
      "title must be 150 characters or fewer"
    );
  }
  if (description.length < 20) {
    throw createIssueError(
      StatusCodes5.BAD_REQUEST,
      "Description too short",
      "description must be at least 20 characters"
    );
  }
  if (!allowedTypes.includes(type)) {
    throw createIssueError(StatusCodes5.BAD_REQUEST, "Invalid issue type", {
      allowed: allowedTypes
    });
  }
  const result = await db_default.query(
    "insert into issues (title, description, type, status, reporter_id) values ($1, $2, $3, $4, $5) returning id, title, description, type, status, reporter_id, created_at, updated_at",
    [title, description, type, "open", user.id]
  );
  return result.rows[0];
};
var getAllIssues = async (filters) => {
  const { sort = "newest", type, status } = filters;
  if (sort && !allowedSorts.includes(sort)) {
    throw createIssueError(StatusCodes5.BAD_REQUEST, "Invalid sort option", {
      allowed: allowedSorts
    });
  }
  if (type && !allowedTypes.includes(type)) {
    throw createIssueError(StatusCodes5.BAD_REQUEST, "Invalid type filter", {
      allowed: allowedTypes
    });
  }
  if (status && !allowedStatuses.includes(status)) {
    throw createIssueError(StatusCodes5.BAD_REQUEST, "Invalid status filter", {
      allowed: allowedStatuses
    });
  }
  const values = [];
  const filtersSql = [];
  if (type) {
    values.push(type);
    filtersSql.push(`type = $${values.length}`);
  }
  if (status) {
    values.push(status);
    filtersSql.push(`status = $${values.length}`);
  }
  const order = sort === "oldest" ? "asc" : "desc";
  let sql = "select id, title, description, type, status, reporter_id, created_at, updated_at from issues";
  if (filtersSql.length) {
    sql += ` where ${filtersSql.join(" and ")}`;
  }
  sql += ` order by created_at ${order}`;
  const result = await db_default.query(sql, values);
  const issues = result.rows;
  const reporterIds = Array.from(new Set(issues.map((issue) => issue.reporter_id)));
  const reporterMap = await fetchReporters(reporterIds);
  return issues.map((issue) => {
    const reporter = reporterMap.get(issue.reporter_id) ?? null;
    return buildIssueResponse(issue, reporter);
  });
};
var getSingleIssue = async (id) => {
  if (Number.isNaN(id)) {
    throw createIssueError(
      StatusCodes5.BAD_REQUEST,
      "Invalid issue id",
      "id must be a number"
    );
  }
  const issueResult = await db_default.query(
    "select id, title, description, type, status, reporter_id, created_at, updated_at from issues where id = $1",
    [id]
  );
  if (!issueResult.rowCount) {
    throw createIssueError(
      StatusCodes5.NOT_FOUND,
      "Issue not found",
      `No issue found with id ${id}`
    );
  }
  const issue = issueResult.rows[0];
  const reporterResult = await db_default.query(
    "select id, name, role from users where id = $1",
    [issue.reporter_id]
  );
  const reporter = reporterResult.rows[0] ?? null;
  return buildIssueResponse(issue, reporter);
};
var updateIssue = async (id, input, user) => {
  if (Number.isNaN(id)) {
    throw createIssueError(
      StatusCodes5.BAD_REQUEST,
      "Invalid issue id",
      "id must be a number"
    );
  }
  if (!user) {
    throw createIssueError(
      StatusCodes5.UNAUTHORIZED,
      "Authentication required",
      "User context missing"
    );
  }
  const issueResult = await db_default.query(
    "select id, reporter_id, status from issues where id = $1",
    [id]
  );
  if (!issueResult.rowCount) {
    throw createIssueError(
      StatusCodes5.NOT_FOUND,
      "Issue not found",
      `No issue found with id ${id}`
    );
  }
  const issue = issueResult.rows[0];
  if (user.role === "contributor") {
    if (issue.reporter_id !== user.id) {
      throw createIssueError(
        StatusCodes5.FORBIDDEN,
        "Cannot edit another user's issue",
        "Only maintainers can edit any issue"
      );
    }
    if (issue.status !== "open") {
      throw createIssueError(
        StatusCodes5.CONFLICT,
        "Issue cannot be updated",
        "Only open issues can be edited by contributors"
      );
    }
  }
  const { title, description, type, status } = input;
  const updates = [];
  const values = [];
  if (title !== void 0) {
    if (!title) {
      throw createIssueError(
        StatusCodes5.BAD_REQUEST,
        "Title cannot be empty",
        "title must be provided"
      );
    }
    if (title.length > 150) {
      throw createIssueError(
        StatusCodes5.BAD_REQUEST,
        "Title too long",
        "title must be 150 characters or fewer"
      );
    }
    values.push(title);
    updates.push(`title = $${values.length}`);
  }
  if (description !== void 0) {
    if (!description) {
      throw createIssueError(
        StatusCodes5.BAD_REQUEST,
        "Description cannot be empty",
        "description must be provided"
      );
    }
    if (description.length < 20) {
      throw createIssueError(
        StatusCodes5.BAD_REQUEST,
        "Description too short",
        "description must be at least 20 characters"
      );
    }
    values.push(description);
    updates.push(`description = $${values.length}`);
  }
  if (type !== void 0) {
    if (!allowedTypes.includes(type)) {
      throw createIssueError(StatusCodes5.BAD_REQUEST, "Invalid issue type", {
        allowed: allowedTypes
      });
    }
    values.push(type);
    updates.push(`type = $${values.length}`);
  }
  if (status !== void 0) {
    if (user.role !== "maintainer") {
      throw createIssueError(
        StatusCodes5.FORBIDDEN,
        "Cannot update status",
        "Only maintainers can change status"
      );
    }
    if (!allowedStatuses.includes(status)) {
      throw createIssueError(StatusCodes5.BAD_REQUEST, "Invalid issue status", {
        allowed: allowedStatuses
      });
    }
    values.push(status);
    updates.push(`status = $${values.length}`);
  }
  if (!updates.length) {
    throw createIssueError(
      StatusCodes5.BAD_REQUEST,
      "No valid updates provided",
      "Provide at least one updatable field"
    );
  }
  values.push(id);
  const updateSql = `update issues set ${updates.join(", ")}, updated_at = now() where id = $${values.length} returning id, title, description, type, status, reporter_id, created_at, updated_at`;
  const updateResult = await db_default.query(updateSql, values);
  return updateResult.rows[0];
};
var deleteIssue = async (id) => {
  if (Number.isNaN(id)) {
    throw createIssueError(
      StatusCodes5.BAD_REQUEST,
      "Invalid issue id",
      "id must be a number"
    );
  }
  const result = await db_default.query("delete from issues where id = $1", [id]);
  if (!result.rowCount) {
    throw createIssueError(
      StatusCodes5.NOT_FOUND,
      "Issue not found",
      `No issue found with id ${id}`
    );
  }
};

// src/modules/issues/issues.controller.ts
var isIssueError = (error) => typeof error === "object" && error !== null && "statusCode" in error && "message" in error && "errors" in error;
var createIssue2 = async (req, res) => {
  try {
    const issue = await createIssue(req.body ?? {}, req.user);
    sendResponse_default(res, {
      statusCode: StatusCodes6.CREATED,
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
        updated_at: issue.updated_at
      }
    });
  } catch (error) {
    if (isIssueError(error)) {
      sendResponse_default(res, {
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        errors: error.errors
      });
      return;
    }
    sendResponse_default(res, {
      statusCode: StatusCodes6.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Failed to create issue",
      errors: "Unexpected error"
    });
  }
};
var getAllIssues2 = async (req, res) => {
  try {
    const issues = await getAllIssues(req.query);
    sendResponse_default(res, {
      statusCode: StatusCodes6.OK,
      success: true,
      message: "Issues retrieved successfully",
      data: issues
    });
  } catch (error) {
    if (isIssueError(error)) {
      sendResponse_default(res, {
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        errors: error.errors
      });
      return;
    }
    sendResponse_default(res, {
      statusCode: StatusCodes6.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Failed to fetch issues",
      errors: "Unexpected error"
    });
  }
};
var getSingleIssue2 = async (req, res) => {
  try {
    const issue = await getSingleIssue(Number(req.params.id));
    sendResponse_default(res, {
      statusCode: StatusCodes6.OK,
      success: true,
      message: "Issue retrieved successfully",
      data: issue
    });
  } catch (error) {
    if (isIssueError(error)) {
      sendResponse_default(res, {
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        errors: error.errors
      });
      return;
    }
    sendResponse_default(res, {
      statusCode: StatusCodes6.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Failed to fetch issue",
      errors: "Unexpected error"
    });
  }
};
var updateIssue2 = async (req, res) => {
  try {
    const updatedIssue = await updateIssue(
      Number(req.params.id),
      req.body ?? {},
      req.user
    );
    sendResponse_default(res, {
      statusCode: StatusCodes6.OK,
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
        updated_at: updatedIssue.updated_at
      }
    });
  } catch (error) {
    if (isIssueError(error)) {
      sendResponse_default(res, {
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        errors: error.errors
      });
      return;
    }
    sendResponse_default(res, {
      statusCode: StatusCodes6.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Failed to update issue",
      errors: "Unexpected error"
    });
  }
};
var deleteIssue2 = async (req, res) => {
  try {
    await deleteIssue(Number(req.params.id));
    sendResponse_default(res, {
      statusCode: StatusCodes6.OK,
      success: true,
      message: "Issue deleted successfully"
    });
  } catch (error) {
    if (isIssueError(error)) {
      sendResponse_default(res, {
        statusCode: error.statusCode,
        success: false,
        message: error.message,
        errors: error.errors
      });
      return;
    }
    sendResponse_default(res, {
      statusCode: StatusCodes6.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Failed to delete issue",
      errors: "Unexpected error"
    });
  }
};

// src/modules/issues/issues.route.ts
var router2 = Router2();
router2.post("/", requireAuth_default, createIssue2);
router2.get("/", getAllIssues2);
router2.get("/:id", getSingleIssue2);
router2.patch("/:id", requireAuth_default, updateIssue2);
router2.delete("/:id", requireAuth_default, requireRole_default(["maintainer"]), deleteIssue2);
var issues_route_default = router2;

// src/modules/admin/admin.route.ts
import { Router as Router3 } from "express";

// src/modules/admin/admin.controller.ts
import { StatusCodes as StatusCodes7 } from "http-status-codes";

// src/modules/admin/admin.service.ts
var getAdmin = async () => {
  const usersResult = await db_default.query("select count(*)::int as count from users");
  const issuesResult = await db_default.query("select count(*)::int as count from issues");
  const usersCount = usersResult.rows[0]?.count ?? 0;
  const issuesCount = issuesResult.rows[0]?.count ?? 0;
  return {
    users: usersCount,
    issues: issuesCount,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
};

// src/modules/admin/admin.controller.ts
var getAdmin2 = async (_req, res) => {
  const admin = await getAdmin();
  sendResponse_default(res, {
    statusCode: StatusCodes7.OK,
    success: true,
    message: "Admin retrieved successfully",
    data: admin
  });
};

// src/modules/admin/admin.route.ts
var router3 = Router3();
router3.get("/", requireAuth_default, requireRole_default(["maintainer"]), getAdmin2);
var admin_route_default = router3;

// src/middleware/globalErrorHandler.ts
import { StatusCodes as StatusCodes8 } from "http-status-codes";
var globalErrorHandler = (err, _req, res, _next) => {
  const normalized = err && typeof err === "object" ? err : void 0;
  const statusCode = typeof normalized?.statusCode === "number" ? normalized.statusCode : StatusCodes8.INTERNAL_SERVER_ERROR;
  const message = normalized?.message ?? "Internal server error";
  const errors = normalized?.errors ?? (err instanceof Error ? err.message : "Unexpected error");
  sendResponse_default(res, {
    statusCode,
    success: false,
    message,
    errors
  });
};
var globalErrorHandler_default = globalErrorHandler;

// src/app.ts
var app = express();
app.use(express.json());
app.get("/", (_req, res) => {
  sendResponse_default(res, {
    statusCode: StatusCodes9.OK,
    success: true,
    message: "API is running",
    data: { status: "ok" }
  });
});
app.use("/api/auth", auth_route_default);
app.use("/api/issues", issues_route_default);
app.use("/api/admin", admin_route_default);
app.use((req, res) => {
  sendResponse_default(res, {
    statusCode: StatusCodes9.NOT_FOUND,
    success: false,
    message: "Route not found",
    errors: { path: req.originalUrl }
  });
});
app.use(globalErrorHandler_default);
var app_default = app;

// src/server.ts
var port = Number(config_default.port ?? 3e3);
var start = async () => {
  try {
    await initDb();
    app_default.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to initialize database", error);
    process.exit(1);
  }
};
start();
//# sourceMappingURL=server.js.map