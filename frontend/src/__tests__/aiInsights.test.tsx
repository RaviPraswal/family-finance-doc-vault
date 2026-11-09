import { describe, it, expect } from 'vitest';
import { readInsights } from '../lib/aiInsights';

// Sprint 7 T9 (D-10): the advisor answers { available, message, recommendations }; the screens never break.
describe('AI insights response', () => {
  it('reads an available answer', () => {
    const r = readInsights({ available: true, message: null, recommendations: [{ title: 'Move ₹5k', description: 'x', type: 'REALLOCATION' }] });
    expect(r).toMatchObject({ available: true, note: null });
    expect(r.recommendations).toHaveLength(1);
  });
  it('shows the server note when the AI is unavailable', () => {
    expect(readInsights({ available: false, message: 'Insights unavailable today', recommendations: [] }))
      .toEqual({ available: false, note: 'Insights unavailable today', recommendations: [] });
  });
  it('treats a failed or timed-out call as unavailable', () => {
    expect(readInsights(undefined)).toEqual({ available: false, note: 'Insights unavailable today', recommendations: [] });
  });
  it('still accepts the old list-only answer', () => {
    expect(readInsights([{ title: 'a', description: 'b', type: 'WARNING' }]).recommendations).toHaveLength(1);
  });
});
