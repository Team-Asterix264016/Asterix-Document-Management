export function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "unknown";
}

export function buildBillFilename(params: {
  billDate: Date | null;
  vendor: string | null;
  subsystemName: string | null;
  totalAmount: number | null;
  index?: number;
  extension: string;
}): string {
  const date = params.billDate ?? new Date();
  const dateStr = date.toISOString().slice(0, 10);
  const vendor = sanitizeFilenamePart(params.vendor ?? "Unknown-Vendor");
  const subsystem = sanitizeFilenamePart(params.subsystemName ?? "Uncategorized");
  const amount = params.totalAmount != null ? Math.round(params.totalAmount).toString() : "0";
  const suffix = params.index != null ? `_${params.index}` : "";
  return `${dateStr}_${vendor}_${subsystem}_${amount}${suffix}.${params.extension}`;
}

export function extensionFromMime(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "image/png":
      return "png";
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    default:
      return "bin";
  }
}
