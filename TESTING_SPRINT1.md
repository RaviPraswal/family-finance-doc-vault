# Sprint 1 (P0) — how to test

Branch: `fix/p0-security-and-data-integrity`. Use a test account only (e.g. `test@example.com`), never your real family login.

## 0. One-time setup (required — the app will not start without it)

1. Generate a new signing key: `openssl rand -base64 48` (or Git Bash on Windows).
2. Local: add to `backend/src/main/resources/application-secrets.yml` (git-ignored):
   ```yaml
   jwt:
     secret: <paste the key>
   ```
3. Production (Render): add env var `JWT_SECRET` = a **different** new key. Everyone is logged out once; that is expected.
4. Production uploads: add a persistent disk and set `FILE_STORAGE_PATH` to its mount path (e.g. `/var/data/uploads`). Without it, files vanish on each deploy.
5. Optional: `SHOW_SQL=true` only in SIT if you want SQL logs. To get the old `admin@finnest.com` demo login locally, run with `--spring.profiles.active=dev`.

## 1. Automated tests (about 2 minutes)

Needs Docker Desktop running (tests start their own throwaway PostgreSQL; your real database is not touched).

```bash
cd backend
./mvnw test          # Windows: mvnw.cmd test
cd ../frontend
npm ci && npx tsc -p tsconfig.app.json --noEmit && npm run build
```

Expected: `Tests run: 12, Failures: 0, Errors: 0`. What they prove (`FamilyIsolationTest`):

| Test | P0 item |
| --- | --- |
| tenantHeaderIsIgnored | 2 — `X-Tenant-ID` header can't switch family |
| cannotTouchOtherFamilysRecordsById | 2, 7 — edit/delete by ID blocked |
| cannotMoveMoneyInOtherFamilysAccount | 7 — balance unchanged |
| linkedAccountMustBeSameFamily | 7 — loans/chits/deposits |
| scheduledPaymentsAreFamilyScoped | 3, 4 — list, save, pay |
| unreadableDateIsRejected | 4 — no silent "today" dates |
| thumbnailRequiresOwnership | 8 |
| rejectsDisallowedFileTypes | upload hardening |
| forgedTokenWithLeakedKeyIsRejected | 1 |
| noDefaultAdmin | 6 |
| errorsDoNotLeakInternals | 10 |

## 2. Manual check in the browser (about 15 minutes)

Start the app (`start-app.bat`). Register **two** test families: A (`a@example.com`) and B (`b@example.com`).

| # | Do this | Expected |
| --- | --- | --- |
| 1 | As A: add a bank account (opening ₹10,000), a loan, a goal named **Home Renovation**, an expense **Electricity bill** | All saved |
| 2 | Restart the backend, log in as A | Goal and expense still there; balance unchanged (P0-5) |
| 3 | Log in as `admin@finnest.com` / `admin` | "Invalid email or password" (P0-6) |
| 4 | As A, Dashboard: upload a PNG or PDF | Thumbnail now shows (it was always blank before) |
| 5 | Upload a `.txt` renamed to `.pdf` | Rejected: only PDF, PNG, JPEG, WEBP |
| 6 | As A, Ledger: parse a schedule PDF, try Save without choosing an account | Asks you to choose an account |
| 7 | Choose A's account, Save | Payments appear in A's Ledger |
| 8 | Log in as B, open Ledger | Empty — A's payments not visible (P0-3) |
| 9 | Break something (e.g. stop Postgres, click a page) | Message says "Something went wrong (ref xxxx)", no Java stack text |

## 3. Attack checks with curl (optional, 5 minutes)

Get tokens: log in as A and B in the browser, then DevTools → Application → Local Storage → `token`. Get A's IDs from DevTools → Network.

```bash
B=<B token>; A_TENANT=<A tenantId>; A_ACCT=<A bank account id>; A_LOAN=<A loan id>
# Header switch: must return B's (empty) list, not A's loans
curl -s -H "Authorization: Bearer $B" -H "X-Tenant-ID: $A_TENANT" localhost:8080/api/loans
# Edit A's loan as B: must be 403 or 404
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE -H "Authorization: Bearer $B" localhost:8080/api/loans/$A_LOAN
# Spend from A's account as B: must be 404, A's balance unchanged
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer $B" -H "Content-Type: application/json" \
  -d "{\"amount\":500,\"type\":\"DEBIT\",\"category\":\"Food\",\"expenseDate\":\"2026-10-29\",\"linkedAccount\":{\"id\":\"$A_ACCT\"}}" \
  localhost:8080/api/expenses
```

## 4. Before merging to production

- [ ] All automated tests pass; manual rows 1–9 pass in SIT
- [ ] New `JWT_SECRET` set in production (different from SIT)
- [ ] Persistent disk + `FILE_STORAGE_PATH` set in production
- [ ] Production repo diffed against this branch; same fixes applied there
- [ ] Old repo files (`user_requests.txt`, `old_plans.txt`) are removed from the tree but remain in git history; rewrite history or make the repo private if that matters to you

## Not in Sprint 1 (next sprints)

Loan EMI principal/interest split, credit-card and udhaar math, ledger-based balances, Flyway, object storage, async thumbnails, invites and onboarding.
