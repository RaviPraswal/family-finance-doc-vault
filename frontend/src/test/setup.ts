import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// glisse (Liquid Glass controls) uses browser APIs jsdom lacks.
window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as unknown as typeof window.matchMedia;
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.setPointerCapture ??= function () {};
Element.prototype.releasePointerCapture ??= function () {};
Element.prototype.hasPointerCapture ??= () => false;
// glisse's Menu hit-tests the pointer with elementFromPoint (not in jsdom): answer with the element the
// latest pointer event hit, which is what a browser would return at that point.
let lastPointerTarget: Element | null = null;
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'click'] as const) {
  document.addEventListener(type, (e) => { lastPointerTarget = e.target as Element; }, true);
}
document.elementFromPoint ??= () => lastPointerTarget;
