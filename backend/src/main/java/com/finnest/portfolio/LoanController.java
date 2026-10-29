package com.finnest.portfolio;

import com.finnest.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanRepository repository;
    private final BankAccountRepository bankAccountRepository;

    public LoanController(LoanRepository repository, BankAccountRepository bankAccountRepository) {
        this.repository = repository;
        this.bankAccountRepository = bankAccountRepository;
    }

    /** A linked bank account must belong to the same family. */
    private void guardLinkedAccount(Loan entity) {
        if (entity.getLinkedAccount() != null && entity.getLinkedAccount().getId() != null) {
            entity.setLinkedAccount(com.finnest.common.TenantGuard.owned(bankAccountRepository.findById(entity.getLinkedAccount().getId())));
        }
    }

    @GetMapping
    public ResponseEntity<List<Loan>> getAll(@org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        List<Loan> list = repository.findAllByTenantIdOrderByCreatedAtDesc(UUID.fromString(TenantContext.getCurrentTenant()));
        if ("MEMBER".equals(user.getRole())) {
            list = list.stream()
                    .filter(x -> user.getId().equals(x.getUserId()))
                    .toList();
        }
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<Loan> create(@RequestBody Loan entity) {
        entity.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));
        guardLinkedAccount(entity);
        return ResponseEntity.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Loan> update(@PathVariable UUID id, @RequestBody Loan entity, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        Loan existing = repository.findById(id).orElseThrow();
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
        return ResponseEntity.ok(repository.save(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        Loan existing = repository.findById(id).orElseThrow();
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
