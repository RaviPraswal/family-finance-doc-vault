package com.finnest.portfolio;

import com.finnest.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/creditcards")
public class CreditCardController {

    private final CreditCardRepository repository;
    private final com.finnest.expense.ExpenseRepository expenseRepository;

    public CreditCardController(CreditCardRepository repository, 
                                com.finnest.expense.ExpenseRepository expenseRepository) {
        this.repository = repository;
        this.expenseRepository = expenseRepository;
    }

    private void calculateAndSetCurrentOutstanding(CreditCard card) {
        java.math.BigDecimal currentOutstanding = card.getOpeningOutstanding();
        if (currentOutstanding == null) {
            currentOutstanding = java.math.BigDecimal.ZERO;
        }

        // Fetch all expenses linked to this credit card
        List<com.finnest.expense.Expense> expenses = expenseRepository.findAllByLinkedCreditCardId(card.getId());

        for (com.finnest.expense.Expense expense : expenses) {
            java.math.BigDecimal amount = expense.getAmount();
            if (amount == null) {
                continue;
            }
            
            // Check if a bank account is linked (representing payment or transfer)
            boolean isBankPayment = expense.getLinkedAccount() != null && expense.getLinkedAccount().getId() != null;
            
            boolean isDebitToCard;
            if (isBankPayment) {
                // If paid from a bank account, a DEBIT to the bank is a payment (CREDIT) to the card
                isDebitToCard = !"DEBIT".equalsIgnoreCase(expense.getType());
            } else {
                // Direct card transaction: DEBIT is a charge/purchase
                isDebitToCard = "DEBIT".equalsIgnoreCase(expense.getType());
            }

            if (isDebitToCard) {
                currentOutstanding = currentOutstanding.add(amount);
            } else {
                currentOutstanding = currentOutstanding.subtract(amount);
            }
        }

        card.setCurrentOutstanding(currentOutstanding);
    }

    @GetMapping
    public ResponseEntity<List<CreditCard>> getAll(@org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        List<CreditCard> list = repository.findAllByTenantIdOrderByCreatedAtDesc(UUID.fromString(TenantContext.getCurrentTenant()));
        if ("MEMBER".equals(user.getRole())) {
            list = list.stream()
                    .filter(x -> user.getId().equals(x.getUserId()))
                    .toList();
        }
        for (CreditCard card : list) {
            calculateAndSetCurrentOutstanding(card);
        }
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<CreditCard> create(@RequestBody CreditCard entity) {
        entity.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));
        CreditCard saved = repository.save(entity);
        calculateAndSetCurrentOutstanding(saved);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CreditCard> update(@PathVariable UUID id, @RequestBody CreditCard entity, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        CreditCard existing = repository.findById(id).orElseThrow();
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
        CreditCard saved = repository.save(entity);
        calculateAndSetCurrentOutstanding(saved);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        CreditCard existing = repository.findById(id).orElseThrow();
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
