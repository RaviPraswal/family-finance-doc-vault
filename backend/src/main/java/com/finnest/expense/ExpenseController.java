package com.finnest.expense;

import com.finnest.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private final ExpenseRepository repository;
    private final com.finnest.portfolio.BankAccountRepository bankAccountRepository;
    private final com.finnest.portfolio.LoanRepository loanRepository;
    private final com.finnest.portfolio.ChitFundRepository chitFundRepository;
    private final com.finnest.portfolio.PeerLendingRepository peerLendingRepository;
    private final com.finnest.portfolio.InvestmentRepository investmentRepository;
    private final com.finnest.portfolio.DepositRepository depositRepository;
    private final com.finnest.portfolio.ProjectRepository projectRepository;
    private final com.finnest.portfolio.ProjectExpenseRepository projectExpenseRepository;
    private final com.finnest.portfolio.IncomeSourceRepository incomeSourceRepository;
    private final com.finnest.portfolio.CreditCardRepository creditCardRepository;

    public ExpenseController(ExpenseRepository repository,
                             com.finnest.portfolio.BankAccountRepository bankAccountRepository,
                             com.finnest.portfolio.LoanRepository loanRepository,
                             com.finnest.portfolio.ChitFundRepository chitFundRepository,
                             com.finnest.portfolio.PeerLendingRepository peerLendingRepository,
                             com.finnest.portfolio.InvestmentRepository investmentRepository,
                             com.finnest.portfolio.DepositRepository depositRepository,
                             com.finnest.portfolio.ProjectRepository projectRepository,
                             com.finnest.portfolio.ProjectExpenseRepository projectExpenseRepository,
                             com.finnest.portfolio.IncomeSourceRepository incomeSourceRepository,
                             com.finnest.portfolio.CreditCardRepository creditCardRepository) {
        this.repository = repository;
        this.bankAccountRepository = bankAccountRepository;
        this.loanRepository = loanRepository;
        this.chitFundRepository = chitFundRepository;
        this.peerLendingRepository = peerLendingRepository;
        this.investmentRepository = investmentRepository;
        this.depositRepository = depositRepository;
        this.projectRepository = projectRepository;
        this.projectExpenseRepository = projectExpenseRepository;
        this.incomeSourceRepository = incomeSourceRepository;
        this.creditCardRepository = creditCardRepository;
    }

    @GetMapping
    public ResponseEntity<List<Expense>> getAll(@org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        List<Expense> list = repository.findAllByTenantIdOrderByExpenseDateDesc(UUID.fromString(TenantContext.getCurrentTenant()));
        if ("MEMBER".equals(user.getRole())) {
            list = list.stream()
                    .filter(x -> user.getId().equals(x.getUserId()))
                    .toList();
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories(@org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());
        if ("MEMBER".equals(user.getRole())) {
            List<String> cats = repository.findAllByTenantIdOrderByExpenseDateDesc(tenantId).stream()
                    .filter(x -> user.getId().equals(x.getUserId()))
                    .map(Expense::getCategory)
                    .distinct()
                    .toList();
            return ResponseEntity.ok(cats);
        }
        return ResponseEntity.ok(repository.findDistinctCategoriesByTenantId(tenantId));
    }

    @PostMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Expense> create(@RequestBody Expense entity) {
        entity.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));

        // Adjust balances of linked bank accounts and entities
        adjustLinkedEntityBalances(entity, true);

        return ResponseEntity.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Expense> update(@PathVariable UUID id, @RequestBody Expense entity, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        Expense existing = repository.findById(id).orElseThrow();
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        if ("MEMBER".equals(user.getRole()) && !user.getId().equals(existing.getUserId())) {
            throw new RuntimeException("Unauthorized");
        }

        // Check for changes and append to editHistory
        boolean changed = false;
        StringBuilder changesSummary = new StringBuilder();

        if (existing.getAmount() != null && entity.getAmount() != null && existing.getAmount().compareTo(entity.getAmount()) != 0) {
            changed = true;
            changesSummary.append(String.format("Amount changed from ₹%s to ₹%s. ", existing.getAmount(), entity.getAmount()));
        }
        if (existing.getCategory() != null && !existing.getCategory().equals(entity.getCategory())) {
            changed = true;
            changesSummary.append(String.format("Category changed from '%s' to '%s'. ", existing.getCategory(), entity.getCategory()));
        }
        if (existing.getExpenseDate() != null && !existing.getExpenseDate().equals(entity.getExpenseDate())) {
            changed = true;
            changesSummary.append(String.format("Date changed from '%s' to '%s'. ", existing.getExpenseDate(), entity.getExpenseDate()));
        }
        if ((existing.getDescription() != null && !existing.getDescription().equals(entity.getDescription())) || 
            (existing.getDescription() == null && entity.getDescription() != null && !entity.getDescription().isEmpty())) {
            changed = true;
            changesSummary.append(String.format("Description changed from '%s' to '%s'. ", 
                existing.getDescription() != null ? existing.getDescription() : "", 
                entity.getDescription() != null ? entity.getDescription() : ""));
        }
        if (existing.getType() != null && !existing.getType().equals(entity.getType())) {
            changed = true;
            changesSummary.append(String.format("Type changed from '%s' to '%s'. ", existing.getType(), entity.getType()));
        }
        if (existing.getMadeAgainst() != null && !existing.getMadeAgainst().equals(entity.getMadeAgainst())) {
            changed = true;
            changesSummary.append(String.format("Made Against changed from '%s' to '%s'. ", existing.getMadeAgainst(), entity.getMadeAgainst()));
        }

        if (changed) {
            String timestamp = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
                    .format(java.time.LocalDateTime.now());
            String author = user != null ? user.getName() : "System";
            String newHistoryLog = String.format("[%s by %s] %s", timestamp, author, changesSummary.toString().trim());

            String currentHistory = existing.getEditHistory();
            if (currentHistory == null || currentHistory.trim().isEmpty()) {
                entity.setEditHistory(newHistoryLog);
            } else {
                entity.setEditHistory(currentHistory + "\n" + newHistoryLog);
            }
        } else {
            entity.setEditHistory(existing.getEditHistory());
        }

        // 1. Reverse old transaction effect
        adjustLinkedEntityBalances(existing, false);

        // 2. Apply new transaction effect
        adjustLinkedEntityBalances(entity, true);

        entity.setId(id);
        entity.setTenantId(existing.getTenantId());
        entity.setCreatedAt(existing.getCreatedAt());
        entity.setUserId(existing.getUserId());
        return ResponseEntity.ok(repository.save(entity));
    }

    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        Expense existing = repository.findById(id).orElseThrow();
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        if ("MEMBER".equals(user.getRole()) && !user.getId().equals(existing.getUserId())) {
            throw new RuntimeException("Unauthorized");
        }

        // Reverse old transaction effect
        adjustLinkedEntityBalances(existing, false);

        repository.delete(existing);
        return ResponseEntity.ok().build();
    }

    private void adjustLinkedEntityBalances(Expense expense, boolean isAdd) {
        if (!isAdd && expense.getId() != null) {
            projectExpenseRepository.deleteAllByExpenseId(expense.getId());
        }

        java.math.BigDecimal amount = expense.getAmount();
        if (amount == null) return;

        String type = expense.getType();
        boolean isDebit = "DEBIT".equalsIgnoreCase(type);

        // Adjust bank account
        if (expense.getLinkedAccount() != null && expense.getLinkedAccount().getId() != null) {
            com.finnest.portfolio.BankAccount account = bankAccountRepository.findById(expense.getLinkedAccount().getId()).orElse(null);
            if (account != null) {
                java.math.BigDecimal currentBalance = account.getCurrentBalance();
                if (currentBalance == null) {
                    currentBalance = java.math.BigDecimal.ZERO;
                }
                if (isAdd) {
                    if ("CREDIT".equalsIgnoreCase(type)) {
                        account.setCurrentBalance(currentBalance.add(amount));
                    } else {
                        account.setCurrentBalance(currentBalance.subtract(amount));
                    }
                } else { // reverse
                    if ("CREDIT".equalsIgnoreCase(type)) {
                        account.setCurrentBalance(currentBalance.subtract(amount));
                    } else {
                        account.setCurrentBalance(currentBalance.add(amount));
                    }
                }
                bankAccountRepository.save(account);
                expense.setLinkedAccount(account);
            }
        }

        // Adjust Loan
        if (expense.getLinkedLoan() != null && expense.getLinkedLoan().getId() != null) {
            com.finnest.portfolio.Loan loan = loanRepository.findById(expense.getLinkedLoan().getId()).orElse(null);
            if (loan != null) {
                java.math.BigDecimal outstanding = loan.getOutstandingAmount();
                if (outstanding == null) outstanding = java.math.BigDecimal.ZERO;
                if (isAdd) {
                    if (isDebit) {
                        loan.setOutstandingAmount(outstanding.subtract(amount));
                    } else {
                        loan.setOutstandingAmount(outstanding.add(amount));
                    }
                } else {
                    if (isDebit) {
                        loan.setOutstandingAmount(outstanding.add(amount));
                    } else {
                        loan.setOutstandingAmount(outstanding.subtract(amount));
                    }
                }
                loanRepository.save(loan);
                expense.setLinkedLoan(loan);
            }
        }

        // Adjust Chit Fund
        if (expense.getLinkedChitFund() != null && expense.getLinkedChitFund().getId() != null) {
            com.finnest.portfolio.ChitFund chit = chitFundRepository.findById(expense.getLinkedChitFund().getId()).orElse(null);
            if (chit != null) {
                Integer pending = chit.getPendingInstallments();
                if (pending == null) pending = 0;
                if (isAdd) {
                    if (isDebit) {
                        chit.setPendingInstallments(Math.max(0, pending - 1));
                    }
                } else {
                    if (isDebit) {
                        chit.setPendingInstallments(pending + 1);
                    }
                }
                chitFundRepository.save(chit);
                expense.setLinkedChitFund(chit);
            }
        }

        // Adjust Peer Lending
        if (expense.getLinkedPeerLending() != null && expense.getLinkedPeerLending().getId() != null) {
            com.finnest.portfolio.PeerLending lending = peerLendingRepository.findById(expense.getLinkedPeerLending().getId()).orElse(null);
            if (lending != null) {
                java.math.BigDecimal plAmount = lending.getAmount();
                if (plAmount == null) plAmount = java.math.BigDecimal.ZERO;
                boolean isTaken = "TAKEN".equalsIgnoreCase(lending.getType());
                boolean reducesLending = (isTaken && isDebit) || (!isTaken && !isDebit);
                if (isAdd) {
                    if (reducesLending) {
                        lending.setAmount(plAmount.subtract(amount));
                    } else {
                        lending.setAmount(plAmount.add(amount));
                    }
                } else {
                    if (reducesLending) {
                        lending.setAmount(plAmount.add(amount));
                    } else {
                        lending.setAmount(plAmount.subtract(amount));
                    }
                }
                peerLendingRepository.save(lending);
                expense.setLinkedPeerLending(lending);
            }
        }

        // Adjust Investment
        if (expense.getLinkedInvestment() != null && expense.getLinkedInvestment().getId() != null) {
            com.finnest.portfolio.Investment investment = investmentRepository.findById(expense.getLinkedInvestment().getId()).orElse(null);
            if (investment != null) {
                java.math.BigDecimal invested = investment.getInvestedAmount();
                if (invested == null) invested = java.math.BigDecimal.ZERO;
                if (isAdd) {
                    if (isDebit) {
                        investment.setInvestedAmount(invested.add(amount));
                    } else {
                        investment.setInvestedAmount(invested.subtract(amount));
                    }
                } else {
                    if (isDebit) {
                        investment.setInvestedAmount(invested.subtract(amount));
                    } else {
                        investment.setInvestedAmount(invested.add(amount));
                    }
                }
                investmentRepository.save(investment);
                expense.setLinkedInvestment(investment);
            }
        }

        // Adjust Deposit
        if (expense.getLinkedDeposit() != null && expense.getLinkedDeposit().getId() != null) {
            com.finnest.portfolio.Deposit deposit = depositRepository.findById(expense.getLinkedDeposit().getId()).orElse(null);
            if (deposit != null) {
                boolean isRD = "RD".equalsIgnoreCase(deposit.getType());
                if (isRD) {
                    java.math.BigDecimal totalDep = deposit.getTotalDeposited();
                    if (totalDep == null) totalDep = java.math.BigDecimal.ZERO;
                    if (isAdd) {
                        if (isDebit) {
                            deposit.setTotalDeposited(totalDep.add(amount));
                        } else {
                            deposit.setTotalDeposited(totalDep.subtract(amount));
                        }
                    } else {
                        if (isDebit) {
                            deposit.setTotalDeposited(totalDep.subtract(amount));
                        } else {
                            deposit.setTotalDeposited(totalDep.add(amount));
                        }
                    }
                } else {
                    java.math.BigDecimal principal = deposit.getPrincipalAmount();
                    if (principal == null) principal = java.math.BigDecimal.ZERO;
                    if (isAdd) {
                        if (isDebit) {
                            deposit.setPrincipalAmount(principal.add(amount));
                        } else {
                            deposit.setPrincipalAmount(principal.subtract(amount));
                        }
                    } else {
                        if (isDebit) {
                            deposit.setPrincipalAmount(principal.subtract(amount));
                        } else {
                            deposit.setPrincipalAmount(principal.add(amount));
                        }
                    }
                }
                depositRepository.save(deposit);
                expense.setLinkedDeposit(deposit);
            }
        }

        // Adjust Project
        if (expense.getLinkedProject() != null && expense.getLinkedProject().getId() != null) {
            com.finnest.portfolio.Project project = projectRepository.findById(expense.getLinkedProject().getId()).orElse(null);
            if (project != null) {
                if (isAdd) {
                    com.finnest.portfolio.ProjectExpense pe = new com.finnest.portfolio.ProjectExpense();
                    pe.setProject(project);
                    pe.setAmount(amount);
                    pe.setDate(expense.getExpenseDate());
                    pe.setDescription(expense.getDescription());
                    pe.setCategory(expense.getCategory());
                    pe.setExpense(expense);
                    pe.setTenantId(expense.getTenantId());
                    pe.setUserId(expense.getUserId());
                    projectExpenseRepository.save(pe);
                }
                expense.setLinkedProject(project);
            }
        }

        // Adjust Income Source
        if (expense.getLinkedIncomeSource() != null && expense.getLinkedIncomeSource().getId() != null) {
            com.finnest.portfolio.IncomeSource income = incomeSourceRepository.findById(expense.getLinkedIncomeSource().getId()).orElse(null);
            if (income != null) {
                java.math.BigDecimal currentAmount = income.getAmount();
                if (currentAmount == null) currentAmount = java.math.BigDecimal.ZERO;

                boolean isCredit = "CREDIT".equalsIgnoreCase(type);
                if (isAdd) {
                    if (isCredit) {
                        income.setAmount(currentAmount.add(amount));
                    } else {
                        income.setAmount(currentAmount.subtract(amount));
                    }
                    income.setDateReceived(expense.getExpenseDate());
                } else { // reverse
                    if (isCredit) {
                        income.setAmount(currentAmount.subtract(amount));
                    } else {
                        income.setAmount(currentAmount.add(amount));
                    }
                }
                incomeSourceRepository.save(income);
                expense.setLinkedIncomeSource(income);
            }
        }

        // Adjust Credit Card
        if (expense.getLinkedCreditCard() != null && expense.getLinkedCreditCard().getId() != null) {
            com.finnest.portfolio.CreditCard card = creditCardRepository.findById(expense.getLinkedCreditCard().getId()).orElse(null);
            if (card != null) {
                expense.setLinkedCreditCard(card);
            }
        }
    }
}
