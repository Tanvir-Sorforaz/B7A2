import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import pool from "../../db";
import config from "../../config/index";
import type { UserProfile, UserRole } from "../../types/user";
import type { AuthError, AuthTokenResponse, LoginInput, SignupInput } from "./auth.interface";

const allowedRoles: UserRole[] = ["contributor", "maintainer"];

const buildUserProfile = (row: UserProfile): UserProfile => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const createAuthError = (statusCode: number, message: string, errors: unknown): AuthError => ({
  statusCode,
  message,
  errors,
});

export const signupUser = async (input: SignupInput): Promise<UserProfile> => {
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

  const existing = await pool.query("select id from users where email = $1", [email]);
  if (existing.rowCount) {
    throw createAuthError(
      StatusCodes.CONFLICT,
      "Email already registered",
      "Duplicate email"
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "insert into users (name, email, password, role) values ($1, $2, $3, $4) returning id, name, email, role, created_at, updated_at",
    [name, email, hashedPassword, normalizedRole]
  );

  return buildUserProfile(result.rows[0] as UserProfile);
};

export const loginUser = async (input: LoginInput): Promise<AuthTokenResponse> => {
  const { email, password } = input;

  if (!email || !password) {
    throw createAuthError(
      StatusCodes.BAD_REQUEST,
      "Missing credentials",
      "email and password are required"
    );
  }

  const result = await pool.query(
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

  const userRow = result.rows[0] as UserProfile & { password: string };
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
      role: userRow.role,
    },
    config.secret as string,
    { expiresIn: "1d" }
  );

  return {
    token,
    user: buildUserProfile(userRow),
  };
};
