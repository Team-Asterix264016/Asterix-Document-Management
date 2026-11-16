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
  try {
    if (typeof value === "string") {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      }
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function nameOf(entity: { displayName: string } | string | null | undefined): string {
  if (!entity) return "—";
  return typeof entity === "string" ? entity : entity.displayName;
}

export function subsystemName(entity: { name: string } | string | null | undefined): string {
  if (!entity) return "Uncategorized";
  return typeof entity === "string" ? entity : entity.name;
}
