import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User, type Role } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

export interface TokenPayload {
  sub: string;
  username: string;
  role: Role;
  displayName: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function login(username: string, password: string) {
  const user = await User.findOne({ username: username.trim().toLowerCase() });
  if (!user || !user.active) {
    throw ApiError.unauthorized("Invalid username or password");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Invalid username or password");
  }

  const payload: TokenPayload = {
    sub: user.id,
    username: user.username,
    role: user.role as Role,
    displayName: user.displayName,
  };

  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
  };
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}
