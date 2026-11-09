import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/styles/liquid-glass.css'), 'utf8');

// Sprint 8 · S8-2: Apple-style Liquid Glass. The skin stays fully scoped (D-12: Classic and Royal unchanged),
// motion is spring-like and press feedback is instant, and it honours reduced motion, transparency and contrast.
const clean = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]+;/g, '');
const selectors = [...clean.matchAll(/([^{}]+)\{/g)]
  .map((m) => m[1].trim())
  .filter((s) => !s.startsWith('@') && !/^(from|to|\d+%)(\s*,\s*(from|to|\d+%))*$/.test(s));

const block = (query: string) => {
  const i = clean.indexOf(query);
  if (i < 0) return '';
  let depth = 0, j = clean.indexOf('{', i);
  const start = j;
  for (; j < clean.length; j++) {
    if (clean[j] === '{') depth++;
    if (clean[j] === '}' && --depth === 0) break;
  }
  return clean.slice(start, j);
};

describe('Liquid Glass skin', () => {
  it('scopes every rule under html.skin-liquid', () => {
    const loose = selectors.flatMap((s) => s.split(',').map((p) => p.trim())).filter((p) => !p.startsWith('html.skin-liquid'));
    expect(loose).toEqual([]);
  });

  it('defines spring easings and uses them for surfaces and presses', () => {
    expect(clean).toMatch(/--lg-spring:\s*linear\(/);
    expect(clean).toMatch(/--lg-spring-bounce:\s*linear\(/);
    expect(clean).toMatch(/var\(--lg-spring\)/);
  });

  it('gives instant press feedback on buttons', () => {
    expect(clean).toMatch(/html\.skin-liquid button:active[^{]*\{[^}]*scale\(0\.9\d\)/);
  });

  it('materialises sheets and popovers (blur + scale), anchored to their trigger', () => {
    expect(clean).toMatch(/@keyframes lg-materialize/);
    expect(block('@keyframes lg-materialize')).toMatch(/blur\(/);
    expect(block('@keyframes lg-materialize')).toMatch(/scale\(/);
  });

  it('never animates layout properties or uses transition: all', () => {
    expect(clean).not.toMatch(/transition:\s*all/);
    for (const m of clean.matchAll(/@keyframes [\w-]+\s*\{([\s\S]*?\}\s*)\}/g)) {
      const props = [...m[1].matchAll(/([a-z-]+)\s*:/g)].map((p) => p[1]);
      expect(props.every((p) => ['transform', 'opacity', 'filter', 'backdrop-filter', '-webkit-backdrop-filter'].includes(p))).toBe(true);
    }
  });

  it('cross-fades instead of moving when reduced motion is on', () => {
    const reduce = block('@media (prefers-reduced-motion: reduce)');
    expect(reduce).toMatch(/animation:\s*none/);
    expect(reduce).toMatch(/transition-property:\s*opacity/);
  });

  it('turns glass solid for reduced transparency and adds borders for more contrast', () => {
    const solid = block('@media (prefers-reduced-transparency: reduce)');
    expect(solid).toMatch(/backdrop-filter:\s*none/);
    const contrast = block('@media (prefers-contrast: more)');
    expect(contrast).toMatch(/border/);
  });

  it('tracks type by size: tight display headings, body near zero', () => {
    expect(clean).toMatch(/html\.skin-liquid h1[^{]*\{[^}]*letter-spacing:\s*-0\.0[23]em/);
    expect(clean).toMatch(/html\.skin-liquid body\s*\{[^}]*letter-spacing:\s*0(\.\d+em)?;/);
  });
});
