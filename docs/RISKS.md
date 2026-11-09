# FinNest — P0 risk register

| # | Risk | Likelihood | Impact | Level | Mitigation (P0 task) | Owner | Status |
|---|---|---|---|---|---|---|---|
| R1 | **Money accuracy:** stored totals (19 direct setters in 4 classes) drift from the ledger; browser maths on floats rounds wrong. Wrong balances = wrong decisions. | High | High | **Critical** | Derive totals from the ledger (P0-1), drift report before/after, integer-paise client maths (P0-2), schedule tests pinned to a real statement. | Claude | Open |
| R2 | **Data security:** JWT readable by any injected script (`localStorage`); full financial context sent to Gemini; 3 high npm advisories. | Medium | High | **High** | HttpOnly cookie + CSRF (P0-3), AI payload minimisation (P0-4), dependency fixes + audit gate (P0-6). Masking and tenant guard already tested. | Claude | Open |
| R3 | **Imports:** Excel/PowerShell scripts write straight to the DB, bypassing the ledger and tenant checks — can re-create drift and duplicates; Antigravity test rows already landed in the real DB. | Medium | High | **High** | P0-1 drift report flags rows that don't reconcile; scripts frozen this sprint (out of scope to extend); test only with a test account/DB; owner cleans the suspect test loans. | Ravi / Claude | Open |
| R4 | **Auth regression during cookie switch:** login, refresh, session-expiry modal or file downloads could break; CSRF mistakes block all writes. | Medium | Medium | **Medium** | Tests first for login/refresh/logout/401/CSRF; keep header auth working behind a flag until the cookie path passes; ship on its own branch. | Claude | Open |
| R5 | **Performance:** list endpoints load related rows one by one and filter in memory; cockpit fans out to ~12 calls; AI retries 5× add 10s+ stalls. | Medium | Medium | **Medium** | Fetch joins + SQL filters with a query-count test (P0-5); AI max 1 retry (P0-4). | Claude | Open |

**Watch, not P0:** no backups automation for the Docker volume (Ravi keeps `db-backups/` manually); production repo not covered by CI.
