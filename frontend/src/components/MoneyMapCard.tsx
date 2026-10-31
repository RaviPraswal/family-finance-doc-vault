import { useMemo } from 'react';
import { layoutMoneyMap, type MapHolding, type MapMember } from '../lib/moneyMap';

interface Props {
  familyName: string;
  members: MapMember[];
  holdings: MapHolding[];
}

const KIND_STYLE: Record<string, { bg: string; fg: string; size: number }> = {
  family: { bg: 'linear-gradient(135deg,#2F4BFF,#7C3AED 55%,#E0218A)', fg: '#fff', size: 52 },
  member: { bg: 'rgba(255,255,255,.94)', fg: '#3B2BC4', size: 40 },
  account: { bg: '#7FA2FF', fg: '#0B1240', size: 28 },
  investment: { bg: '#7FA2FF', fg: '#0B1240', size: 28 },
  loan: { bg: '#FF6FB8', fg: '#3A0624', size: 28 },
  card: { bg: '#FF6FB8', fg: '#3A0624', size: 28 },
  chit: { bg: '#C9B6FF', fg: '#2A1A78', size: 28 },
};

/** "Who holds what": the family in the middle, each member, and the accounts, loans and investments they hold. */
export default function MoneyMapCard({ familyName, members, holdings }: Props) {
  const map = useMemo(() => layoutMoneyMap(familyName, members, holdings), [familyName, members, holdings]);
  const at = new Map(map.nodes.map((n) => [n.id, n]));
  const counts = {
    accounts: holdings.filter((h) => h.kind === 'account').length,
    loans: holdings.filter((h) => h.kind === 'loan' || h.kind === 'card').length,
    investments: holdings.filter((h) => h.kind === 'investment' || h.kind === 'chit').length,
  };

  return (
    <section className="rg-hero rounded-2xl border p-5 text-white bg-gradient-to-br from-blue-600 via-violet-600 to-fuchsia-600 flex flex-col gap-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-pink-100">● LIVE MONEY MAP</p>
          <h2 className="text-xl font-bold mt-1">Who holds what</h2>
          <p className="text-xs text-white/80 mt-0.5">Family in the middle; each member's accounts, loans and investments around them</p>
        </div>
      </div>
      <div
        role="img"
        aria-label={`Who holds what: ${members.length} members, ${holdings.length} accounts, loans and investments`}
        className="relative h-72 rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,.10)' }}
      >
        <svg aria-hidden="true" className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {map.links.map((l) => {
            const a = at.get(l.from);
            const b = at.get(l.to);
            if (!a || !b) return null;
            return <line key={`${l.from}-${l.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(255,255,255,.38)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        {map.nodes.map((n) => {
          const s = KIND_STYLE[n.kind] ?? KIND_STYLE.account;
          return (
            <div key={n.id} className="absolute flex flex-col items-center gap-1" style={{ left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%, -50%)' }}>
              <span
                className="rounded-full flex items-center justify-center text-[11px] font-extrabold"
                style={{
                  width: s.size, height: s.size, background: s.bg, color: s.fg, border: '2px solid rgba(255,255,255,.9)',
                  boxShadow: n.kind === 'family' ? '0 0 0 7px rgba(255,255,255,.16), 0 0 34px rgba(255,111,184,.65)' : undefined,
                }}
              >
                {n.code}
              </span>
              <span className="text-[11px] font-semibold whitespace-nowrap text-white/95">{n.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-5 text-xs text-white/80">
        <span>Members <strong className="text-white">{members.length}</strong></span>
        <span>Accounts <strong className="text-white">{counts.accounts}</strong></span>
        <span>Loans and cards <strong className="text-white">{counts.loans}</strong></span>
        <span>Investments <strong className="text-white">{counts.investments}</strong></span>
      </div>
    </section>
  );
}
