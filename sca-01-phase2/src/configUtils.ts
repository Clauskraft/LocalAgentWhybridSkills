export function parseIntSafe(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : defaultValue;
}

export function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const v = value.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return defaultValue;
}

export function parseStringList(value: string | undefined, defaultValue: string[]): string[] {
  if (value === undefined) return defaultValue;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

