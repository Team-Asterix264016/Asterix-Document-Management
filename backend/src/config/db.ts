import mongoose from "mongoose";
import { env } from "./env.js";
import { User } from "../models/User.js";
import { Bill } from "../models/Bill.js";
import { Subsystem } from "../models/Subsystem.js";
import { Vendor } from "../models/Vendor.js";
import { Report } from "../models/Report.js";

export async function connectDB(): Promise<void> {
  console.log("Connecting to MongoDB Atlas...");
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri, {
    maxPoolSize: 10,
  });
  console.log("Connected to MongoDB Atlas.");

  console.log("Syncing database indexes...");
  await Promise.all([User.init(), Bill.init(), Subsystem.init(), Vendor.init(), Report.init()]);
  console.log("Database indexes synced.");
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
