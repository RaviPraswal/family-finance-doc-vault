import { describe, it, expect } from 'vitest';
import { layoutMoneyMap } from '../lib/moneyMap';

// Sprint 4 (S4-06): the "Who holds what" family money map.
describe('money map layout', () => {
  const members = [{ id: 'u1', name: 'Ravi Kumar' }, { id: 'u2', name: 'Priya' }];
  const holdings = [
    { id: 'a1', userId: 'u1', label: 'SBI', kind: 'account' as const },
    { id: 'l1', userId: 'u1', label: 'Home loan', kind: 'loan' as const },
    { id: 'i1', userId: 'u2', label: 'Mutual funds', kind: 'investment' as const },
    { id: 'x1', userId: 'someone-gone', label: 'Old FD', kind: 'investment' as const },
  ];
  const map = layoutMoneyMap('Kumar Family', members, holdings);

  it('puts the family in the middle with initials', () => {
    expect(map.nodes[0]).toMatchObject({ id: 'family', x: 50, y: 50, code: 'KF' });
  });

  it('links every member to the family and every holding to its owner', () => {
    expect(map.links).toContainEqual({ from: 'family', to: 'u1' });
    expect(map.links).toContainEqual({ from: 'family', to: 'u2' });
    expect(map.links).toContainEqual({ from: 'u1', to: 'a1' });
    expect(map.links).toContainEqual({ from: 'u2', to: 'i1' });
  });

  it('attaches holdings of an unknown owner to the family', () => {
    expect(map.links).toContainEqual({ from: 'family', to: 'x1' });
  });

  it('keeps every node inside the card', () => {
    for (const n of map.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(6);
      expect(n.x).toBeLessThanOrEqual(94);
      expect(n.y).toBeGreaterThanOrEqual(8);
      expect(n.y).toBeLessThanOrEqual(92);
    }
  });

  it('member codes are initials', () => {
    expect(map.nodes.find((n) => n.id === 'u1')?.code).toBe('RK');
    expect(map.nodes.find((n) => n.id === 'u2')?.code).toBe('PR');
  });

  it('spaces a member\'s holdings so labels do not collide, and shortens long names', () => {
    const many = layoutMoneyMap('Kumar Family', members, [
      { id: 'h1', userId: 'u2', label: 'HDFC', kind: 'account' },
      { id: 'h2', userId: 'u2', label: 'Parag Parikh Flexi Cap Fund', kind: 'investment' },
      { id: 'h3', userId: 'u2', label: 'HDFC card', kind: 'card' },
    ]);
    const pts = many.nodes.filter((n) => n.id.startsWith('h'));
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThanOrEqual(14);
      }
    }
    expect(pts.find((n) => n.id === 'h2')?.label.length).toBeLessThanOrEqual(16);
  });
});
