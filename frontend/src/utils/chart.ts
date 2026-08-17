export function truncateTick(value: string, maxLength = 10): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

export const CHART_PALETTE = ["#2F5D50", "#B8862B", "#3D5A80", "#A23B32", "#6B5B95", "#7A7468"];
