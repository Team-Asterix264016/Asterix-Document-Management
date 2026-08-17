import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { login } from "../services/authService.js";

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const result = await login(username, password);
  res.json(result);
});

export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: req.user });
});
