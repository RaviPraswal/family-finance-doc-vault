package com.finnest.portfolio;

import com.finnest.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/incomesources")
public class IncomeSourceController {

    private final IncomeSourceRepository repository;

    public IncomeSourceController(IncomeSourceRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<IncomeSource>> getAll(@org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        List<IncomeSource> list = repository.findAllByTenantIdOrderByCreatedAtDesc(UUID.fromString(TenantContext.getCurrentTenant()));
        if ("MEMBER".equals(user.getRole())) {
            list = list.stream()
                    .filter(x -> user.getId().equals(x.getUserId()))
                    .toList();
        }
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<IncomeSource> create(@RequestBody IncomeSource entity) {
        entity.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));
        return ResponseEntity.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<IncomeSource> update(@PathVariable UUID id, @RequestBody IncomeSource entity, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        IncomeSource existing = repository.findById(id).orElseThrow();
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
        return ResponseEntity.ok(repository.save(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        IncomeSource existing = repository.findById(id).orElseThrow();
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
