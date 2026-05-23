import type { UserRole } from "../../types/user";

export type IssueType = "bug" | "feature_request";
export type IssueStatus = "open" | "in_progress" | "resolved";
export type IssueSort = "newest" | "oldest";

export type IssueRow = {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter_id: number;
  created_at: string;
  updated_at: string;
};

export type ReporterProfile = {
  id: number;
  name: string;
  role: UserRole;
};

export type IssueResponse = {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter: ReporterProfile | null;
  created_at: string;
  updated_at: string;
};

export type IssueServiceError = {
  statusCode: number;
  message: string;
  errors: unknown;
};

export type CreateIssueInput = {
  title?: string;
  description?: string;
  type?: IssueType;
};

export type IssueFilters = {
  sort?: string;
  type?: IssueType;
  status?: IssueStatus;
};

export type UpdateIssueInput = {
  title?: string;
  description?: string;
  type?: IssueType;
  status?: IssueStatus;
};
