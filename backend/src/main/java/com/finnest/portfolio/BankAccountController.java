package com.finnest.portfolio;

import com.finnest.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bankaccounts")
public class BankAccountController {

    private final BankAccountRepository repository;
    private final com.finnest.expense.ExpenseRepository expenseRepository;

    public BankAccountController(BankAccountRepository repository, 
                                 com.finnest.expense.ExpenseRepository expenseRepository) {
        this.repository = repository;
        this.expenseRepository = expenseRepository;
    }

    private void calculateAndSetCurrentBalance(BankAccount account) {
        java.math.BigDecimal openingBalance = account.getOpeningBalance();
        if (openingBalance == null) {
            openingBalance = java.math.BigDecimal.ZERO;
        }

        java.math.BigDecimal currentBalance = openingBalance;

        // Fetch all expenses linked to this bank account
        List<com.finnest.expense.Expense> expenses = expenseRepository.findAllByLinkedAccountId(account.getId());

        for (com.finnest.expense.Expense expense : expenses) {
            java.math.BigDecimal amount = expense.getAmount();
            if (amount == null) {
                continue;
            }
            if ("CREDIT".equalsIgnoreCase(expense.getType())) {
                currentBalance = currentBalance.add(amount);
            } else {
                currentBalance = currentBalance.subtract(amount);
            }
        }

        account.setCurrentBalance(currentBalance);
    }

    @GetMapping
    public ResponseEntity<List<BankAccount>> getAll(@org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        List<BankAccount> list = repository.findAllByTenantIdOrderByCreatedAtDesc(UUID.fromString(TenantContext.getCurrentTenant()));
        if ("MEMBER".equals(user.getRole())) {
            list = list.stream()
                    .filter(x -> user.getId().equals(x.getUserId()))
                    .toList();
        }
        for (BankAccount account : list) {
            calculateAndSetCurrentBalance(account);
        }
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<BankAccount> create(@RequestBody BankAccount entity) {
        entity.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));
        BankAccount saved = repository.save(entity);
        calculateAndSetCurrentBalance(saved);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BankAccount> update(@PathVariable UUID id, @RequestBody BankAccount entity, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        BankAccount existing = repository.findById(id).orElseThrow();
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        if ("MEMBER".equals(user.getRole()) && !user.getId().equals(existing.getUserId())) {
            throw new RuntimeException("Unauthorized");
        }
        entity.setId(id);
        entity.setTenantId(existing.getTenantId());
        entity.setCreatedAt(existing.getCreatedAt());
        entity.setUserId(existing.getUserId());
        BankAccount saved = repository.save(entity);
        calculateAndSetCurrentBalance(saved);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        BankAccount existing = repository.findById(id).orElseThrow();
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        if ("MEMBER".equals(user.getRole()) && !user.getId().equals(existing.getUserId())) {
            throw new RuntimeException("Unauthorized");
        }
        repository.delete(existing);
        return ResponseEntity.ok().build();
    }
}

