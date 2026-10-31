/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Read from disk: Vitest replaces CSS imports with an empty string.
const css = readFileSync(resolve(__dirname, '../styles/royal.css'), 'utf8');

// Sprint 4 (S4-02): the Royal skin defines its colours for light and dark, scoped so other skins stay untouched.
describe('Royal skin tokens', () => {
  const block = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    expect(start, `${selector} block`).toBeGreaterThanOrEqual(0);
    return css.slice(start, css.indexOf('}', start));
  };

  it.each(['html.skin-royal', 'html.skin-royal.dark'])('%s defines the base colours and the brand gradient', (sel) => {
    const b = block(sel);
    for (const token of ['--background', '--foreground', '--card', '--primary', '--muted-foreground', '--border', '--rg-grad']) {
      expect(b).toContain(`${token}:`);
    }
  });

  it('uses royal blue, purple and magenta in the gradient', () => {
    const grad = block('html.skin-royal');
    expect(grad).toMatch(/#2F4BFF/i);
    expect(grad).toMatch(/#7C3AED/i);
    expect(grad).toMatch(/#E0218A/i);
  });

  it('scopes every rule to the royal skin', () => {
    const selectors = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/^[^@\s{}][^{}]*(?=\{)/gm) || [];
    const unscoped = selectors.map((s: string) => s.trim()).filter((s: string) => s && !/^(from|to|\d+%)$/.test(s) && !s.split(',').every((p: string) => p.trim().startsWith('html.skin-royal')));
    expect(unscoped).toEqual([]);
  });
});
