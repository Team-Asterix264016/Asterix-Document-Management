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

