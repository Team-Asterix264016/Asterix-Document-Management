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


function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",

  mongodbUri: process.env.MONGODB_URI ?? "",

  jwtSecret: process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",

  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN ?? "",
  googleDriveRootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? "",

  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 15),

  seed: {
    treasurerUsername: process.env.SEED_TREASURER_USERNAME ?? "treasurer",
    treasurerPassword: process.env.SEED_TREASURER_PASSWORD ?? "changeme123",
    memberUsername: process.env.SEED_MEMBER_USERNAME ?? "member",
    memberPassword: process.env.SEED_MEMBER_PASSWORD ?? "changeme123",
  },
};

export const PROJECT_NAME = "Asterix A-BAJA 2027";
