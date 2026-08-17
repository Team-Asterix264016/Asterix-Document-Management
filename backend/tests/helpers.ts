import { User } from "../src/models/User.js";
import { hashPassword } from "../src/services/authService.js";
import { Subsystem } from "../src/models/Subsystem.js";

export async function createUser(overrides: Partial<{ username: string; password: string; role: "MEMBER" | "TREASURER"; displayName: string }> = {}) {
  const password = overrides.password ?? "password123";
  const user = await User.create({
    username: overrides.username ?? "member1",
    passwordHash: await hashPassword(password),
    displayName: overrides.displayName ?? "Test User",
    role: overrides.role ?? "MEMBER",
    active: true,
  });
  return { user, password };
}

export async function createSubsystem(name = "Mechanical") {
  return Subsystem.create({ name });
}
