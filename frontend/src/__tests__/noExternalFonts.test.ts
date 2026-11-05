/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Sprint 5: every look loads its fonts from the app itself, never from Google Fonts.
describe('fonts', () => {
  it('no stylesheet imports fonts from the internet', () => {
    const dir = resolve(__dirname, '../styles');
    const offenders = readdirSync(dir).filter((f) => f.endsWith('.css'))
      .concat(['../index.css'])
      .filter((f) => /fonts\.googleapis|fonts\.gstatic/.test(readFileSync(resolve(dir, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
