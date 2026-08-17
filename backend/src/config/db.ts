import mongoose from "mongoose";
import { env } from "./env.js";
import { User } from "../models/User.js";
import { Bill } from "../models/Bill.js";
import { Subsystem } from "../models/Subsystem.js";
import { Vendor } from "../models/Vendor.js";
import { Report } from "../models/Report.js";

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri, {
    maxPoolSize: 10,
  });

  // Indexes (including the collated unique index on Subsystem.name) are otherwise built in the
  // background — waiting here means the uniqueness/race guarantees are live before the server
  // starts accepting requests, not at some indeterminate point after the first few queries.
  await Promise.all([User.init(), Bill.init(), Subsystem.init(), Vendor.init(), Report.init()]);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
