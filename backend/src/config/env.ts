import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const cwdEnv = path.resolve(process.cwd(), ".env");
const parentEnv = path.resolve(process.cwd(), "..", ".env");

if (fs.existsSync(cwdEnv)) {
  dotenv.config({ path: cwdEnv });
} else if (fs.existsSync(parentEnv)) {
  dotenv.config({ path: parentEnv });
} else {
  dotenv.config();
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProd = nodeEnv === "production";

const DEV_JWT_SECRET = "dev-only-insecure-secret-change-me";

function parseOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

const frontendUrlRaw = process.env.FRONTEND_URL ?? "http://localhost:5173";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv,
  isProd,
  isTest: nodeEnv === "test",
  frontendUrl: frontendUrlRaw,
  /** Comma-separated FRONTEND_URL values become the CORS allowlist. */
  allowedOrigins: parseOrigins(frontendUrlRaw),

  mongodbUri: process.env.MONGODB_URI ?? "",

  jwtSecret: process.env.JWT_SECRET ?? DEV_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  geminiOcrModel: process.env.GEMINI_OCR_MODEL || "",

  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN ?? "",
  googleDriveRootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? "",

  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 15),
  /** Hard ceiling on a single Gemini call so a request cannot hang a worker forever. */
  geminiTimeoutMs: Number(process.env.GEMINI_TIMEOUT_MS ?? 90_000),

  seed: {
    treasurerUsername: process.env.SEED_TREASURER_USERNAME ?? "treasurer",
    treasurerPassword: process.env.SEED_TREASURER_PASSWORD ?? "changeme123",
    memberUsername: process.env.SEED_MEMBER_USERNAME ?? "member",
    memberPassword: process.env.SEED_MEMBER_PASSWORD ?? "changeme123",
  },
};

/**
 * Fails fast at boot when production is missing anything the app cannot fake.
 * Kept separate from the object above so tests can import `env` without a real .env.
 */
export function assertProductionEnv(): void {
  if (!env.isProd) return;

  const problems: string[] = [];

  if (!env.mongodbUri) problems.push("MONGODB_URI is required");
  if (!process.env.JWT_SECRET) problems.push("JWT_SECRET is required");
  else if (env.jwtSecret === DEV_JWT_SECRET) problems.push("JWT_SECRET must not be the development default");
  else if (env.jwtSecret.length < 32) problems.push("JWT_SECRET must be at least 32 characters");
  if (env.allowedOrigins.length === 0) problems.push("FRONTEND_URL is required");
  if (!Number.isFinite(env.port) || env.port <= 0) problems.push("PORT must be a positive number");

  if (problems.length > 0) {
    throw new Error(`Invalid production configuration:\n  - ${problems.join("\n  - ")}`);
  }
}

export const PROJECT_NAME = "Asterix A-BAJA 2027";
