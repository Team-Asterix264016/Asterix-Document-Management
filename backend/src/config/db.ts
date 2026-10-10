import mongoose from "mongoose";
import { env } from "./env.js";
import { User } from "../models/User.js";
import { Bill } from "../models/Bill.js";
import { Subsystem } from "../models/Subsystem.js";
import { Vendor } from "../models/Vendor.js";
import { Report } from "../models/Report.js";

const CONNECT_OPTIONS: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 15_000,
  socketTimeoutMS: 45_000,
  connectTimeoutMS: 15_000,
  retryWrites: true,
  family: 4,
};

let listenersAttached = false;

function attachConnectionListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected. Driver will retry in the background.");
  });
  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected.");
  });
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err instanceof Error ? err.message : err);
  });
}

/** True once mongoose has an open connection we can serve queries from. */
export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function dbStatus(): string {
  return ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] ?? "unknown";
}

async function syncIndexes(): Promise<void> {
  await Promise.all([User.init(), Bill.init(), Subsystem.init(), Vendor.init(), Report.init()]);
}

export async function connectDB(): Promise<void> {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not set");
  }

  attachConnectionListeners();
  mongoose.set("strictQuery", true);

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(env.mongodbUri, CONNECT_OPTIONS);
  console.log("Connected to MongoDB Atlas.");

  // Index sync is best-effort: a failure here must not take the API down.
  try {
    console.log("Syncing database indexes...");
    await syncIndexes();
    console.log("Database indexes synced.");
  } catch (err) {
    console.error("Index sync failed (continuing):", err instanceof Error ? err.message : err);
  }
}

/**
 * Keeps retrying the initial connection with capped exponential backoff so the
 * process stays up (and keeps answering health checks) through an Atlas outage
 * or a temporary IP-access-list problem.
 */
/**
 * Atlas rejects connections from IPs outside the project access list by closing
 * the TLS handshake with alert 80, which surfaces as an opaque OpenSSL error.
 * Name it explicitly so the log says what to fix.
 */
function explainConnectionFailure(message: string): string {
  if (message.includes("SSL alert number 80") || message.includes("tlsv1 alert internal error")) {
    return (
      "  Hint: Atlas closed the TLS handshake. This almost always means this host's outbound IP " +
      "is not in the Atlas project's Network Access list, or the cluster is paused. " +
      "Render free-tier services have no static outbound IP, so the access list needs 0.0.0.0/0."
    );
  }
  if (message.includes("Authentication failed") || message.includes("bad auth")) {
    return "  Hint: the database user or password in MONGODB_URI is wrong, or the password is not URL-encoded.";
  }
  if (message.includes("ENOTFOUND") || message.includes("querySrv")) {
    return "  Hint: the cluster hostname in MONGODB_URI did not resolve. Check the URI and that the cluster still exists.";
  }
  return "  Hint: verify MONGODB_URI, the Atlas Network Access list, and that the cluster is running.";
}

export function connectDBWithRetry(): void {
  let attempt = 0;

  const tryConnect = async (): Promise<void> => {
    attempt += 1;
    try {
      await connectDB();
    } catch (err) {
      const delayMs = Math.min(30_000, 2_000 * 2 ** Math.min(attempt - 1, 4));
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `MongoDB connection attempt ${attempt} failed: ${message}. Retrying in ${Math.round(delayMs / 1000)}s.`
      );
      if (attempt === 1) console.error(explainConnectionFailure(message));
      setTimeout(() => void tryConnect(), delayMs).unref();
    }
  };

  void tryConnect();
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
