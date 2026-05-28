/**
 * Deterministic hash of a string returning a value in [0, 1).
 *
 * Ports the legacy hash.ts exactly:
 *   h = ((h << 5) - h + charCode) | 0,  seed = 7
 *   result = h / (2^32 - 2) + 0.5
 *
 * The legacy formula keeps the same distribution as the original Angular 7
 * reference so per-tag block colours are stable across the port.
 */
export function hash(s: string): number {
  if (!s) return 0;
  let h = 7;
  for (let i = 0; i < s.length; i++) {
    // Same bit-ops as legacy: (h << 5) - h  ==  h * 31, truncated to int32
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  // Map the signed int32 to [0, 1) — same formula as legacy
  return h / (Math.pow(2, 32) - 2) + 0.5;
}
