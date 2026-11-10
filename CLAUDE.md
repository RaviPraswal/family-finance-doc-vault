# FinNest — working guide for Claude

Read this and `SPRINT.md` before every task. Decisions live in `DECISIONS.md` (change none without asking Ravi). Scope lives in `SPEC.md`.

## Stack
- **Backend:** Java 21, Spring Boot 3.3.1, Spring Security (stateless JWT, jjwt 0.12), Spring Data JPA/Hibernate 6, Flyway, Spring AI (Gemini via OpenAI-compatible API), Spring Mail.
- **DB:** PostgreSQL 17 in Docker (`finnest_db`, host port 5435). Schema owned by Flyway; Hibernate `ddl-auto=validate`.
- **Frontend:** React 18 + TypeScript + Vite, Tailwind, Zustand, Lucide icons, `@fontsource` fonts (no CDN). Tests: Vitest + Testing Library.
- **Liquid Glass controls:** `glisse` (pinned) through `components/ui/LiquidControls.tsx` only — never import glisse in pages directly (D-18).
- **Packaging:** SPA built into `backend/src/main/resources/static`, one JAR (`SpaController` serves routes).

## Folder structure
```
backend/src/main/java/com/finnest/
  auth/        JWT filter, SecurityConfig, login rate limit
  tenant/      Tenant, TenantContext, TenantListener (stamps tenant_id)
  common/      TenantGuard, CreateRequestSanitizer, errors, MaskedNumberSerializer
  expense/     Expense = the ledger (ADR-001), EntryKind
  transaction/ BankTransactionService (applies ledger to balances)
  portfolio/   accounts, cards, loans (+LoanMath), chits, deposits, investments, udhaar, income, projects
  budget/ commitment/ goal/  planning
  document/    digital vault + physical almirah
  ai/          extraction + advisor (Gemini)
  scheduler/ notification/   daily jobs, reminders, email
backend/src/main/resources/db/migration/   V1 baseline … V4 (next: V5)
backend/src/test/java/com/finnest/         SprintN*Test (Testcontainers)
frontend/src/
  pages/ components/   screens and UI pieces
  lib/                 pure money/schedule maths — unit tested
  store/ api/client.ts state + fetch wrapper
  styles/              index.css, liquid-glass.css, royal.css (skins)
  __tests__/           Vitest
docs/finnest-map.html  architecture map (open in a browser)
```

## Data model (key tables)
`tenants` 1—* `users` (role OWNER|MEMBER). Every money/document table extends `TenantBaseEntity` (`tenant_id`, `user_id`, timestamps):
`bank_accounts`, `credit_cards`, `loans`, `chit_funds`, `deposits`, `investments`, `peer_lendings`, `income_sources`, `projects`/`project_expenses`, `budgets`, `commitments`, `goals`, `scheduled_payments`, `bank_transactions`, `documents`/`document_versions`, `physical_locations`/`physical_document_logs`, `notifications`.
**`expenses` is the ledger:** `type` DEBIT|CREDIT, `amount NUMERIC(38,2)`, `expense_date`, optional links `linked_account|loan|chit_fund|deposit|investment|income_source|credit_card|peer_lending|project`, `loan_principal_portion`/`loan_interest_portion`.
Totals such as `bank_accounts.current_balance`, `loans.outstanding_amount` are derived from the ledger (P0-1 removes direct writes).

## Auth
- Login → JWT (subject = email, claims: id, role, tenant). P0-3 moves it to an `HttpOnly; Secure; SameSite=Strict` cookie + CSRF token.
- Every request: `JwtAuthenticationFilter` → `TenantContext` → `TenantGuard` checks ownership; MEMBER sees/edits only own rows.
- Create requests pass `CreateRequestSanitizer` (client cannot set id/tenant/user/stored totals).

## Conventions
- **TDD always:** failing test first, then code (Ravi's standing rule).
- **Money:** server `BigDecimal`/`NUMERIC(…,2)`; client maths in integer paise (`lib/money.ts`), format only at display. Rates are percent (`9.99` = 9.99%).
- **Ledger first:** a money movement is a ledger entry; never change a stored total directly.
- **Security per route:** server-side validation, tenant/ownership check, no secrets in code (`application-secrets.yml` is git-ignored — never print it), parameterised queries only (JPA/`@Query` params).
- **Migrations:** new column/table = new `V<n>__name.sql`; never edit an applied migration.
- **UI:** skins are scoped CSS (`html.skin-royal`, `html.skin-liquid`); pages grow with content (no `h-full` page locks).
- **Never commit:** `*.xlsx`, `sbi_investments.*`, anything in `private-data/`, real user data. Never test with Ravi's real account.
- **Git:** feature branch per task; integration branch `develop`; never push to `main`; push only when Ravi says so.

## Commands
| What | Command |
|---|---|
| Start everything (Windows) | `start-app.bat` (Docker DB → backend → frontend) |
| DB only | `docker compose up -d` |
| Backend run | `cd backend && mvnw spring-boot:run` |
| Backend tests | `cd backend && mvnw test` (needs Docker; Maven Central is blocked in the cloud — run on Windows via `run-sprint3-tests.bat`) |
| Frontend dev | `cd frontend && npm run dev` |
| Frontend tests / types / lint / build | `npm test` · `npx tsc --noEmit -p .` · `npm run lint` · `npm run build` |
| Dependency audit | `npm audit --audit-level=high` |
