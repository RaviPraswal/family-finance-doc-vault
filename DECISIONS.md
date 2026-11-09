# FinNest — Decisions

One line each. Status: **Accepted** (in force) or **Proposed** (needs Ravi's yes). Change none without asking Ravi.

| # | Decision | Status |
|---|---|---|
| D-01 | Monolith: one Spring Boot JAR serves the API and the built React SPA. | Accepted |
| D-02 | Multi-tenant by `tenant_id` on every row (`TenantBaseEntity`); `TenantGuard` checks ownership on every route; MEMBER sees/edits only own rows. | Accepted |
| D-03 | ADR-001: the `expenses` ledger is the single source of truth; balances/outstanding/deposited are derived from it, never set directly. Single-entry ledger with typed links — **not** a full double-entry rewrite (P0 applies double-entry discipline: every movement posted once against its account, corrections by reversal). | Accepted (approved 2026-11-09) |
| D-04 | Money: server keeps `BigDecimal` / `NUMERIC(38,2)` (already exact, no migration); client money maths uses integer paise via `lib/money.ts`; floats only for rates. | Accepted (approved 2026-11-09) |
| D-05 | Interest rates stored as percent (`9.99` = 9.99%) — Flyway V2. | Accepted |
| D-06 | Schema changes only through Flyway migrations; Hibernate `validate`; never edit an applied migration. | Accepted |
| D-07 | Auth is stateless JWT; P0 moves it from `localStorage` to an `HttpOnly; Secure; SameSite=Strict` cookie with CSRF protection. | Accepted (SPEC P0-3) |
| D-08 | Create requests are sanitised server-side: clients cannot set id, tenant, owner or stored totals. | Accepted |
| D-09 | Account/card numbers are masked in API responses (`MaskedNumberSerializer`). | Accepted |
| D-10 | AI is optional: any AI failure degrades to "unavailable" without breaking a screen; max 1 retry; data sent to the AI is minimised (no numbers, names → roles). | Accepted (SPEC P0-4) |
| D-11 | Loan EMI schedules computed client-side from statement fields (tenure, first EMI, disbursement, method MONTHLY or DAILY_365); without them, project from today's outstanding. | Accepted |
| D-12 | Skins are separate scoped CSS (Classic, Liquid Glass, Royal); new looks never change existing ones. | Accepted |
| D-13 | Fonts bundled with `@fontsource`; no runtime calls to Google Fonts. | Accepted |
| D-14 | TDD for all code: failing test first. | Accepted |
| D-15 | Git: feature branch per task → `develop`; never push to `main`; push only on Ravi's say-so. | Accepted |
| D-16 | Never commit `*.xlsx`, bank statements, `private-data/` or real user data; never test with Ravi's real account. | Accepted |
| D-17 | CI gate on every push/PR: lint, typecheck, tests, build, `npm audit --audit-level=high`, backend `mvn verify`. | Accepted (SPEC P0-6) |

### Why D-03 and D-04 are proposed (needs a yes)
- **D-03 single ledger vs double-entry:** a full double-entry journal (every movement = balanced debit+credit across accounts) is the textbook model, but it means a new journal schema, migrating every existing entry and rewriting every screen — weeks, not one sprint. Deriving totals from the existing ledger removes the actual bug (drift) in ~3 days. Revisit if FinNest ever needs P&L/balance-sheet reports.
- **D-04 paise:** the server is already exact (BigDecimal); converting the DB to integer paise would touch every table for no accuracy gain. The float risk is only in the browser, so paise there.
