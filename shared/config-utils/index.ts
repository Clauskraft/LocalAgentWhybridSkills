/**
 * Shared configuration parsing utilities
 * Used across all Local Agent services for consistent environment variable parsing
 */

/**
 * Safely parse an integer from a string, returning a fallback if invalid.
 * @param value - String value to parse (may be undefined)
 * @param fallback - Default value if parsing fails
 * @returns Parsed integer or fallback
 */
export function parseIntSafe(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parse a boolean from a string, supporting multiple truthy/falsy formats.
 * @param value - String value to parse (may be undefined)
 * @param fallback - Default value if parsing fails
 * @returns Parsed boolean or fallback
 * 
 * Truthy values: "true", "1", "yes"
 * Falsy values: "false", "0", "no"
 */
export function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const v = value.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return fallback;
}

/**
 * Parse a comma-separated list of strings from an environment variable.
 * @param value - Comma-separated string (may be undefined)
 * @param fallback - Default value if value is undefined (defaults to empty array)
 * @returns Array of trimmed, non-empty strings
 */
export function parseList(value: string | undefined, fallback: string[] = []): string[] {
  if (value === undefined) return fallback;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Alias for parseList for backward compatibility with the legacy desktop package naming
 * @deprecated Use parseList instead
 */
export const parseStringList = parseList;

