# Test hand-off: FinNest Sprint 1 (P0 fixes)

Instructions for whoever runs the tests (person or AI). Do not change application code to make a test pass; report the failure instead.

## Where

- Test copy (git worktree, branch `fix/p0-security-and-data-integrity`):
  `D:\Personal Projects\Antigravity-projects\family-finance-doc-vault-sprint1`
- Do NOT run anything in `family-finance-doc-vault` (SIT, has uncommitted user work) or `family-finance-doc-vault-online` (production).
- Never use the real account `sample.ravikumar@gmail.com`. Tests create their own throwaway users.

## Prerequisites

Java 21, Node 20+, Docker Desktop running (`docker info` must succeed). No database or API keys needed: tests start their own PostgreSQL 17 container and use a test-only JWT secret.

## 1. Backend (JUnit + Testcontainers) — expect 12 passed

```bash
cd "D:/Personal Projects/Antigravity-projects/family-finance-doc-vault-sprint1/backend"
./mvnw test            # Windows cmd: mvnw.cmd test
```

Expected last lines: `Tests run: 12, Failures: 0, Errors: 0, Skipped: 0` and `BUILD SUCCESS`.

| Test (FamilyIsolationTest) | Proves |
| --- | --- |
| tenantHeaderIsIgnored | `X-Tenant-ID` header can't switch a user into another family |
| cannotTouchOtherFamilysRecordsById | Family B can't edit/delete Family A's loan |
| cannotMoveMoneyInOtherFamilysAccount | B linking A's bank account to an expense gets 404; A's balance unchanged |
| linkedAccountMustBeSameFamily | Loans can't link another family's bank account |
| scheduledPaymentsAreFamilyScoped | Pending payments list/save/pay limited to own family |
| unreadableDateIsRejected | AI schedule with a bad date is refused, not saved as today |
| thumbnailRequiresOwnership | Thumbnails need the owning family's login |
| rejectsDisallowedFileTypes | Text file renamed `.pdf` is rejected (415) |
| forgedTokenWithLeakedKeyIsRejected | Token signed with the old public key gets 401 |
| noDefaultAdmin | `admin@finnest.com`/`admin` login doesn't exist |
| errorsDoNotLeakInternals | Error bodies contain no Java exception text |
| FinnestApplicationTests.contextLoads | App starts with test config |

### If all 12 error at startup with "Could not find a valid Docker environment"

1. Confirm Docker Desktop is running.
2. If the log shows `BadRequestException (Status 400` under `NpipeSocketClientProviderStrategy`, Docker is newer than Testcontainers 1.19.8. `backend/src/test/resources/docker-java.properties` (`api.version=1.44`) should fix it. If it still fails, add inside `<properties>` in `backend/pom.xml`:
   `<testcontainers.version>1.21.4</testcontainers.version>` and re-run. Report which fix was needed.

## 2. Frontend (Vitest + Testing Library) — expect 5 passed

```bash
cd "D:/Personal Projects/Antigravity-projects/family-finance-doc-vault-sprint1/frontend"
npm ci
npm test               # runs: vitest run
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

| Test | Proves |
| --- | --- |
| AuthImage › sends the Authorization header and shows the image | Thumbnails load with the login token |
| AuthImage › calls onError … when the server refuses | No broken image when access is denied |
| Ledger › lists the family's own bank accounts | Account picker shows masked numbers |
| Ledger › blocks saving until an account is chosen | No save without an account |
| Ledger › sends the chosen account id | Request goes to `/api/ai/save-schedule?bankAccountId=…` |

Typecheck and build must finish with no errors (a "chunks larger than 500 kB" warning is expected).

## 3. What to report back

Copy this table filled in, plus the first 30 lines of any failure:

| Suite | Passed | Failed | Notes |
| --- | --- | --- | --- |
| Backend (12) | | | |
| Frontend tests (5) | | | |
| Frontend typecheck | | | |
| Frontend build | | | |

Optional manual browser checks are in `TESTING_SPRINT1.md` section 2.
