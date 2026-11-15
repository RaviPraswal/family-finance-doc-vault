# Sprint 9 — Simple money

**Why.** Ravi (2026-11-10): income, investments and expenses are split across too many sections and options; a beginner
cannot tell where an item belongs. Approved plan: four top-level categories, at most seven plain sub-categories each,
one way to add an entry.

## The model (`frontend/src/lib/simpleMoney.ts`)
| Category | Meaning | Sub-categories |
|---|---|---|
| Money In | what you earn | Salary · Side income · Interest & returns · Gifts & other income |
| Money Out | what you spend (gone) | Home & bills · Food & daily needs · Transport & travel · Health & insurance · Education & children · Shopping & fun · Family & giving |
| Savings & Investments | what you own | Bank & cash · Fixed savings · Market investments · Long-term schemes · Gold & property · Chit funds · Money others owe you |
| Debts | what you owe | Home & vehicle loans · Personal & education loans · Credit cards · Chit instalments still to pay · Money you borrowed from people |

Rules that keep it correct (no item in two places):
- **Moving is not spending.** Ledger kinds INVESTMENT, LENDING, TRANSFER and the principal part of LOAN_PAYMENT are
  "moved into savings & debts". Only kind EXPENSE is Money Out; only INCOME is Money In.
- **EMI** = principal (reduces the debt) + interest (a cost, shown as "Loan interest paid"; the server already splits it).
- **Credit card**: the spend is Money Out on the day (entry on the card); paying the bill is a move.
- **Refund** lowers Money Out; it is not income.
- **Chit**: an asset until the payout, a debt (instalments still to pay) after it.
- Old category names map to the new groups by keyword (`spendingGroupOf`); anything unknown is "not sorted yet" — never guessed.

## Approaches considered
1. **Rename and regroup on top of the existing ledger (chosen).** No data migration; old entries are mapped when shown.
   The ledger (D-03) and its `kind` already separate spending from moves, so the four categories are a view of it.
2. Migrate stored categories to the new names — rejected for now: rewrites Ravi's real data (needs his say-so) for no
   gain the mapping does not already give.
3. Double-entry rewrite — rejected: D-03 says no.

## Stage 1 (this change)
- **Home** (`/dashboard`): what you're worth, four cards with sub-category amounts, month switcher, "left over / moved /
  loan interest" strip. The old overview stays at `/dashboard/portfolio` ("Full overview").
- **Add entry** (`components/AddEntry.tsx`): one question — Money in / Money out / Move my money — then amount, date, what,
  which account. Posts normal ledger entries (`POST /api/expenses`) with the right links; no debit/credit or
  "made against" choices. A move between two own bank accounts writes both sides.
- **Menu** grouped: Home · Money In · Money Out · Savings & Investments · Debts · Planning · Papers & family.
  Every existing page keeps exactly one place; no page removed.
- No backend or schema change.

## Stages 2–4
- **All entries** (`/dashboard/expenses`): each row shows Money in / Money out / Moved and its plain group (`placeOf`); the
  filter is All / Money in / Money out / Moved / Not sorted yet. An unsorted row has a "sort into…" picker — the only
  place a stored category changes, and only when the user picks. Adding goes through Add entry; the old detailed form
  is behind "Use the detailed form" and opens for editing.
- **Spending limits**: `SpendingGroup` (server, same rules and test cases as `spendingGroupOf`) groups spending and
  budgets. The seven groups always show; an old-name budget ("Bills") is the limit of its group; "Investments" and
  "Projects" budgets are not spending and drop out of the summary (rows untouched). Saving a limit updates the group's
  budget rather than adding a second.
- **Shortcuts**: Quick Logger templates appear as chips in Add entry and fill the form. The Quick Logger page stays as
  "Entry shortcuts" to manage them.
- **Upcoming payments** (`/dashboard/commitments`): tabs "This month's plan" (Monthly Commitments) and "Scheduled & due"
  (the scheduled-payments ledger); `/dashboard/ledger` redirects to the second tab.
- **Udhaar split**: `PeerLending only="GIVEN|TAKEN"` at `/dashboard/money-owed-to-me` (under Savings & Investments) and
  `/dashboard/money-i-borrowed` (under Debts). `/dashboard/peer-lending` still shows both for old links.
- **Projects** are a label: Add entry → Money out → "Part of a project?" links the spend to the project while it still
  counts in its Money Out group. The Projects page moves under Planning.

## Still open
- A SIP/top-up raises an investment's invested amount but not its current value (Ravi to decide).
- Money coming *back* (udhaar repaid, FD matured, chit payout) is recorded on its own page, not in Add entry.
- Existing pages (Deposits, Loans, …) keep their own add forms for creating the account/loan itself.
