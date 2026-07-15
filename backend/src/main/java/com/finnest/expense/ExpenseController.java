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

    public ExpenseController(ExpenseRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<Expense>> getAll() {
        return ResponseEntity.ok(repository.findAllByTenantIdOrderByExpenseDateDesc(UUID.fromString(TenantContext.getCurrentTenant())));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(repository.findDistinctCategoriesByTenantId(UUID.fromString(TenantContext.getCurrentTenant())));
    }

    @PostMapping
    public ResponseEntity<Expense> create(@RequestBody Expense entity) {
        entity.setTenantId(UUID.fromString(TenantContext.getCurrentTenant()));
        return ResponseEntity.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Expense> update(@PathVariable UUID id, @RequestBody Expense entity) {
        Expense existing = repository.findById(id).orElseThrow();
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
        Expense existing = repository.findById(id).orElseThrow();
        if (!existing.getTenantId().equals(UUID.fromString(TenantContext.getCurrentTenant()))) {
            throw new RuntimeException("Unauthorized");
        }
        repository.delete(existing);
        return ResponseEntity.ok().build();
    }
}
