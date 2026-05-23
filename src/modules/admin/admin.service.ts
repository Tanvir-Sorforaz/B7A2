import pool from "../../db";
import type { AdminResponse } from "./admin.interface";

export const getAdmin = async (): Promise<AdminResponse> => {
  const usersResult = await pool.query("select count(*)::int as count from users");
  const issuesResult = await pool.query("select count(*)::int as count from issues");

  const usersCount = usersResult.rows[0]?.count ?? 0;
  const issuesCount = issuesResult.rows[0]?.count ?? 0;

  return {
    users: usersCount,
    issues: issuesCount,
    timestamp: new Date().toISOString(),
  };
};
