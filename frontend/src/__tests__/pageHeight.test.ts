/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Sprint 6 (S6-05): a page locked to the window height squeezes its list (flex-1 min-h-0) to nothing as soon as
// anything else is on the page. Pages grow with their content and the main area scrolls instead, in every look.
describe('page height', () => {
  const dir = resolve(__dirname, '../pages');
  const pages = readdirSync(dir).filter((f) => f.endsWith('.tsx'));

  it.each(pages)('%s is not locked to the window height and has no scroll area of its own', (file) => {
    const src = readFileSync(resolve(dir, file), 'utf8');
    expect(src).not.toMatch(/className="h-full flex flex-col/);
    expect(src).not.toMatch(/className="min-h-full flex flex-col[^"]*overflow-y-auto/);
  });
});
