import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri, {
    maxPoolSize: 10,
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
