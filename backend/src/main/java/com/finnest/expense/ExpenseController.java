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

    public ExpenseController(ExpenseRepository repository, com.finnest.portfolio.BankAccountRepository bankAccountRepository) {
        this.repository = repository;
        this.bankAccountRepository = bankAccountRepository;
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

        // Adjust balance of linked bank account
        if (entity.getLinkedAccount() != null && entity.getLinkedAccount().getId() != null) {
            com.finnest.portfolio.BankAccount account = bankAccountRepository.findById(entity.getLinkedAccount().getId()).orElse(null);
            if (account != null) {
                java.math.BigDecimal currentBalance = account.getCurrentBalance();
                if (currentBalance == null) {
                    currentBalance = java.math.BigDecimal.ZERO;
                }
                if ("CREDIT".equalsIgnoreCase(entity.getType())) {
                    account.setCurrentBalance(currentBalance.add(entity.getAmount()));
                } else { // DEBIT
                    account.setCurrentBalance(currentBalance.subtract(entity.getAmount()));
                }
                bankAccountRepository.save(account);
                entity.setLinkedAccount(account);
            }
        }

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

        // 1. Reverse old transaction effect
        if (existing.getLinkedAccount() != null) {
            com.finnest.portfolio.BankAccount account = bankAccountRepository.findById(existing.getLinkedAccount().getId()).orElse(null);
            if (account != null) {
                java.math.BigDecimal currentBalance = account.getCurrentBalance();
                if (currentBalance == null) {
                    currentBalance = java.math.BigDecimal.ZERO;
                }
                if ("CREDIT".equalsIgnoreCase(existing.getType())) {
                    account.setCurrentBalance(currentBalance.subtract(existing.getAmount()));
                } else { // DEBIT
                    account.setCurrentBalance(currentBalance.add(existing.getAmount()));
                }
                bankAccountRepository.save(account);
            }
        }

        // 2. Apply new transaction effect
        if (entity.getLinkedAccount() != null && entity.getLinkedAccount().getId() != null) {
            com.finnest.portfolio.BankAccount account = bankAccountRepository.findById(entity.getLinkedAccount().getId()).orElse(null);
            if (account != null) {
                java.math.BigDecimal currentBalance = account.getCurrentBalance();
                if (currentBalance == null) {
                    currentBalance = java.math.BigDecimal.ZERO;
                }
                if ("CREDIT".equalsIgnoreCase(entity.getType())) {
                    account.setCurrentBalance(currentBalance.add(entity.getAmount()));
                } else { // DEBIT
                    account.setCurrentBalance(currentBalance.subtract(entity.getAmount()));
                }
                bankAccountRepository.save(account);
                entity.setLinkedAccount(account);
            }
        } else {
            entity.setLinkedAccount(null);
        }

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
        if (existing.getLinkedAccount() != null) {
            com.finnest.portfolio.BankAccount account = bankAccountRepository.findById(existing.getLinkedAccount().getId()).orElse(null);
            if (account != null) {
                java.math.BigDecimal currentBalance = account.getCurrentBalance();
                if (currentBalance == null) {
                    currentBalance = java.math.BigDecimal.ZERO;
                }
                if ("CREDIT".equalsIgnoreCase(existing.getType())) {
                    account.setCurrentBalance(currentBalance.subtract(existing.getAmount()));
                } else { // DEBIT
                    account.setCurrentBalance(currentBalance.add(existing.getAmount()));
                }
                bankAccountRepository.save(account);
            }
        }

        repository.delete(existing);
        return ResponseEntity.ok().build();
    }
}
