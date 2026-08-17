import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { MulterError } from "multer";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

function translateKnownError(err: unknown): ApiError | null {
  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid ${err.path}: not a valid identifier`);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return ApiError.badRequest("Invalid data", Object.keys(err.errors));
  }

  if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
    return ApiError.conflict("A record with these details already exists");
  }

  if (err instanceof MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: `File too large. Maximum size is ${env.maxUploadMb}MB.`,
      LIMIT_FILE_COUNT: "Too many files in a single upload.",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field.",
    };
    return ApiError.badRequest(messages[err.code] ?? "File upload failed.");
  }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const translated = err instanceof ApiError ? err : translateKnownError(err);

  if (translated instanceof ApiError) {
    return res.status(translated.status).json({
      error: translated.message,
      details: translated.details,
    });
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Something went wrong. Please try again.",
    ...(env.isProd ? {} : { debug: err instanceof Error ? err.message : String(err) }),
  });
}
