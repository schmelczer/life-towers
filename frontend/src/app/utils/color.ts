import { HslColor } from '../models';
import { hash } from './hash';

/**
 * Lighten (or darken) an HslColor by a number of percentage points.
 * `byPercentPoints` is in raw percent (e.g. 25 means +25 lightness points out of 100).
 * Clamps the result to [0, 1].
 */
export function lighten(byPercentPoints: number, c: HslColor): HslColor {
  let newL = c.l * 100 + byPercentPoints;
  if (newL > 100) newL = 100;
  else if (newL < 0) newL = 0;
  return { h: c.h, s: c.s, l: newL / 100 };
}

/**
 * Converts an HslColor (all values 0–1) to a CSS hsl() string.
 * Note: the new app stores h/s/l normalised to [0, 1].
 */
export function toCss(c: HslColor): string {
  return `hsl(${c.h * 360}, ${c.s * 100}%, ${c.l * 100}%)`;
}

/**
 * Derive a per-tag color by offsetting the tower's base lightness deterministically.
 * Uses FNV-1a hash → offset in [−25, +25) lightness percentage points.
 * All blocks in the same tower vary in lightness only, preserving the hue and saturation.
 */
export function getColorOfTag(tag: string, base: HslColor): string {
  const offset = (hash(tag) - 0.5) * 50; // → [−25, +25) percentage points
  return toCss(lighten(offset, base));
}
