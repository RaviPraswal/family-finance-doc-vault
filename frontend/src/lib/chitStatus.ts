/** Sprint 8 fix: a chit is active until it is marked closed. Allotment (bid won) is a separate fact. */
export type ChitFilter = 'ALL' | 'ACTIVE' | 'CLOSED' | 'ALLOTTED' | 'AWAITING';
interface ChitLike { isAllotted: boolean; isClosed?: boolean | null; closedOn?: string | null }

export function chitCounts(list: ChitLike[]) {
  const closed = list.filter((c) => c.isClosed).length;
  const open = list.filter((c) => !c.isClosed);
  return { active: open.length, closed, allotted: open.filter((c) => c.isAllotted).length, awaiting: open.filter((c) => !c.isAllotted).length };
}

export function matchesChitFilter(c: ChitLike, filter: string): boolean {
  switch (filter) {
    case 'ACTIVE': return !c.isClosed;
    case 'CLOSED': return !!c.isClosed;
    case 'ALLOTTED': return !c.isClosed && c.isAllotted;
    case 'AWAITING': return !c.isClosed && !c.isAllotted;
    default: return true;
  }
}

const date = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function chitStatusLabel(c: ChitLike): string {
  if (c.isClosed) return c.closedOn ? `Closed on ${date(c.closedOn)}` : 'Closed';
  return c.isAllotted ? 'Active · allotted' : 'Active · awaiting bidding';
}
