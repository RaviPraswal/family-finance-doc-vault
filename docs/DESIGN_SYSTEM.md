# FinNest design system (reference: Royal skin)

Defined once here; code lives in `frontend/src/styles/royal.css` (tokens), `index.css` (Classic), `liquid-glass.css`. Tailwind classes read the HSL tokens (`bg-primary`, `text-muted-foreground`, …), so components stay skin-agnostic.

## Colour tokens
| Token | Light | Dark | Use |
|---|---|---|---|
| `--primary` | royal blue `#2F4BFF` (231 100% 59%) | `231 100% 68%` | primary actions, links, focus |
| `--accent` | magenta `#E0218A` (327 75% 50%) | `327 100% 65%` | highlights, hero gradient end |
| `--rg-purple` | `#7C3AED` | same | gradient middle, ring |
| `--rg-grad` | `135° #2F4BFF → #7C3AED → #E0218A` | same | hero cards, primary buttons, active nav |
| `--background` | lavender `250 100% 97%` | indigo-black `245 60% 8%` | page ground |
| `--card` / `--rg-glass` | white 62% glass | white 6% glass | surfaces (blur 26px, saturate 170%) |
| `--foreground` | `252 55% 13%` | `253 100% 97%` | text |
| `--muted-foreground` | `249 18% 38%` | `251 38% 78%` | secondary text |
| `--border` | `250 50% 90%` | `248 30% 26%` | dividers |

**Semantic (money states) — use these, nothing else:**
| Meaning | Class |
|---|---|
| Paid / positive / income | `emerald-500` (bg `/15`, text `-700` light, `-300` dark) |
| Overdue / debt / error | `red-500` (same pattern) |
| Due now / warning | `amber-500` (bg `/20`, text `-800` / `-300`) |
| Upcoming / neutral | `bg-muted text-muted-foreground` |
| Info / allotted / projected | `bg-primary/10 text-primary` |

## Typography
| Role | Light | Dark | Size / weight |
|---|---|---|---|
| Display (h1–h3) | Plus Jakarta Sans | Sora | h1 1.45rem/1.2, 700–800, tracking −0.02em |
| Body | Plus Jakarta Sans | Manrope | 0.875rem (text-sm), 400–600 |
| Numbers | Geist Mono | Sora | `tabular-nums`, tracking −0.02em |
| Labels / table heads | body font | body font | 0.625–0.75rem, uppercase, tracking 0.06em |
All fonts bundled via `@fontsource` (D-13).

## Spacing, shape, depth
- Scale (Tailwind): 0.5 / 1 / 1.5 / 2 / 3 / 4 (rem×0.25). Royal density: card padding 1rem, section gap 1rem, table cell 0.5rem × 0.75rem.
- Radius: `--radius` 1.25rem; `rounded-2xl` 24px (cards), `rounded-xl` 18px (inputs, tables), `rounded-full` (chips, pills).
- Elevation: glass card = `inset 0 1px 0 var(--rg-hi), 0 10px 30px var(--rg-shadow)`; hero = `0 18px 40px rgba(124,58,237,.35)`.
- Motion: background glows drift 22–31s; all motion off under `prefers-reduced-motion`. Press feedback ≤100ms.

## Core components
| Component | Where | Rules |
|---|---|---|
| Page shell | `DashboardLayout` | sidebar + main; page roots `min-h-full flex flex-col` (never `h-full`). |
| KPI card | page headers | label (caps, small) + number (mono) + optional trend icon; hero variant `.rg-hero`. |
| Glass card / section | everywhere | `bg-card border rounded-2xl p-4`, `<section aria-labelledby>` with an `h2`. |
| Data table | lists, schedules | `aria-label`, sticky head `bg-muted/50`, numbers right-aligned, status pill in last column. |
| Status pill | schedules, lists | `px-2 py-0.5 rounded-full text-[10px] font-bold` + semantic colour. |
| Summary chips | above tables | `px-3 py-1.5 rounded-full text-xs font-semibold`; first chip = progress ("3 of 60 paid"). |
| Button | forms, headers | primary = `bg-primary` (gradient in Royal); secondary = `border border-border`; destructive = red, confirm via `ConfirmDialog`. |
| Form field | modals | label above, `p-2 rounded-lg bg-background border`, inline validation text. |
| Feedback | app-wide | `ToastContainer` (success/error), `ConfirmDialog`, `SessionExpiryModal`; never `alert()`. |
| Attention memo | cockpit | `NeedsAttention`: one row per alert, link to the fix. |

## Audit (Sprint 0)
- 26 hard-coded hex colours in pages/components → move to tokens when a task touches the file.
- `text-red-500` (112) / `text-green-500` (50) used beside `emerald-*` → standardise on the semantic table above, opportunistically.
- No component library yet; tables/pills/chips repeat inline → extract `StatusPill` and `SummaryChips` only when a P0 task needs them (no big-bang refactor).
