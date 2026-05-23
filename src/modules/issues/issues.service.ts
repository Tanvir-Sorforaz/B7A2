import { StatusCodes } from "http-status-codes";
import pool from "../../db";
import type { JwtUserPayload } from "../../types/jwt";
import type {
    CreateIssueInput,
    IssueFilters,
    IssueResponse,
    IssueRow,
    IssueServiceError,
    IssueStatus,
    IssueType,
    ReporterProfile,
    UpdateIssueInput,
} from "./issues.interface";

const allowedTypes: IssueType[] = ["bug", "feature_request"];
const allowedStatuses: IssueStatus[] = ["open", "in_progress", "resolved"];
const allowedSorts = ["newest", "oldest"] as const;

const createIssueError = (
    statusCode: number,
    message: string,
    errors: unknown
): IssueServiceError => ({
    statusCode,
    message,
    errors,
});

const mapReporter = (reporter?: ReporterProfile | null) =>
    reporter
        ? {
            id: reporter.id,
            name: reporter.name,
            role: reporter.role,
        }
        : null;

const buildIssueResponse = (issue: IssueRow, reporter?: ReporterProfile | null): IssueResponse => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    reporter: mapReporter(reporter),
    created_at: issue.created_at,
    updated_at: issue.updated_at,
});

const fetchReporters = async (reporterIds: number[]) => {
    if (!reporterIds.length) {
        return new Map<number, ReporterProfile>();
    }

    const result = await pool.query(
        "select id, name, role from users where id = any($1)",
        [reporterIds]
    );

    const map = new Map<number, ReporterProfile>();
    for (const row of result.rows as ReporterProfile[]) {
        map.set(row.id, row);
    }
    return map;
};

export const createIssue = async (
    input: CreateIssueInput,
    user?: JwtUserPayload
): Promise<IssueRow> => {
    const { title, description, type } = input;

    if (!user) {
        throw createIssueError(
            StatusCodes.UNAUTHORIZED,
            "Authentication required",
            "User context missing"
        );
    }

    if (!title || !description || !type) {
        throw createIssueError(
            StatusCodes.BAD_REQUEST,
            "Missing required fields",
            "title, description, and type are required"
        );
    }

    if (title.length > 150) {
        throw createIssueError(
            StatusCodes.BAD_REQUEST,
            "Title too long",
            "title must be 150 characters or fewer"
        );
    }

    if (description.length < 20) {
        throw createIssueError(
            StatusCodes.BAD_REQUEST,
            "Description too short",
            "description must be at least 20 characters"
        );
    }

    if (!allowedTypes.includes(type)) {
        throw createIssueError(StatusCodes.BAD_REQUEST, "Invalid issue type", {
            allowed: allowedTypes,
        });
    }

    const result = await pool.query(
        "insert into issues (title, description, type, status, reporter_id) values ($1, $2, $3, $4, $5) returning id, title, description, type, status, reporter_id, created_at, updated_at",
        [title, description, type, "open", user.id]
    );

    return result.rows[0] as IssueRow;
};

export const getAllIssues = async (filters: IssueFilters): Promise<IssueResponse[]> => {
    const { sort = "newest", type, status } = filters;

    if (sort && !allowedSorts.includes(sort as (typeof allowedSorts)[number])) {
        throw createIssueError(StatusCodes.BAD_REQUEST, "Invalid sort option", {
            allowed: allowedSorts,
        });
    }

    if (type && !allowedTypes.includes(type)) {
        throw createIssueError(StatusCodes.BAD_REQUEST, "Invalid type filter", {
            allowed: allowedTypes,
        });
    }

    if (status && !allowedStatuses.includes(status)) {
        throw createIssueError(StatusCodes.BAD_REQUEST, "Invalid status filter", {
            allowed: allowedStatuses,
        });
    }

    const values: Array<string | number> = [];
    const filtersSql: string[] = [];

    if (type) {
        values.push(type);
        filtersSql.push(`type = $${values.length}`);
    }

    if (status) {
        values.push(status);
        filtersSql.push(`status = $${values.length}`);
    }

    const order = sort === "oldest" ? "asc" : "desc";
    let sql =
        "select id, title, description, type, status, reporter_id, created_at, updated_at from issues";

    if (filtersSql.length) {
        sql += ` where ${filtersSql.join(" and ")}`;
    }

    sql += ` order by created_at ${order}`;

    const result = await pool.query(sql, values);
    const issues = result.rows as IssueRow[];

    const reporterIds = Array.from(new Set(issues.map((issue) => issue.reporter_id)));
    const reporterMap = await fetchReporters(reporterIds);

    return issues.map((issue) => {
        const reporter = reporterMap.get(issue.reporter_id) ?? null;
        return buildIssueResponse(issue, reporter);
    });
};

export const getSingleIssue = async (id: number): Promise<IssueResponse> => {
    if (Number.isNaN(id)) {
        throw createIssueError(
            StatusCodes.BAD_REQUEST,
            "Invalid issue id",
            "id must be a number"
        );
    }

    const issueResult = await pool.query(
        "select id, title, description, type, status, reporter_id, created_at, updated_at from issues where id = $1",
        [id]
    );

    if (!issueResult.rowCount) {
        throw createIssueError(
            StatusCodes.NOT_FOUND,
            "Issue not found",
            `No issue found with id ${id}`
        );
    }

    const issue = issueResult.rows[0] as IssueRow;
    const reporterResult = await pool.query(
        "select id, name, role from users where id = $1",
        [issue.reporter_id]
    );
    const reporter = (reporterResult.rows[0] as ReporterProfile | undefined) ?? null;

    return buildIssueResponse(issue, reporter);
};

export const updateIssue = async (
    id: number,
    input: UpdateIssueInput,
    user?: JwtUserPayload
): Promise<IssueRow> => {
    if (Number.isNaN(id)) {
        throw createIssueError(
            StatusCodes.BAD_REQUEST,
            "Invalid issue id",
            "id must be a number"
        );
    }

    if (!user) {
        throw createIssueError(
            StatusCodes.UNAUTHORIZED,
            "Authentication required",
            "User context missing"
        );
    }

    const issueResult = await pool.query(
        "select id, reporter_id, status from issues where id = $1",
        [id]
    );

    if (!issueResult.rowCount) {
        throw createIssueError(
            StatusCodes.NOT_FOUND,
            "Issue not found",
            `No issue found with id ${id}`
        );
    }

    const issue = issueResult.rows[0] as Pick<IssueRow, "reporter_id" | "status">;

    if (user.role === "contributor") {
        if (issue.reporter_id !== user.id) {
            throw createIssueError(
                StatusCodes.FORBIDDEN,
                "Cannot edit another user's issue",
                "Only maintainers can edit any issue"
            );
        }

        if (issue.status !== "open") {
            throw createIssueError(
                StatusCodes.CONFLICT,
                "Issue cannot be updated",
                "Only open issues can be edited by contributors"
            );
        }
    }

    const { title, description, type, status } = input;

    const updates: string[] = [];
    const values: Array<string | number> = [];

    if (title !== undefined) {
        if (!title) {
            throw createIssueError(
                StatusCodes.BAD_REQUEST,
                "Title cannot be empty",
                "title must be provided"
            );
        }
        if (title.length > 150) {
            throw createIssueError(
                StatusCodes.BAD_REQUEST,
                "Title too long",
                "title must be 150 characters or fewer"
            );
        }
        values.push(title);
        updates.push(`title = $${values.length}`);
    }

    if (description !== undefined) {
        if (!description) {
            throw createIssueError(
                StatusCodes.BAD_REQUEST,
                "Description cannot be empty",
                "description must be provided"
            );
        }
        if (description.length < 20) {
            throw createIssueError(
                StatusCodes.BAD_REQUEST,
                "Description too short",
                "description must be at least 20 characters"
            );
        }
        values.push(description);
        updates.push(`description = $${values.length}`);
    }

    if (type !== undefined) {
        if (!allowedTypes.includes(type)) {
            throw createIssueError(StatusCodes.BAD_REQUEST, "Invalid issue type", {
                allowed: allowedTypes,
            });
        }
        values.push(type);
        updates.push(`type = $${values.length}`);
    }

    if (status !== undefined) {
        if (user.role !== "maintainer") {
            throw createIssueError(
                StatusCodes.FORBIDDEN,
                "Cannot update status",
                "Only maintainers can change status"
            );
        }
        if (!allowedStatuses.includes(status)) {
            throw createIssueError(StatusCodes.BAD_REQUEST, "Invalid issue status", {
                allowed: allowedStatuses,
            });
        }
        values.push(status);
        updates.push(`status = $${values.length}`);
    }

    if (!updates.length) {
        throw createIssueError(
            StatusCodes.BAD_REQUEST,
            "No valid updates provided",
            "Provide at least one updatable field"
        );
    }

    values.push(id);

    const updateSql = `update issues set ${updates.join(", ")}, updated_at = now() where id = $${values.length
        } returning id, title, description, type, status, reporter_id, created_at, updated_at`;

    const updateResult = await pool.query(updateSql, values);
    return updateResult.rows[0] as IssueRow;
};

export const deleteIssue = async (id: number): Promise<void> => {
    if (Number.isNaN(id)) {
        throw createIssueError(
            StatusCodes.BAD_REQUEST,
            "Invalid issue id",
            "id must be a number"
        );
    }

    const result = await pool.query("delete from issues where id = $1", [id]);
    if (!result.rowCount) {
        throw createIssueError(
            StatusCodes.NOT_FOUND,
            "Issue not found",
            `No issue found with id ${id}`
        );
    }
};
