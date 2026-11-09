# FinNest testing strategy (P0)

Today: frontend 102 Vitest tests (libs + page tests with a mocked API), backend 73 tests (JUnit + Testcontainers Postgres: tenancy, security, money, schedules). Every task is test-first (D-14).

## Pyramid
| Level | Tool | Share | Covers |
|---|---|---|---|
| Unit | Vitest (`lib/*`), JUnit (`LoanMath`, planners) | most | money maths, schedules, alerts, paise helpers |
| Integration | Spring `MockMvc` + Testcontainers | some | every route: auth, tenant guard, validation, ledger posting, derived totals, query counts |
| Page | Vitest + Testing Library, mocked `apiClient` | some | screens render real data, key actions call the right endpoint |
| E2E smoke | manual checklist / Antigravity with a **test account** only | few | login → cockpit → mark paid → balance |

## Must be tested (P0)
| Area | Cases |
|---|---|
| Money accuracy (P0-1, P0-2) | totals = ledger sums after create / edit / delete / reverse; opening balance; DEBIT vs CREDIT; loan principal portion; drift report lists only mismatched rows; paise helpers (0.1+0.2, rounding half-up, negatives, ₹ formatting); IndusInd statement schedule unchanged. |
| Security on every route | 401 without auth; other family's id → 404/403; MEMBER cannot read/edit others' rows; client cannot set id/tenant/owner/totals; masked numbers; parameterised queries (no string-built SQL — grep check). |
| Auth (P0-3) | login sets HttpOnly/Secure/SameSite cookie; no token in body/localStorage; CSRF required on POST/PUT/DELETE; refresh; logout clears; rate limit still applies. |
| AI (P0-4) | 429/timeout → one retry max, "unavailable" response, cockpit renders; payload contains no account/card numbers or names. |
| Performance (P0-5) | Hibernate statistics: list endpoints run a constant number of queries for 1 vs 50 rows. |

**Skip:** getters/setters, Spring wiring, one-off import scripts (frozen this sprint).

## Coverage targets
- `frontend/src/lib/**` ≥ 90% lines; money and auth code paths 100% of branches listed above.
- No overall % gate (it rewards trivial tests); the table above is the gate.

## CI rules (GitHub Actions, every push and PR to `develop`)
1. **Frontend:** `npm ci` → `npm run lint` → `npx tsc --noEmit -p .` → `npm test` → `npm run build` → `npm audit --audit-level=high`.
2. **Backend:** `./mvnw -B verify` (Testcontainers uses the runner's Docker).
3. **Repo hygiene:** fail if `*.xlsx`, `sbi_investments.*`, `private-data/` or `application-secrets.yml` are tracked.
4. Any red step blocks the merge; no `--force`, no skipped tests without a linked task.
5. Locally: all work and test runs happen in the SIT repo (`D:\Personal Projects\Antigravity-projects\family-finance-doc-vault`): `cd frontend && npm test`, `cd backend && mvnw.cmd test`. CI on GitHub is the gate.
