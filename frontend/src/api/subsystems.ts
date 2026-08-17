import { api } from "./client";
import type { Subsystem } from "../types";

export async function listSubsystems(): Promise<Subsystem[]> {
  const res = await api.get<{ subsystems: Subsystem[] }>("/subsystems");
  return res.data.subsystems;
}
