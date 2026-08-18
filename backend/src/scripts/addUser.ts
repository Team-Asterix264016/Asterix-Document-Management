import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { hashPassword } from "../services/authService.js";

async function addUser() {
  const username = process.argv[2];
  const password = process.argv[3];
  const displayName = process.argv[4] || username;
  const role = process.argv[5] || "MEMBER";

  if (!username || !password) {
    console.error("Usage: npm run add-user <username> <password> [displayName] [role]");
    console.error("Roles: MEMBER (default), TREASURER");
    process.exit(1);
  }

  try {
    await connectDB();

    const existing = await User.findOne({ username });
    if (existing) {
      console.error(`User ${username} already exists.`);
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);
    const user = new User({
      username,
      passwordHash,
      displayName,
      role,
      active: true,
    });

    await user.save();
    console.log(`Successfully created user: ${username} with role ${role}`);
  } catch (err) {
    console.error("Error creating user:", err);
  } finally {
    await disconnectDB();
  }
}

addUser();
