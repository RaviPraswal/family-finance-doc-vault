/**
 * Money in integer paise (Sprint 7 T2, SPEC P0-2, D-04).
 * Every client-side money calculation goes through these helpers; rupee floats appear only at the edges
 * (parsing API values with toPaise, displaying with formatINR). One rounding rule everywhere: half-up, away from zero.
 */

const assertWhole = (p: number) => {
  if (!Number.isSafeInteger(p)) throw new Error(`Money must be whole paise, got ${p}`);
};

/** Divides two integers, rounding half away from zero, exactly (BigInt avoids float error on large values). */
const divRound = (num: bigint, den: bigint): number => {
  const neg = num < 0n !== den < 0n;
  const n = num < 0n ? -num : num;
  const d = den < 0n ? -den : den;
  const q = (n * 2n + d) / (2n * d);
  return Number(neg ? -q : q);
};

/** Parses a decimal string into a scaled integer and its scale, e.g. "9.99" -> [999n, 100n]. */
const parseDecimal = (raw: string): [bigint, bigint] | null => {
  const m = /^\s*(-?)(\d*)(?:\.(\d*))?\s*$/.exec(raw);
  if (!m || (m[2] === '' && (m[3] ?? '') === '')) return null;
  const frac = m[3] ?? '';
  const scale = 10n ** BigInt(frac.length);
  const value = BigInt((m[2] || '0') + frac) * (m[1] ? -1n : 1n);
  return [value, scale];
};

/** Rupees (number or string, as the API sends them) to whole paise. Empty or invalid input is 0. */
export function toPaise(rupees: number | string | null | undefined): number {
  if (rupees === null || rupees === undefined || rupees === '') return 0;
  const parsed = parseDecimal(typeof rupees === 'number' ? String(rupees) : rupees);
  if (!parsed) return 0;
  const [value, scale] = parsed;
  return divRound(value * 100n, scale);
}

/** Paise back to rupees, only for display or sending to the API. */
export function fromPaise(p: number): number {
  assertWhole(p);
  return p / 100;
}

/** Exact sum of paise amounts; throws if a float slips in. */
export function addP(...p: number[]): number {
  return p.reduce((sum, x) => {
    assertWhole(x);
    return sum + x;
  }, 0);
}

/** amount × ratePercent% × num/den as an exact fraction [numerator, denominator] in paise. */
const rateParts = (p: number, ratePercent: number, num: number, den: number): [bigint, bigint] => {
  assertWhole(p);
  const rate = parseDecimal(String(ratePercent));
  if (!rate || !Number.isInteger(num) || !Number.isInteger(den) || den === 0) throw new Error('Invalid rate or period');
  const [r, scale] = rate;
  return [BigInt(p) * r * BigInt(num), 100n * scale * BigInt(den)];
};

/** amount × ratePercent% × num/den, rounded to the paisa (e.g. 14 days of 9.99% p.a.: num 14, den 365). */
export function mulRateP(p: number, ratePercent: number, num = 1, den = 1): number {
  const [top, bottom] = rateParts(p, ratePercent, num, den);
  return divRound(top, bottom);
}

/**
 * amount × ratePercent% × num/den rounded once, straight to whole rupees (returned in paise).
 * Use for statement-style figures (EMI interest, charges): rounding to paise first and then to rupees
 * double-rounds (7,059.495 → 7,059.50 → 7,060 instead of the bank's 7,059).
 */
export function mulRateRupeeP(p: number, ratePercent: number, num = 1, den = 1): number {
  const [top, bottom] = rateParts(p, ratePercent, num, den);
  return divRound(top, bottom * 100n) * 100;
}

/** Rounds paise to whole rupees (half-up, away from zero), the way bank statements round EMIs and interest. */
export function roundRupeeP(p: number): number {
  assertWhole(p);
  return divRound(BigInt(p), 100n) * 100;
}

const grouping = (decimals: 0 | 2) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** ₹ with Indian grouping. Whole rupees by default (rounded half-up); decimals: 2 shows paise. */
export function formatINR(p: number, opts: { decimals?: 0 | 2 } = {}): string {
  assertWhole(p);
  const decimals = opts.decimals ?? 0;
  const shown = decimals === 0 ? roundRupeeP(p) : p;
  const sign = shown < 0 ? '-' : '';
  return `${sign}₹${grouping(decimals).format(Math.abs(shown) / 100)}`;
}
