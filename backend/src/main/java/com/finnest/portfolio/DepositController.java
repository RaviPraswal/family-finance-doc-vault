package com.finnest.portfolio;

import com.finnest.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/deposits")
public class DepositController {

    private final DepositRepository repository;
    private final BankAccountRepository bankAccountRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private com.finnest.ledger.LedgerTotals ledgerTotals;

    public DepositController(DepositRepository repository, BankAccountRepository bankAccountRepository) {
        this.repository = repository;
        this.bankAccountRepository = bankAccountRepository;
    }

    /** A linked bank account must belong to the same family. */
    private void guardLinkedAccount(Deposit entity) {
        if (entity.getLinkedAccount() != null && entity.getLinkedAccount().getId() != null) {
            entity.setLinkedAccount(com.finnest.common.TenantGuard.owned(bankAccountRepository.findById(entity.getLinkedAccount().getId())));
        }
    }

    @GetMapping
    public ResponseEntity<List<Deposit>> getAll(@org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        List<Deposit> list = repository.findAllByTenantIdOrderByCreatedAtDesc(UUID.fromString(TenantContext.getCurrentTenant()));
        if ("MEMBER".equals(user.getRole())) {
            list = list.stream()
                    .filter(x -> user.getId().equals(x.getUserId()))
                    .toList();
        }
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<Deposit> create(@RequestBody Deposit entity) {
        entity.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));
        guardLinkedAccount(entity);
        return ResponseEntity.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Deposit> update(@PathVariable UUID id, @RequestBody Deposit entity, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        Deposit existing = repository.findById(id).orElseThrow();
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        if ("MEMBER".equals(user.getRole()) && !user.getId().equals(existing.getUserId())) {
            throw new RuntimeException("Unauthorized");
        }
        entity.setId(id);
        guardLinkedAccount(entity);
        entity.setTenantId(existing.getTenantId());
        entity.setCreatedAt(existing.getCreatedAt());
        entity.setUserId(existing.getUserId());
        // Sprint 7 T5: keep an RD's starting point; a manual change of the total is a correction of it.
        java.math.BigDecimal derived = ledgerTotals.rdDeposited(existing);
        if (existing.getOpeningDeposited() == null || derived == null) {
            entity.setOpeningDeposited(existing.getOpeningDeposited());
        } else {
            java.math.BigDecimal wanted = entity.getTotalDeposited() == null ? derived : entity.getTotalDeposited();
            entity.setOpeningDeposited(existing.getOpeningDeposited().add(wanted.subtract(derived)));
        }
        Deposit saved = repository.save(entity);
        ledgerTotals.refresh(saved);
        return ResponseEntity.ok(repository.save(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        Deposit existing = repository.findById(id).orElseThrow();
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
