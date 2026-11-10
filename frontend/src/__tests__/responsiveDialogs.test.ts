import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const index = read('src/index.css');
const liquid = read('src/styles/liquid-glass.css');

// Ravi, 2026-11-10: on a phone a form dialog ran off the top of the screen (title unreachable) and the page
// showed through its fields.
describe('Dialogs on phones and short windows', () => {
  it('every dialog fits the window and scrolls inside, in every look', () => {
    expect(index).toMatch(/\.fixed\.inset-0 > \[role='dialog'\][^{]*\{\s*max-height: calc\(100dvh/);
    expect(index).toMatch(/overflow-y: auto;\s*overscroll-behavior: contain;/);
  });

  it('Liquid Glass form sheets are near-solid so nothing shows through the fields', () => {
    const alpha = [...liquid.matchAll(/--fn-tint-strong: rgba\([^)]*,\s*([\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(alpha.length).toBe(2);
    alpha.forEach((a) => expect(a).toBeGreaterThanOrEqual(0.92));
  });

  it('no page hides row actions behind hover (phones cannot hover)', () => {
    const dir = resolve(process.cwd(), 'src/pages');
    const offenders = readdirSync(dir).filter((f) => /opacity-0 group-hover:opacity-100/.test(read(`src/pages/${f}`)));
    expect(offenders).toEqual([]);
  });
});
