# Sprint 7 — P0: trusted numbers, safer sessions, CI

> Execution: native, one task at a time (Ravi's build loop: UI skills → TDD → debug → code-review → verification → 3-line update → ask before next).

**Goal:** Every total equals the ledger, money maths is exact, the token and AI data are protected, and nothing merges without the CI gate.
**Architecture:** Keep the monolith and ADR-001 ledger (D-03). Totals become read-time derivations from `expenses`; client money moves to integer paise (D-04); auth moves to an HttpOnly cookie + CSRF (D-07).
**Spec:** `SPEC.md` · **Guide:** `CLAUDE.md` · **Decisions:** `DECISIONS.md` · **Risks:** `docs/RISKS.md` · **Tests:** `docs/TESTING.md`
**Capacity:** ~10 working days, planned to ~8 (80%). Branch per task off `develop`.

## Global constraints
- TDD; money never in JS floats; server `BigDecimal`; rates in percent.
- Every route: auth, tenant/ownership check, server-side validation, parameterised queries; no secrets in code.
- New schema only via `V5+` migrations. Never commit workbook/statement/private data. Push only on Ravi's go.

## Review focus (not covered elsewhere — tests added to the owning task)
1. Deleting or editing a ledger entry must move the derived total back (T4, T5).
2. Entries dated before an account's opening-balance date must not double-count (T4).
3. A MEMBER calling the drift report or another member's totals gets 403 (T3).
4. Images/PDF downloads (`AuthImage`, previews) must still load after the cookie switch (T8).
5. Session-expiry modal must still know the expiry time without reading the token (T7 `/api/auth/session`, T8).

## Tasks

| # | Task | Est. | Depends on | Status |
|---|---|---|---|---|
| T1 | CI gate + dependency fixes | 1d | — | ✅ CI green on GitHub |
| T2 | Paise helpers + schedule libs | 1d | D-04 approved | ☐ |
| T3 | Ledger drift report (read-only) | 0.5d | D-03 approved | ☐ |
| T4 | Bank balance derived from ledger | 1d | T3 | ☐ |
| T5 | Loan outstanding + deposit total derived | 1d | T3 | ☐ |
| T6 | Paise in cockpit, alerts, net worth, pages | 1d | T2 | ☐ |
| T7 | Auth cookie + CSRF (backend, header still accepted) | 1d | T1 | ☐ |
| T8 | Frontend on cookie; drop localStorage + header path | 0.5d | T7 | ☐ |
| T9 | AI fails quietly + minimised payload | 1d | T1 | ☐ |
| T10 | N+1 / in-memory filtering fixes | 1d | T1 | ☐ |

### T1 — CI gate + dependency fixes
**Files:** create `.github/workflows/ci.yml`; modify `frontend/package.json`, `frontend/package-lock.json`.
**Do:** jobs `frontend` (`npm ci`, lint, `tsc --noEmit -p .`, test, build, `npm audit --omit=dev --audit-level=high`), `backend` (`./mvnw -B verify`), `hygiene` (fail if `git ls-files` matches `\.xlsx$|sbi_investments|private-data/|application-secrets\.yml`). Bump react-router ≥7.18.2 and zod ≥4.6.6.
**Accept:** audit reports 0 high; all frontend checks green locally; workflow YAML valid (`actionlint` or dry parse); a deliberately failing test makes the job red.

### T2 — Paise helpers + schedule libs
**Files:** create `frontend/src/lib/money.ts`; modify `lib/loanSchedule.ts`, `lib/chitSchedule.ts`, `lib/ssySchedule.ts`; test `__tests__/money.test.ts` (+ existing schedule tests unchanged).
**Interfaces (produces):** `toPaise(rupees: number | string): number` (round half-up), `fromPaise(p: number): number`, `addP(...p: number[]): number`, `mulRateP(p: number, ratePercent: number, num?: number, den?: number): number` (rounded to paise), `formatINR(p: number, opts?: { decimals?: 0|2 }): string`.
**Accept:** `addP(toPaise(0.1), toPaise(0.2)) === 30`; `formatINR(1442022_00) === '₹14,42,022'`; IndusInd 60-row schedule still 0 mismatches; all 102 existing tests pass.

### T3 — Ledger drift report
**Files:** create `backend/.../expense/LedgerTotals.java` (pure sums), `expense/LedgerDriftController.java`; test `Sprint7LedgerDriftTest.java`.
**Interfaces (produces):** `LedgerTotals.bankBalance(UUID accountId): BigDecimal`, `.loanOutstanding(UUID loanId): BigDecimal`, `.depositTotal(UUID depositId): BigDecimal` — each one SQL `SUM` with tenant filter. `GET /api/ledger/drift` → `[{entity, id, name, stored, ledger, difference}]`, OWNER only.
**Accept:** seeded mismatch is listed with the exact difference; matching rows are not; MEMBER → 403; other family's rows never appear.

### T4 — Bank balance derived from ledger
**Files:** modify `portfolio/BankAccount.java`, `portfolio/BankAccountController.java`, `transaction/BankTransactionService.java`, `expense/ExpenseController.java`; test `Sprint7DerivedBalanceTest.java`.
**Do:** `currentBalance` returned = opening + credits − debits via `LedgerTotals`; remove every `setCurrentBalance` write path; column kept for now (read-only, filled by a V5 backfill for reports).
**Accept:** create/edit/delete/reverse an entry → balance follows to the paisa; review-focus 1–2 pass; `grep setCurrentBalance` finds only the backfill.

### T5 — Loan outstanding + deposit total derived
**Files:** modify `portfolio/Loan.java`, `portfolio/Deposit.java`, `expense/ExpenseController.java`, `portfolio/LoanEventListener.java`, `portfolio/DepositEventListener.java`; test `Sprint7DerivedLoanDepositTest.java`.
**Do:** outstanding = principal − Σ `loan_principal_portion`; deposit total = Σ linked entries; remove direct setters.
**Accept:** paying 3 IndusInd-style EMIs drops outstanding by exactly their principal portions; deleting one restores it; drift report shows 0 for these.

### T6 — Paise in cockpit, alerts, net worth, pages
**Files:** modify `lib/cockpit.ts`, `lib/alerts.ts`, `lib/netWorth.ts`, `lib/moneyMap.ts`, `components/*ScheduleTable.tsx`, `pages/PortfolioOverview.tsx` (format calls only).
**Accept:** no `+`/`-`/`*` on rupee floats left in `lib/` (grep test); cockpit totals equal the sum of their parts in a 3-decimal edge case; existing page tests pass.

### T7 — Auth cookie + CSRF (backend)
**Files:** modify `auth/AuthController.java`, `auth/JwtAuthenticationFilter.java`, `auth/SecurityConfig.java`; test `Sprint7CookieAuthTest.java`.
**Interfaces (produces):** login/refresh set `FINNEST_SESSION` (`HttpOnly; Secure; SameSite=Strict; Path=/`); CSRF via `CookieCsrfTokenRepository` (`XSRF-TOKEN` cookie → `X-XSRF-TOKEN` header); `GET /api/auth/session` → `{name, email, role, expiresAt}`; `POST /api/auth/logout` clears cookies. Bearer header still accepted (removed in T8).
**Accept:** cookie flags asserted; POST without CSRF → 403; with → 200; logout → next call 401; login rate limit unchanged.

### T8 — Frontend on cookie
**Files:** modify `api/client.ts`, `store/authStore.ts`, `components/SessionExpiryModal.tsx`, `components/AuthImage.tsx`; backend `JwtAuthenticationFilter.java` (drop header); tests `__tests__/authCookie.test.ts`.
**Accept:** `localStorage` never written with a token; requests use `credentials: 'include'` + CSRF header; expiry modal uses `/api/auth/session`; review-focus 4–5 pass.

### T9 — AI fails quietly, shares less
**Files:** modify `application.yml` (`spring.ai.retry.max-attempts: 2`, backoff honours retry-after), `ai/FinancialAdvisorService.java`, `ai/AdvisorController.java`; create `ai/AiPayloadMinimizer.java`; frontend cockpit AI card; tests `Sprint7AiResilienceTest.java`, `__tests__/aiUnavailable.test.tsx`.
**Accept:** stubbed 429 → HTTP 200 `{available:false, message:"Insights unavailable today"}` and one WARN log line; cockpit renders with the note; captured prompt has no digits runs ≥4, no member names, amounts rounded to ₹1,000.

### T10 — N+1 / in-memory filtering
**Files:** repositories for loans, chits, expenses, bank accounts (`@EntityGraph`/fetch joins, filtered `@Query`); `commitment/CommitmentController.java:79`, `transaction/TransactionController.java:55`; test `Sprint7QueryCountTest.java` (Hibernate `Statistics`).
**Accept:** each list endpoint runs the same query count for 1 and 50 rows; filters move to SQL with bound parameters; responses unchanged (snapshot).

## Definition of done (every task)
Failing test first → green · `code-review` passed (validation, auth per route, no secrets, parameterised SQL) · frontend tests/tsc/build green · backend suite green (Windows run until CI) · SPRINT.md status ticked · 3-line update to Ravi.

## Carry-over / parked
OTP/2FA, bank-statement import, Classic density, production rollout — next sprint candidates (Step 3 review decides).
