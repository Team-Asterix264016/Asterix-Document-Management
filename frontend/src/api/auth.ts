import { api } from "./client";
import type { User } from "../types";

export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  const res = await api.post<{ token: string; user: User }>("/auth/login", { username, password });
  return res.data;
}
