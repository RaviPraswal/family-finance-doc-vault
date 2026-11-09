package com.finnest.ledger;

import com.finnest.common.TenantGuard;
import com.finnest.expense.Expense;
import com.finnest.expense.ExpenseRepository;
import com.finnest.portfolio.BankAccount;
import com.finnest.portfolio.BankAccountRepository;
import com.finnest.user.User;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Sprint 8 · S8-1: the daily bank balance check. The user enters what the bank shows; any difference from the
 * ledger is posted as one "Balance adjustment" entry, so the balance stays "opening + ledger" (D-03).
 */
@RestController
@RequestMapping("/api/bankaccounts")
public class BalanceCheckController {
    static final String CATEGORY = "Balance adjustment";

    private final BankAccountRepository accounts;
    private final ExpenseRepository expenses;
    private final BalanceCheckRepository checks;
    private final LedgerTotals totals;

    public BalanceCheckController(BankAccountRepository accounts, ExpenseRepository expenses, BalanceCheckRepository checks, LedgerTotals totals) {
        this.accounts = accounts;
        this.expenses = expenses;
        this.checks = checks;
        this.totals = totals;
    }

    public record CheckRequest(BigDecimal actualBalance, LocalDate checkDate) {}
    public record CheckResult(UUID id, UUID accountId, LocalDate checkDate, BigDecimal actualBalance,
                              BigDecimal ledgerBalance, BigDecimal difference, UUID adjustmentId) {
        static CheckResult of(BalanceCheck c) {
            return new CheckResult(c.getId(), c.getBankAccountId(), c.getCheckDate(), c.getActualBalance(),
                    c.getLedgerBalance(), c.getDifference(), c.getAdjustmentId());
        }
    }

    @PostMapping("/{id}/balance-checks")
    @Transactional
    public ResponseEntity<CheckResult> check(@PathVariable UUID id, @RequestBody CheckRequest req, @AuthenticationPrincipal User user) {
        BankAccount account = TenantGuard.owned(accounts.findById(id));
        if ("MEMBER".equals(user.getRole()) && !user.getId().equals(account.getUserId())) {
            throw new RuntimeException("Unauthorized");
        }
        if (req == null || req.actualBalance() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter the balance the bank shows.");
        }
        BigDecimal actual = req.actualBalance().setScale(2, RoundingMode.HALF_UP);
        LocalDate date = req.checkDate() == null ? LocalDate.now() : req.checkDate();
        BigDecimal ledger = totals.bankBalance(account);
        BigDecimal difference = actual.subtract(ledger);

        BalanceCheck c = new BalanceCheck();
        c.setBankAccountId(account.getId());
        c.setCheckDate(date);
        c.setActualBalance(actual);
        c.setLedgerBalance(ledger);
        c.setDifference(difference);

        if (difference.signum() != 0) {
            Expense adj = new Expense();
            adj.setAmount(difference.abs());
            adj.setType(difference.signum() > 0 ? "CREDIT" : "DEBIT");
            adj.setCategory(CATEGORY);
            adj.setExpenseDate(date);
            adj.setMadeAgainst("SYSTEM_CORRECTION");
            adj.setDescription("Balance check: bank showed ₹" + actual.toPlainString() + ", app showed ₹" + ledger.toPlainString());
            adj.setLinkedAccount(account);
            c.setAdjustmentId(expenses.save(adj).getId());
            totals.refresh(account);
            accounts.save(account);
        }
        return ResponseEntity.ok(CheckResult.of(checks.save(c)));
    }

    @GetMapping("/balance-checks/latest")
    public ResponseEntity<List<CheckResult>> latest(@AuthenticationPrincipal User user) {
        List<BalanceCheck> list = checks.latestPerAccount(TenantGuard.currentTenant());
        if ("MEMBER".equals(user.getRole())) {
            list = list.stream().filter(c -> user.getId().equals(c.getUserId())).toList();
        }
        return ResponseEntity.ok(list.stream().map(CheckResult::of).toList());
    }
}
