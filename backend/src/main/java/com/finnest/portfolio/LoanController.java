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

    public LoanController(LoanRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<Loan>> getAll() {
        return ResponseEntity.ok(repository.findAllByTenantIdOrderByCreatedAtDesc(UUID.fromString(TenantContext.getCurrentTenant())));
    }

    @PostMapping
    public ResponseEntity<Loan> create(@RequestBody Loan entity) {
        entity.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));
        return ResponseEntity.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Loan> update(@PathVariable UUID id, @RequestBody Loan entity) {
        Loan existing = repository.findById(id).orElseThrow();
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        entity.setId(id);
        entity.setTenantId(existing.getTenantId());
        entity.setCreatedAt(existing.getCreatedAt());
        return ResponseEntity.ok(repository.save(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Loan existing = repository.findById(id).orElseThrow();
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        repository.delete(existing);
        return ResponseEntity.ok().build();
    }
}
