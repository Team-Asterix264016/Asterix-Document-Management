export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function nameOf(entity: { displayName: string } | string | null | undefined): string {
  if (!entity) return "—";
  return typeof entity === "string" ? entity : entity.displayName;
}

export function subsystemName(entity: { name: string } | string | null | undefined): string {
  if (!entity) return "Uncategorized";
  return typeof entity === "string" ? entity : entity.name;
}
