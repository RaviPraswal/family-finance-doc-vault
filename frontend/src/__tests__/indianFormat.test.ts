import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Sprint 8 fix: amounts must use Indian grouping (₹3,00,000), never the browser default (₹300,000 on en-US).
describe('Indian number format', () => {
  it('no page or component formats numbers or dates without the Indian locale', () => {
    const offenders: string[] = [];
    for (const dir of ['src/pages', 'src/components']) {
      for (const f of readdirSync(resolve(process.cwd(), dir))) {
        if (!f.endsWith('.tsx') && !f.endsWith('.ts')) continue;
        const text = readFileSync(resolve(process.cwd(), dir, f), 'utf8');
        const n = (text.match(/toLocale(Date|Time)?String\((\)|undefined|'en-US')/g) ?? []).length;
        if (n) offenders.push(`${dir}/${f}: ${n}`);
      }
    }
    expect(offenders).toEqual([]);
  });
  it('en-IN groups lakhs and crores', () => {
    expect((300000).toLocaleString('en-IN')).toBe('3,00,000');
    expect((14420220).toLocaleString('en-IN')).toBe('1,44,20,220');
  });
});
