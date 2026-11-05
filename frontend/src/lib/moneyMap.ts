/**
 * Layout for the "Who holds what" family money map (Sprint 4).
 * Positions are percentages of the card, so the map scales with its container.
 */

export interface MapMember { id: string; name?: string }
export interface MapHolding { id: string; userId?: string; label: string; kind: 'account' | 'loan' | 'investment' | 'card' | 'chit' }
export interface MapNode { id: string; code: string; label: string; x: number; y: number; kind: 'family' | 'member' | MapHolding['kind'] }
export interface MapLink { from: string; to: string }

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number) => Math.round(v * 10) / 10;
const GROUP_AFTER = 4;
const KIND_ORDER: MapHolding['kind'][] = ['account', 'loan', 'card', 'investment', 'chit'];
const KIND_LABEL: Record<MapHolding['kind'], string> = { account: 'Accounts', loan: 'Loans', card: 'Cards', investment: 'Investments', chit: 'Chits' };
const short = (label: string) => (label.length > 16 ? label.slice(0, 15).trimEnd() + '…' : label);

/** Family in the centre, members on an inner ring, each member's holdings fanned out behind them. */
export function layoutMoneyMap(familyName: string, members: MapMember[], holdings: MapHolding[]): { nodes: MapNode[]; links: MapLink[] } {
  const nodes: MapNode[] = [{ id: 'family', code: initials(familyName), label: 'Family', x: 50, y: 50, kind: 'family' }];
  const links: MapLink[] = [];
  const memberIds = new Set(members.map((m) => m.id));
  const angleOf = new Map<string, number>();

  members.forEach((m, i) => {
    // Start top-left and go round, so two members sit left and right like the design.
    const angle = Math.PI * 1.25 + (i * 2 * Math.PI) / Math.max(members.length, 1);
    angleOf.set(m.id, angle);
    nodes.push({
      id: m.id, code: initials(m.name || '?'), label: (m.name || 'Member').split(' ')[0], kind: 'member',
      x: round(clamp(50 + Math.cos(angle) * 27, 6, 94)), y: round(clamp(50 + Math.sin(angle) * 30, 8, 92)),
    });
    links.push({ from: 'family', to: m.id });
  });

  const byOwner = new Map<string, MapHolding[]>();
  for (const h of holdings) {
    const owner = h.userId && memberIds.has(h.userId) ? h.userId : 'family';
    byOwner.set(owner, [...(byOwner.get(owner) || []), h]);
  }

  // Sprint 6 (S6-02): an owner with more than a handful of holdings gets one node per type, with the count,
  // so the map stays readable however much a member holds.
  const satellites = new Map<string, MapNode[]>();
  for (const [owner, list] of byOwner) {
    if (list.length <= GROUP_AFTER) {
      satellites.set(owner, list.map((h) => ({ id: h.id, code: initials(h.label), label: short(h.label), kind: h.kind, x: 0, y: 0 })));
    } else {
      const kinds = KIND_ORDER.filter((k) => list.some((h) => h.kind === k));
      satellites.set(owner, kinds.map((k) => ({
        id: `${owner}:${k}`, code: String(list.filter((h) => h.kind === k).length), label: KIND_LABEL[k], kind: k, x: 0, y: 0,
      })));
    }
  }

  for (const [owner, sats] of satellites) {
    const base = owner === 'family' ? Math.PI / 2 : angleOf.get(owner) ?? 0;
    const cx = owner === 'family' ? 50 : 50 + Math.cos(base) * 27;
    const cy = owner === 'family' ? 50 : 50 + Math.sin(base) * 30;
    // Fan out away from the family, wider for more nodes, so neighbours stay well apart.
    const spread = Math.min(2.4, 0.75 * Math.max(sats.length - 1, 1));
    sats.forEach((n, i) => {
      const a = base + (sats.length === 1 ? 0 : -spread / 2 + (i * spread) / (sats.length - 1));
      nodes.push({ ...n, x: round(clamp(cx + Math.cos(a) * 21, 6, 94)), y: round(clamp(cy + Math.sin(a) * 25, 8, 92)) });
      links.push({ from: owner, to: n.id });
    });
  }
  return { nodes, links };
}
