package com.finnest.goal;

import com.finnest.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalRepository repository;

    public GoalController(GoalRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<Goal>> getAll() {
        return ResponseEntity.ok(repository.findAllByTenantIdOrderByTargetDateAsc(UUID.fromString(TenantContext.getCurrentTenant())));
    }

    @PostMapping
    public ResponseEntity<Goal> create(@RequestBody Goal entity) {
        entity.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));
        if (entity.getCurrentAmount() == null) {
            entity.setCurrentAmount(BigDecimal.ZERO);
        }
        return ResponseEntity.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Goal> update(@PathVariable UUID id, @RequestBody Goal entity) {
        Goal existing = repository.findById(id).orElseThrow();
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        entity.setId(id);
        entity.setTenantId(existing.getTenantId());
        entity.setCreatedAt(existing.getCreatedAt());
        return ResponseEntity.ok(repository.save(entity));
    }

    @PostMapping("/{id}/contribute")
    public ResponseEntity<Goal> contribute(@PathVariable UUID id, @RequestBody GoalContributionRequest request) {
        Goal existing = repository.findById(id).orElseThrow();
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        
        BigDecimal current = existing.getCurrentAmount() != null ? existing.getCurrentAmount() : BigDecimal.ZERO;
        existing.setCurrentAmount(current.add(request.amount()));
        
        return ResponseEntity.ok(repository.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Goal existing = repository.findById(id).orElseThrow();
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        repository.delete(existing);
        return ResponseEntity.ok().build();
    }
}

record GoalContributionRequest(BigDecimal amount) {}
