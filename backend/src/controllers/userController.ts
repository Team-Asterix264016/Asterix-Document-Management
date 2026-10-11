import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { hashPassword } from "../services/authService.js";

export const getUsers = async (req: Request, res: Response) => {
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
  res.json({ data: users });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: { message: "Password must be at least 4 characters" } });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  res.json({ message: "Password updated successfully" });
};

export const createUser = async (req: Request, res: Response) => {
  const { username, password, displayName, role } = req.body;

  if (!username || !password || !displayName || !role) {
    return res.status(400).json({ error: { message: "All fields are required" } });
  }

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(400).json({ error: { message: "Username already exists" } });
  }

  const passwordHash = await hashPassword(password);
  const user = new User({
    username: username.toLowerCase().trim(),
    passwordHash,
    displayName,
    role,
    active: true,
  });

  await user.save();
  const userObj = user.toObject();
  const { passwordHash: _, ...safeUser } = userObj;
  
  res.status(201).json({ data: safeUser });
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { displayName, username, role, active } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  // Prevent an admin from demoting or deactivating their own logged-in account
  if (req.user?.sub === id) {
    if (role && role !== "ADMIN") {
      return res.status(400).json({ error: { message: "You cannot demote your own admin account" } });
    }
    if (active === false) {
      return res.status(400).json({ error: { message: "You cannot deactivate your own account" } });
    }
  }

  if (username && username.trim().toLowerCase() !== user.username) {
    const normalized = username.trim().toLowerCase();
    const existing = await User.findOne({ username: normalized, _id: { $ne: id } });
    if (existing) {
      return res.status(400).json({ error: { message: "Username already exists" } });
    }
    user.username = normalized;
  }

  if (displayName && displayName.trim()) {
    user.displayName = displayName.trim();
  }

  if (role) {
    user.role = role;
  }

  if (active !== undefined) {
    user.active = Boolean(active);
  }

  await user.save();

  const userObj = user.toObject();
  const { passwordHash: _, ...safeUser } = userObj;

  res.json({ data: safeUser, message: "User updated successfully" });
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.user?.sub === id) {
    return res.status(400).json({ error: { message: "You cannot delete your own account" } });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  await User.findByIdAndDelete(id);

  res.json({ message: "User deleted successfully" });
};

