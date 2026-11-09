# FinNest — P0 Spec (Sprint 7)

Scope source: the open items agreed in the Sprint 3–6 conversations (code review, architecture review, ADR-001, AI quota failure). Nothing new is added here.

## Problem
FinNest now shows the right screens, but three things still make it untrustworthy as the family's money record: stored totals (bank balances, loan outstanding, deposits) can drift from the ledger; the login token and the data sent to the AI are not well protected; and nothing stops a broken build from shipping. The free AI quota also fails loudly (5 retries, error walls in the log).

## Users
| User | Role | Needs |
|---|---|---|
| Family owner (Ravi) | `OWNER` | Numbers he can trust without checking the spreadsheet; private data stays private. |
| Family member | `MEMBER` | Sees and edits only their own records; same accuracy. |

## Goals
1. Every balance and outstanding figure equals what the ledger says — zero drift, checked by tests.
2. No money arithmetic runs on floating point on the client.
3. A stolen page script cannot read the login token.
4. The AI can be unavailable without breaking any screen or flooding the log.
5. No change reaches `develop` without lint, typecheck, tests and audit passing.

## P0 requirements

**P0-1 Ledger-derived totals (ADR-001 step 2)**
- Bank balance = opening balance + credits − debits from the ledger; loan outstanding = principal − principal portions paid; deposit total = sum of linked deposits.
- No code path sets these totals directly anymore (today: 19 setters across 4 classes).
- A one-off check reports any existing row whose stored total differs from the ledger.
- *Accept:* Given a family with entries, when totals are read, then each equals the ledger sum to the paisa; editing or deleting an entry updates the total.

**P0-2 Exact money on the client**
- Money maths in `frontend/src/lib` uses integer paise; formatting converts at the edge.
- *Accept:* ₹0.10 + ₹0.20 = ₹0.30 in every helper; schedules still match the IndusInd statement to the rupee.

**P0-3 Token in an httpOnly cookie**
- Login sets a `Secure; HttpOnly; SameSite=Strict` cookie; the SPA no longer stores the token; CSRF protection on state-changing calls; logout clears the cookie.
- *Accept:* `localStorage` holds no token; API calls without the cookie return 401; session-expiry modal still works.

**P0-4 AI that fails quietly and shares less**
- On quota/429 or outage: no retry storm (max 1 retry, honour retry-after), the screen shows "Insights unavailable today", the rest of the cockpit loads.
- Data sent to Gemini is minimised: no account/card numbers, names reduced to roles, amounts rounded.
- *Accept:* with the AI stubbed to 429, the cockpit renders and the log has one warning, not a stack trace per retry.

**P0-5 List endpoints without N+1 queries**
- Loans, chits, expenses, bank accounts list endpoints load related rows in one query and filter in SQL, not in memory.
- *Accept:* query count per list request is constant as rows grow (asserted in tests).

**P0-6 CI gate + dependency fixes**
- GitHub Actions on every push/PR: frontend lint, typecheck, tests, build, `npm audit --audit-level=high`; backend `mvn verify` (Testcontainers).
- Fix the 3 high npm advisories (react-router, zod).
- *Accept:* a failing test blocks the PR; audit is clean at high.

## Out of scope (this sprint)
- New features or screens (imports from bank statements, OTP/2FA, Classic-look density) — parked.
- Full double-entry accounting rewrite — ADR-001 keeps the single ledger (see DECISIONS.md, D-03).
- Production repo rollout — repo is not accessible here; Ravi deploys.
- Data entry in Ravi's database (IndusInd/Sukanya fix script, chits, test-loan cleanup) — owner tasks.

## Success measures
- Drift check: 0 mismatched rows after migration.
- CI: 100% of PRs to `develop` run the gate; 0 high advisories.
- AI outage day: 0 broken screens, ≤1 log line per failed call.

## Open questions
- **Ravi:** confirm D-03 (keep single ledger with derived totals, not full double-entry) and D-04 (server stays `NUMERIC(…,2)`/BigDecimal; integer paise on the client). Blocking for P0-1/P0-2.
