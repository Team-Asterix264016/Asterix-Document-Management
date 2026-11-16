import type { NextFunction, Request, Response } from "express";
import { verifyToken, type TokenPayload } from "../services/authService.js";
import { ApiError } from "../utils/ApiError.js";
import type { Role } from "../models/User.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  let token: string | undefined;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    token = header.slice("Bearer ".length);
  } else if (typeof req.query.token === "string" && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(ApiError.unauthorized("Missing authentication token"));
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}
