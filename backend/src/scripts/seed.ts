import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Subsystem, DEFAULT_SUBSYSTEMS } from "../models/Subsystem.js";
import { hashPassword } from "../services/authService.js";

async function seed() {
  await connectDB();

  const treasurerHash = await hashPassword(env.seed.treasurerPassword);
  await User.findOneAndUpdate(
    { username: env.seed.treasurerUsername },
    {
      username: env.seed.treasurerUsername,
      passwordHash: treasurerHash,
      displayName: "Treasurer",
      role: "TREASURER",
      active: true,
    },
    { upsert: true }
  );

  const memberHash = await hashPassword(env.seed.memberPassword);
  await User.findOneAndUpdate(
    { username: env.seed.memberUsername },
    {
      username: env.seed.memberUsername,
      passwordHash: memberHash,
      displayName: "Team Member",
      role: "MEMBER",
      active: true,
    },
    { upsert: true }
  );

  for (const name of DEFAULT_SUBSYSTEMS) {
    await Subsystem.findOneAndUpdate({ name }, { name, active: true }, { upsert: true });
  }

  console.log("Seed complete:");
  console.log(`  Treasurer login -> ${env.seed.treasurerUsername} / ${env.seed.treasurerPassword}`);
  console.log(`  Member login    -> ${env.seed.memberUsername} / ${env.seed.memberPassword}`);
  console.log(`  Seeded ${DEFAULT_SUBSYSTEMS.length} default subsystems.`);
  console.log("\nChange these passwords before production use.");

  await disconnectDB();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
