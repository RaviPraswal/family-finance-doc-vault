# FinNest – External Interface Catalog

Repo: family-finance-doc-vault (branch feature/commitments-and-entrykind, read-only analysis)
`B/` = backend/src/main/java/com/finnest/ · `F/` = frontend/src/ · `R/` = backend/src/main/resources/

## 0. Cross-cutting

| Aspect | Behaviour | Evidence |
|---|---|---|
| Auth | Stateless JWT (HS-key from `${JWT_SECRET}`, Base64, ≥32 bytes, startup fails otherwise); 15-min expiry; claims `sub`=email, `id`, `role`, `name` | B/auth/JwtService.java:167-225, R/application.yml:50-51 |
| Public paths | `/`, `/index.html`, `/favicon.ico`, `/vite.svg`, `/assets/**`, `/api/auth/**`, `/api/public/**`; everything else authenticated | B/auth/SecurityConfig.java:61-65 |
| CSRF | Disabled (bearer tokens) | SecurityConfig.java:58 |
| Roles | `ROLE_OWNER`, `ROLE_MEMBER` (free-form string `users.role`); no `@PreAuthorize` anywhere — checks are inline `"MEMBER".equals(user.getRole())` | B/user/User.java:37,72-73 |
| Tenant scope | `TenantContext` set from the verified user's `tenant_id` in JWT filter, cleared after request | B/auth/JwtAuthenticationFilter.java:115-118,142-144 |
| Row visibility rule (most resources) | OWNER: all family rows; MEMBER: only rows whose `user_id` = self (list filter + update/delete check) | e.g. B/portfolio/LoanController.java:32-35,53-55 |
| Error mapping | RuntimeException("Unauthorized")→403; NotFound/NoSuchElement→404; upload>10MB→413; bad type→415; other→500 | B/common/GlobalExceptionHandler.java:19-78 |
| Frontend client | `fetch` with `Authorization: Bearer <token>` from localStorage; **any 401/403 → logout** | F/api/client.ts:4-30, F/store/authStore.ts:43-59 |
| Dev proxy | Vite proxies `/api` → `http://localhost:8080` | frontend/vite.config.ts:8-10 |
| CORS | `@CrossOrigin("*")` only on NotificationController | B/notification/NotificationController.java:13 |
| Timezone | JVM default forced to Asia/Kolkata (affects cron + LocalDate.now) | B/FinnestApplication.java:15 |
| Schema mgmt | `ddl-auto: update` (no migrations) | R/application.yml:16 |

Common entity envelope (all tenant entities): `id: uuid, createdAt, updatedAt, tenantId: uuid, userId: uuid` (B/common/BaseEntity.java:13-22, TenantBaseEntity.java:15-19). `userId` auto-filled from principal only when null (B/tenant/TenantListener.java:23-30).

---

## 1. Inbound – REST endpoints (96)

Notation: `auth: jwt` = any authenticated user; `roles` notes inline checks. "Entity" = JSON of the JPA entity incl. envelope.

### 1.1 Auth & health
```yaml
/api/auth/register:            # B/auth/AuthController.java:21
  post: {auth: public, body: {familyName, address, phone, members: [{name, email, password, phone, isAdmin: bool}]},
         res: {token}, effects: "insert tenants + users (bcrypt); first isAdmin (or first member) → OWNER, rest MEMBER"}  # AuthService.java:53-103
/api/auth/login:               # :26
  post: {auth: public, body: {email, password}, res: {token}}
/api/auth/refresh:             # :36  (permitAll path but needs valid bearer to resolve principal)
  post: {auth: bearer, body: none, res: {token}, note: "issues new 15-min token; jwt.refresh-expiration config unused"}
/api/public/health:            # B/common/HealthController.java:12
  get: {auth: public, res: {status: "UP", message}}
```

### 1.2 Family members  (B/user/FamilyMemberController.java)
```yaml
/api/family-members/profile: {get: {res: {familyName, address, phone}}}                       # :26
/api/family-members:
  get:  {res: "User[] (password @JsonIgnore)", note: "userRepository.findAll() then filter by tenant"}  # :38-45
  post: {roles: OWNER, body: {name, email, phone, password, role?}, res: User, note: "role is any free-form string"}  # :47-72
/api/family-members/{id}/role:
  put:  {roles: OWNER, query: {role: string}, res: User}                                      # :74-93
/api/family-members/{id}:
  delete: {roles: OWNER, res: 204, rule: "same tenant, not self"}                             # :95-117
```

### 1.3 Documents  (B/document/DocumentController.java; storage in DocumentService.java)
```yaml
/api/documents:
  post: {consumes: multipart, form: {file, category, description?, tags? (csv), associatedEntityType?, associatedEntityId?},
         res: Document, allowed: [application/pdf, image/png, image/jpeg, image/webp] (Tika byte sniff),
         effects: "disk write, documents + document_versions insert, thumbnail, async AI extraction"}   # :26 / Service:221-259
  get:  {query: {associatedEntityType?, associatedEntityId?}, res: Document[], member: own only}       # :39-59
/api/documents/{id}:
  get:    {res: Document, note: "tenant-guarded; NO member-ownership check"}                           # :146-149
  delete: {res: 204, effects: "deletes all version files + thumbnail"}                                 # :72
/api/documents/{id}/download:  {get: {res: "application/octet-stream attachment"}}                     # :61
/api/documents/{id}/thumbnail: {get: {res: "image/png | 404"}}                                         # :133
/api/documents/{id}/share:     {post: {body: {email}, res: 200, effects: "SMTP email w/ attachment to arbitrary address"}}  # :79
/api/documents/{id}/versions:
  get:  {res: DocumentVersion[]}                                                                       # :95
  post: {consumes: multipart, form: {file}, res: Document, effects: "new file, version row, AI re-extract"}  # :86
/api/documents/{id}/versions/{versionId}/download: {get: {res: octet-stream}}                          # :101
/api/documents/{id}/versions/{versionId}:          {delete: {res: 204}}                                # :112
/api/documents/{id}/versions/{versionId}/share:    {post: {body: {email}, res: 200}}                   # :119
# Document shape: {name, type(mime), size, category, filePath, uploadedBy, expiryDate, extractedData: json, description,
#                  tags: string[], versions[], physicalLocation, associatedEntityType, associatedEntityId}  (Document.java:20-62)
```

### 1.4 Physical vault  (B/document/PhysicalDocumentController.java)
```yaml
/api/physical-documents/stats: {get: {res: {totalDocuments, digitalOnly, physicalOnly, bothDigitalAndPhysical, missingOriginals, shelfUtilization: {shelf: n}}}}  # :22
/api/physical-documents/{documentId}:      {get: {res: PhysicalLocation|404, note: "NO tenant check (Service:97-99)"}}          # :27
/api/physical-documents/{documentId}/assign:   {post: {body: PhysicalLocation{isOriginalPresent, almirahId, shelf, holder, folder, subFolder, slot}, res: PhysicalLocation, effects: "upsert + log ASSIGN_LOCATION"}}  # :34
/api/physical-documents/{documentId}/check-out:{post: {body: {borrowerName, notes}, res: PhysicalLocation, effects: "log CHECK_OUT"}}  # :42
/api/physical-documents/{documentId}/check-in: {post: {body?: {location?: PhysicalLocation, notes?}, res: PhysicalLocation, effects: "log CHECK_IN"}}  # :50
/api/physical-documents/{documentId}/logs: {get: {res: PhysicalDocumentLog[]{documentId, actionType, performedBy, borrowerName, notes}, note: "NO tenant check (Service:216-218)"}}  # :64
```

### 1.5 AI  (B/ai/AIController.java, AdvisorController.java)
```yaml
/api/ai/parse-schedule:   # AIController.java:38
  post: {consumes: multipart, form: {file}, res: {scheduleType: LOAN_EMI|MUTUAL_FUND_SIP|RECURRING_DEPOSIT|CHIT_INSTALLMENT|OTHER, institutionName, description, installments: [{amount, dueDate}]},
         outbound: LLM, note: "file is NOT attached to prompt (DocumentParsingService.java:45-47 commented)"}
/api/ai/save-schedule:    # :56
  post: {query: {bankAccountId: uuid, referenceId?: uuid}, body: ParsedScheduleResponse, res: 200|400,
         effects: "insert scheduled_payments (PENDING, DEBIT) per installment; dates yyyy-MM-dd|dd-MM-yyyy|dd/MM/yyyy"}
/api/ai/recommendations:  # AdvisorController.java:28
  get:  {res: [{title, description, type: REALLOCATION|WARNING|OPTIMIZATION}], outbound: LLM, note: "all family goals/projects, no member filter"}
```

### 1.6 Notifications  (B/notification/NotificationController.java)
```yaml
/api/notifications:            {get: {res: Notification[]{message, isRead, documentId}}}   # :21
/api/notifications/unread:     {get: {res: Notification[]}}                                # :27
/api/notifications/{id}/read:  {put: {res: 200}}                                           # :33
/api/notifications/read-all:   {put: {res: 200}}                                           # :41
```

### 1.7 Standard CRUD portfolio resources
All follow: `GET` list (member: own only) · `POST` create (body=entity, tenant forced) · `PUT /{id}` (tenant + member-owner check; id/tenant/createdAt/userId preserved) · `DELETE /{id}` (same checks). Linked `BankAccount` stubs are tenant-guarded where noted.
```yaml
/api/bankaccounts:   {ops: [get, post, put/{id}, delete/{id}], file: B/portfolio/BankAccountController.java:49-89,
  entity: {bankName, accountHolderName, accountNumber, accountType, openingBalance, currentBalance (recomputed from linked expenses on read), name, iban}}
/api/creditcards:    {ops: [get, post, put/{id}, delete/{id}], file: CreditCardController.java:60-100,
  entity: {cardName, bankName, cardHolderName, cardNumber, creditLimit, openingOutstanding, billingCycleDate, dueDate, currentOutstanding (transient)}}
/api/loans:          {ops: [get, post, put/{id}, delete/{id}], file: LoanController.java:29-64, guardsLinkedAccount: true,
  entity: {lenderName, loanType, borrowerName, principalAmount, outstandingAmount, emiAmount, interestRate, months/remainingTenure, interestMethod, linkedAccount}}
/api/chitfunds:      {ops: [get, post, put/{id}, delete/{id}], file: ChitFundController.java:29-64, guardsLinkedAccount: true,
  entity: {organizerName, memberName, totalValue, monthlyInstallment, durationMonths, pendingInstallments, startDate, isAllotted, allottedAmount, paymentSchedule (JSON string), linkedAccount}}
/api/deposits:       {ops: [get, post, put/{id}, delete/{id}], file: DepositController.java:29-64, guardsLinkedAccount: true,
  entity: {type: FD|RD, name, accountHolderName, principalAmount, maturityAmount, interestRate, startDate, maturityDate, monthlyDepositAmount, totalDeposited, linkedAccount}}
/api/investments:    {ops: [get, post, put/{id}, delete/{id}], file: InvestmentController.java:20-53, entity: {type, name, ownerName, investedAmount, currentValue}}
/api/incomesources:  {ops: [get, post, put/{id}, delete/{id}], file: IncomeSourceController.java:20-53, entity: {sourceName, ownerName, amount, frequency, dateReceived}}
/api/peerlendings:   {ops: [get, post, put/{id}, delete/{id}], file: PeerLendingController.java:20-58, entity: {type: GIVEN|TAKEN, personName, ownerName, amount, date, expectedReturnDate, settled, principalAmount, repaidAmount}}
/api/projects:       {ops: [get, post, put/{id}, delete/{id}], file: ProjectController.java:20-53, entity: {name, status, budget, priority, customFieldsConfig, startDate, endDate}}
/api/projects/{projectId}/expenses: {ops: [get, post, delete/{id}], file: ProjectExpenseController.java:22-48, entity: {project, date, amount, description, category, expense}}
/api/asset-classes:  {ops: [get, post, delete/{id}], file: AssetClassController.java:22-49, entity: {name}, rules: "unique per tenant (case-insens.); delete blocked if used by investments"}
/api/goals:          {ops: [get, post, put/{id}, delete/{id}], file: B/goal/GoalController.java:21-73, entity: {name, targetAmount, currentAmount, targetDate, category, priority, linkedAccount}}
/api/goals/{id}/contribute: {post: {body: {amount}, res: Goal, effect: "currentAmount += amount"}}   # GoalController.java:57
```

### 1.8 Expenses (ledger core)  (B/expense/ExpenseController.java)
```yaml
/api/expenses:
  get:  {res: Expense[], member: own only}                                   # :172
  post: {body: Expense, res: Expense, tx: true, effects: "adjusts linked bank/loan/chit/peer/investment/RD/income balances; inserts project_expenses"}  # :197
/api/expenses/categories: {get: {res: string[]}}                              # :183
/api/expenses/{id}:
  put:    {body: Expense, res: Expense, effects: "reverse old + apply new balance effects; appends editHistory"}  # :208
  delete: {res: 200, effects: "reverse balance effects; delete project_expenses"}                                # :282
# Expense: {amount, category (not null), expenseDate, description, type: DEBIT|CREDIT, madeAgainst, linkedAccount, linkedLoan, linkedChitFund,
#           linkedPeerLending, linkedInvestment, linkedDeposit, linkedProject, linkedIncomeSource, linkedCreditCard, customFieldsData,
#           kind: EntryKind (derived), loanPrincipalPortion, loanInterestPortion (server-computed), editHistory}
```

### 1.9 Budgets  (B/budget/BudgetController.java, BudgetService.java)
```yaml
/api/budgets/summary:     {get: {query: {month: yyyy-MM}, res: [{id, category, limitAmount, rolloverAmount, spentAmount, percentage, alert, daysLeft, rollover, emailAlert}],
                           side_effects: "creates notifications + sends emails when >=80%/exceeded (Service:131-185)"}}   # :19
/api/budgets/obligations: {get: {query: {month}, res: {totalOutgoing, breakdown: {refType: amt}, obligations: ScheduledPayment[]}}}  # :24
/api/budgets:             {post: {body: {category, amount, month, rollover, emailAlert}, res: Budget, note: "upsert by tenant+category+month"}}  # :29
/api/budgets/{id}:        {delete: {res: 204, note: "NO tenant check — deleteById (Service:201-203)"}}  # :34
```

### 1.10 Commitments (new on this branch)  (B/commitment/CommitmentController.java)
```yaml
/api/commitments:
  get:  {res: Commitment[], member: own only}                                                      # :31
  post: {body: Commitment, res: Commitment, validation: "name, group, frequency required; amount>=0 unless linked; EVERY_N_MONTHS needs intervalMonths>=1 + startDate; dueDay 1-31; end>=start"}  # :49,103-117
/api/commitments/plan: {get: {query: {month?: yyyy-MM}, res: MonthPlan{month, income, mustPay, living, pausable, totalOutflow, plannedSurplus, safeSurplus, lines: [{id, name, group, category, amount, dueDay, active, source}]}}}  # :37 / CommitmentPlanner.java:33-40
/api/commitments/{id}:
  put:    {body: Commitment, res: Commitment}   # :57
  delete: {res: 200}                            # :70
# Commitment: {name, group: INCOME|MUST_PAY|LIVING|PAUSABLE, category, amount, frequency: MONTHLY|DAILY|EVERY_N_MONTHS, intervalMonths, dueDay,
#              startDate, endDate, active, linkedLoan{id}, linkedChitFund{id}, notes}  (links tenant-guarded :94-101)
```

### 1.11 Scheduled payments / transactions  (B/transaction/TransactionController.java)
```yaml
/api/transactions/scheduled/pending:        {get: {res: ScheduledPayment[]{amount, transactionType, referenceType, referenceId, bankAccount, dueDate, status, description}}}  # :47
/api/transactions/process-scheduled/{paymentId}:
  post: {res: "200 text | 400 failureReason", effects: "debit/credit bank_accounts.currentBalance, insert bank_transactions, publish PaymentProcessedEvent → Loan/Chit/Deposit listeners update record + auto-schedule next PENDING payment"}  # :28; BankTransactionService.java:136-174; *EventListener.java
```

---

## 2. Inbound – Frontend screens (F/App.tsx:66-99)

| Route | Component | Endpoints called |
|---|---|---|
| `/` | Landing | none |
| `/login` | Login | POST /api/auth/login |
| `/register` | Register | POST /api/auth/register |
| `/dashboard` (index), `/dashboard/portfolio` | PortfolioOverview | GET bankaccounts, investments, loans, deposits, goals, expenses, incomesources, chitfunds, creditcards, peerlendings, ai/recommendations |
| `/dashboard/vault` | Dashboard (+UploadModal, PreviewModal, ShareModal) | GET documents, notifications/unread, bankaccounts, loans, peerlendings, expenses, documents/{id}/download, /thumbnail; DELETE documents/{id}; PUT notifications/{id}/read, read-all; UploadModal: GET family-members, POST documents, GET documents/{id}, POST physical-documents/{id}/assign; PreviewModal: GET/POST versions, version download, DELETE version; ShareModal: POST share / version share |
| `/dashboard/physical-vault` | PhysicalVault | GET documents, physical-documents/stats, family-members, physical-documents/{id}/logs; POST check-out, check-in |
| `/dashboard/ledger` | Ledger | GET bankaccounts, transactions/scheduled/pending; POST process-scheduled/{id}, ai/parse-schedule, ai/save-schedule?bankAccountId (no referenceId sent) |
| `/dashboard/bank-accounts` | BankAccounts | GET bankaccounts, expenses; POST/PUT/DELETE bankaccounts |
| `/dashboard/credit-cards` | CreditCards | GET creditcards, expenses; POST/PUT/DELETE creditcards |
| `/dashboard/deposits` | Deposits | GET deposits, expenses; POST/PUT/DELETE deposits |
| `/dashboard/investments` | Investments | GET investments, expenses, asset-classes; POST/PUT/DELETE investments; POST/DELETE asset-classes |
| `/dashboard/loans` | Loans | GET loans, expenses; POST/PUT/DELETE loans |
| `/dashboard/chit-funds` | ChitFunds | GET chitfunds, bankaccounts, expenses; POST/PUT/DELETE chitfunds |
| `/dashboard/peer-lending` | PeerLending | GET peerlendings, expenses; POST/PUT/DELETE peerlendings |
| `/dashboard/income` | SideIncome | GET incomesources, expenses, bankaccounts; POST/PUT/DELETE incomesources; POST/DELETE expenses |
| `/dashboard/projects` | Projects | GET projects, expenses; POST/PUT projects; POST expenses |
| `/dashboard/expenses` | Expenses | GET expenses, expenses/categories, bankaccounts, loans, chitfunds, peerlendings, investments, deposits, projects, incomesources, creditcards; POST/PUT/DELETE expenses |
| `/dashboard/goals` | Goals | GET goals, ai/recommendations; POST goals, goals/{id}/contribute |
| `/dashboard/budgets` | Budgets | GET budgets/summary, budgets/obligations; POST budgets; DELETE budgets/{id} |
| `/dashboard/family` | FamilyMembers | GET family-members, family-members/profile; POST family-members; PUT /{id}/role; DELETE /{id} |
| `/dashboard/quick-logger` | QuickLogger | GET bankaccounts, creditcards, investments, incomesources; POST expenses (templates in localStorage `fin_quick_templates`) |
| `/dashboard/commitments` | Commitments | GET commitments, commitments/plan, loans, chitfunds; POST/PUT/DELETE commitments |
| (global) | SessionExpiryModal | POST /api/auth/refresh |

All `/dashboard/*` wrapped in `ProtectedRoute` (token presence only; F/App.tsx:34). Not wired to any screen: GET /api/documents/{id}/versions… (used), PUT /api/projects/{id} (used); unused by UI: GET/POST/DELETE /api/projects/{id}/expenses, GET /api/notifications, GET /api/physical-documents/{id}.

---

## 3. Inbound – Scheduled jobs & runners

| Name | Schedule (Asia/Kolkata) | What it does | Writes / outbound | Evidence |
|---|---|---|---|---|
| ReminderScheduler.checkExpiries | `0 0 8 * * *` daily 08:00 | All documents (all tenants); if expiry in exactly 30/14/3 days → notification + email to uploader | notifications; SMTP | B/notification/ReminderScheduler.java:45-77 |
| ReminderScheduler.sendWeeklySpendDigest | `0 0 18 * * SUN` Sun 18:00 | Per tenant: last-7-day DEBIT total, top category, budgets ≥80% → email **every** family member | SMTP (read-only DB) | :80-170 |
| PaymentSchedulerService.processDuePayments | `0 0 1 * * ?` daily 01:00 | Finds PENDING payments due ≤ today and **only logs** them (no notification, no processing) | logs only | B/scheduler/PaymentSchedulerService.java:27-48 |
| EntryKindBackfill (ApplicationRunner) | every startup | Re-derives `expenses.kind` for all rows; saves changed | expenses | B/expense/EntryKindBackfill.java:16-26 |
| DatabaseSeeder (CommandLineRunner) | startup, profile `dev` only | Creates demo tenant + OWNER with weak hardcoded password (password=****) and prints it | tenants, users | B/config/DatabaseSeeder.java:15-40 |

In-process async/event consumers: `AiExtractionService.processDocumentAsync` (@Async), `EmailService.*` (@Async), `LoanEventListener`, `ChitFundEventListener`, `DepositEventListener` (@EventListener on PaymentProcessedEvent). `DocumentService.generateThumbnailAsync` is self-invoked, so @Async does not apply (runs synchronously) — DocumentService.java:249,310.

---

## 4. Inbound – Import scripts

| Script | Input | Mechanism | Tables written | Notes |
|---|---|---|---|---|
| scripts/import_commitments.py | Workbook .xlsx (sheets "MONTHLY EXPENSES", "Income Sources", two chit sheets) + user email arg | Prints SQL to stdout, piped to `docker exec … psql` | UPDATE chit_funds (payment_schedule, pending_installments); INSERT commitments (skip if name exists) | Hardcoded heuristics: chit start months, lender-name prefix match, daily SIP amounts (:76-78,105-108). Single BEGIN/COMMIT. |
| scripts/sync_excel_to_db.ps1 | Latest `FinnEst_Master_Finance_*.xlsx` on Desktop (Excel COM) | Direct `psql` to localhost:5435 per row | INSERT expenses (linked bank acct), INSERT project_expenses; UPDATE projects.budget/status | Hardcoded DB password (`$env:PGPASSWORD='****'`, :13), hardcoded personal email (:35), hardcoded full account number (:44, `<account number>`); status cell interpolated unescaped into SQL (:135); bypasses app balance logic; force-kills headless Excel (:189) |

---

## 5. Outbound interfaces

### 5.1 Database (PostgreSQL)
Connection: `${SPRING_DATASOURCE_URL}`, `${SPRING_DATASOURCE_USERNAME}`, `${SPRING_DATASOURCE_PASSWORD}` — **non-empty defaults present** (R/application.yml:11-13). docker-compose exposes postgres:17 on host port 5435 with inline credentials (POSTGRES_PASSWORD=****, docker-compose.yml:7-10).

| Table | Written by |
|---|---|
| tenants | auth/register, DatabaseSeeder |
| users | auth/register, family-members POST/PUT/DELETE, DatabaseSeeder |
| documents, document_versions | /api/documents POST/DELETE, versions POST/DELETE, AiExtractionService (extractedData, expiryDate) |
| physical_locations, physical_document_logs | /api/physical-documents assign/check-out/check-in |
| notifications | AiExtractionService (expiring ≤30d), ReminderScheduler.checkExpiries, BudgetService.triggerBudgetNotification, mark-read endpoints |
| expenses | /api/expenses, EntryKindBackfill, sync_excel_to_db.ps1 |
| bank_accounts | CRUD; balance side-effects from expenses + process-scheduled |
| credit_cards, deposits, investments, income_sources, peer_lendings, loans, chit_funds, projects, goals, asset_classes | respective CRUD + expense side-effects + event listeners; chit_funds also import_commitments.py; projects also .ps1 |
| project_expenses | ProjectExpenseController, ExpenseController (linkedProject), .ps1 |
| budgets | /api/budgets |
| commitments | /api/commitments, import_commitments.py |
| scheduled_payments | ai/save-schedule, Loan/Chit/Deposit event listeners (next installment), process-scheduled (status) |
| bank_transactions | BankTransactionService.processScheduledPayment |

### 5.2 Email (Gmail SMTP)
Config: host smtp.gmail.com:587 STARTTLS, `${MAIL_USERNAME}`, `${MAIL_PASSWORD}` (R/application.yml:33-44). From header hardcoded to a `noreply@` address on a finnest domain (B/notification/EmailService.java:21,38). All sends @Async, failures only printed.

| Trigger | Recipients | Content type | Payload | Evidence |
|---|---|---|---|---|
| POST /api/documents/{id}/share | Arbitrary address from request body | multipart MIME + **file attachment** | doc name, file | DocumentService.java:423-431 |
| POST /api/documents/{id}/versions/{vid}/share | Arbitrary address | multipart + attachment | doc name, version no., file | :451-461 |
| Daily 08:00 expiry check | Uploader of document | text/plain | user name, doc name, expiry date | ReminderScheduler.java:225-233 |
| Sunday 18:00 digest | All users of each tenant with activity | text/plain | weekly spend total, top category + amount, at-risk budget count | :313-327 |
| GET /api/budgets/summary crossing 80%/100% (once per category+month+level, if budget.emailAlert) | All users of tenant | text/plain | category, limit, spent, remaining | BudgetService.java:162-183 |

### 5.3 AI / LLM
Provider: Google Gemini via Spring AI OpenAI-compatible client. Keys: `spring.ai.openai.api-key=${GEMINI_API_KEY}`, `base-url` = Google generativelanguage OpenAI-compat endpoint, `spring.ai.openai.chat.options.model=gemini-3-flash-preview` (R/application.yml:24-31; pom spring-ai-openai-spring-boot-starter).

| Call | Trigger / frequency | Data sent | Personal data | Evidence |
|---|---|---|---|---|
| AiExtractionService.processDocumentAsync | Every document upload and every new version (async) | Images: raw image bytes as media; PDFs: full Tika-extracted text (no length limit) + long prompt | **Yes** — full identity, banking, medical, property, tax docs; prompt also embeds hardcoded family member first names/relations | B/ai/AiExtractionService.java:127-165; DocumentParser.java:72 |
| DocumentParsingService.parseScheduleDocument | POST /api/ai/parse-schedule | System prompt + format instructions only; **document not attached** | No (but output is fabricated) | B/ai/DocumentParsingService.java:43-50 |
| FinancialAdvisorService.getRecommendations | GET /api/ai/recommendations (Goals + PortfolioOverview page loads) | All family goals (name, category, priority, target, current, deadline) and projects (name, status, priority, budget, dates) | Financial data; goal/project names free-text | B/ai/FinancialAdvisorService.java:250-276 |

No retry/timeout configuration; AI responses parsed as JSON with ad-hoc fence stripping (AiExtractionService.java:167-178).

### 5.4 File storage (local filesystem)
Root `${FILE_STORAGE_PATH}` (default `uploads`, R/application.yml:57) + `thumbnails/` subdir created at startup (DocumentService.java:194-198).
- Writes: `<uuid>_<sanitized name>` per upload/version (`Files.copy`, :76,:123 → lines 228,275), `thumbnails/<docId>.png` 200px (PDFBox/ImageIO, :311-339).
- Deletes: on document/version delete (:412-415, :441).
- Files unencrypted at rest; no virus scan; Tika type sniff only.

### 5.5 Other HTTP
None found in backend (no RestTemplate/WebClient/HttpClient). Frontend makes no third-party calls (only same-origin `/api`).

---

## 6. Risks surfaced while cataloguing

1. **Cross-tenant delete** — DELETE /api/budgets/{id} uses `deleteById` with no tenant check (BudgetService.java:201-203).
2. **Cross-tenant read** — GET /api/physical-documents/{documentId} and /{documentId}/logs have no tenant filter (PhysicalLocationService.java:97-99, 216-218).
3. **Possible cross-tenant overwrite via POST** (inferred) — create endpoints accept a client-supplied `id`; `repository.save()` would merge into an existing row of another family (tenant_id is `updatable=false`, so the row stays in that family but its contents change). `userId` is also client-assignable on create. Verify with a test.
4. **AI schedule parser hallucinates** — the uploaded file never reaches the model (DocumentParsingService.java:45-47); the results can be saved as real pending payments.
5. **Sensitive personal data to a third-party LLM** — every uploaded document's full content, plus family names typed into the prompt (AiExtractionService.java:139,151-164); no opt-out or redaction.
6. **Unrestricted document exfiltration by email** — share endpoints accept any recipient; no audit log (DocumentService.java:423-461).
7. **Secrets/PII in source** — .ps1 DB password, email and full account number (:13,:35,:44); default DB password in application.yml:13; docker-compose credentials; dev seeder weak password; JwtService.java:188 embeds a prefix of a previously committed sample key (`'404E****'`) as a denylist.
8. **Plaintext card and account numbers** stored and returned in full (CreditCard.java:15, BankAccount.java:15).
9. **GET with side effects** — /api/budgets/summary creates notifications and sends emails (BudgetService.java:131-185).
10. **Scheduled-payment job is a no-op** — it only logs (PaymentSchedulerService.java:37-45); payments are processed only when someone triggers them manually from the Ledger screen.
11. **Full-table scans across tenants** — `userRepository.findAll()`, `notificationRepository.findAll()`, `scheduledPaymentRepository.findAll()` filtered in memory (FamilyMemberController.java:41, BudgetService.java:151,211).
12. **Free-form roles** — owners can set any role string; any value other than "MEMBER" gets owner-level visibility (FamilyMemberController.java:69,91).
13. **403 logs the user out** — client.ts:27-29 treats permission denials as session expiry.
14. **Token in localStorage**, 15-min expiry with an unlimited refresh chain; `jwt.refresh-expiration` is never read.
15. **SQL injection in the .ps1 script** — the project status cell is interpolated unescaped (sync_excel_to_db.ps1:135).
16. **Spoofed From address** — the hardcoded `noreply` sender on Gmail SMTP will be rewritten or fail SPF/DMARC.

---

## Confidence & Gaps
- Endpoint inventory is complete from `@*Mapping` grep plus a full read of every controller. Entity field lists come from `private` field declarations; some `type`-like fields were checked separately.
- Not verified at runtime: whether the POST-with-id merge actually overwrites (risk 3), Jackson serialization of lazy relations, and whether Spring AI's OpenAI client handles Gemini image media correctly.
- Unknown: production hosting (a comment mentions a Render disk), whether the `dev` profile is ever on in SIT, and the SMTP account owner.
- No text aimed at manipulating automated analysis was found in source, config or scripts.
- SME questions: Is the family-name almirah prompt meant to be per-tenant? Is sending ID documents to Gemini covered by consent or a DPA? Should the 01:00 job auto-process or notify? Should MEMBERs be able to share documents externally?
