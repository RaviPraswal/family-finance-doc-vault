# Sprint 3 — how to test

Branch: `feature/sprint3-trusted-numbers` (on top of `feature/commitments-and-entrykind`).
Use test accounts only (for example `a@example.com`), never the real family login.

## 1. Automated tests (about 3 minutes, Docker Desktop running)

```bash
cd backend && ./mvnw test          # Windows: mvnw.cmd test
cd ../frontend && npm ci && npm test && npx tsc -p tsconfig.app.json --noEmit && npm run build
```

Expected: backend `Tests run: 71, Failures: 0, Errors: 0`; frontend `21 passed`; typecheck clean; build passes (chunk-size warning is normal).

| Suite | Stories | What it proves |
| --- | --- | --- |
| Sprint3SecurityTest (15) | S3-01 to S3-08 | Budget delete and vault reads are family-scoped; create ignores id/userId; roles OWNER/MEMBER only; last owner kept; 30-day session cap; refresh without token is 401; login locked after 5 failures; no wildcard CORS; numbers masked |
| Sprint3MoneyTest (10) | S3-09 to S3-13 | Flyway builds the schema; Ledger pay creates a ledger entry and moves the shown balance; chit counted once; amounts > 0; 0.5% stays 0.5%; budgets count spending only; obligations pending only; alerts from the daily job, owners only |
| Sprint3FixesTest (5) | S3-15 to S3-17 | Parser sends the document text; version numbers never reused; deleting the newest version keeps the file; cancelled payment refused; no double check-out |
| apiClient, cockpit, alerts (7) | S3-05, S3-14, S3-17 | 403 keeps you logged in; cockpit averages, income, outflows, buckets; overdue udhaar alert |

## 2. Gate before anything else: start SIT on its real database

This sprint switches the schema to Flyway with `ddl-auto: validate`. Back up first:
`docker exec finnest_db pg_dump -U finnest finnest_db > db-backups/before-sprint3.sql`

Start the backend in SIT. Expected log lines: `Successfully baselined schema with version: 1`, then `Migrating schema "public" to version "2 - loan rates as percent"`, then `Started FinnestApplication`.
If it stops with `Schema-validation: wrong column type ...`, copy that line back; it needs one small migration. To keep working meanwhile, start with `DDL_AUTO=update`.

## 3. Manual checks in the browser (about 15 minutes)

| # | Do this | Expected |
| --- | --- | --- |
| 1 | Bank Accounts: open an account | Number shows as `****1234`; editing and saving keeps the real number |
| 2 | Ledger: Mark as Paid on a loan EMI | Bank balance drops by the EMI; Expenses shows a Loan EMI entry; loan outstanding drops by the principal only |
| 3 | Expenses: save an amount of 0 or -100 | Refused: "Amount must be greater than zero" |
| 4 | Budgets: open the page with a category over 80% | No new notification appears just from opening it |
| 5 | Login with a wrong password 5 times, then the right one | 6th attempt: "Too many failed logins. Try again in 15 minutes." |
| 6 | As a member, open a document the owner uploaded | "You don't have permission"; you stay logged in |
| 7 | Cockpit | Side income is not doubled; a closed loan's EMI is not in fixed outflows |
| 8 | Physical vault: check out a document twice | Second time refused: already checked out |

## 4. Before deploying to production

- [ ] Steps 1–3 pass in SIT
- [ ] Production database backed up; start once against a copy and watch for the Flyway lines above
- [ ] `PGPASSWORD`, `FINNEST_SYNC_EMAIL`, `FINNEST_SYNC_ACCOUNT` set before using `scripts/sync_excel_to_db.ps1`
- [ ] Old secrets in that script remain in git history: change that database password
