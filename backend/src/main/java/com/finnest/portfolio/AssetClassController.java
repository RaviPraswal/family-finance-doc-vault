package com.finnest.portfolio;

import com.finnest.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/asset-classes")
public class AssetClassController {

    private final AssetClassRepository repository;
    private final InvestmentRepository investmentRepository;

    public AssetClassController(AssetClassRepository repository, InvestmentRepository investmentRepository) {
        this.repository = repository;
        this.investmentRepository = investmentRepository;
    }

    @GetMapping
    public ResponseEntity<List<AssetClass>> getAll(@org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        List<AssetClass> list = repository.findAllByTenantIdOrderByCreatedAtDesc(UUID.fromString(TenantContext.getCurrentTenant()));
        if ("MEMBER".equals(user.getRole())) {
            list = list.stream()
                    .filter(x -> user.getId().equals(x.getUserId()))
                    .toList();
        }
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<AssetClass> create(@RequestBody AssetClass entity, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());
        if (entity.getName() == null || entity.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Asset class name cannot be empty");
        }
        String cleanedName = entity.getName().trim();
        if (repository.existsByNameIgnoreCaseAndTenantId(cleanedName, tenantId)) {
            throw new IllegalArgumentException("Asset class with name '" + cleanedName + "' already exists");
        }
        entity.setName(cleanedName);
        entity.setTenantId(tenantId);
        entity.setUserId(user.getId());
        return ResponseEntity.ok(repository.save(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @org.springframework.security.core.annotation.AuthenticationPrincipal com.finnest.user.User user) {
        AssetClass existing = repository.findById(id).orElseThrow();
        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());
        if (!existing.getTenantId().equals(tenantId)) {
            throw new RuntimeException("Unauthorized");
        }
        if ("MEMBER".equals(user.getRole()) && !user.getId().equals(existing.getUserId())) {
            throw new RuntimeException("Unauthorized");
        }
        
        // Safety check: check if any investments use this type
        boolean isUsed = investmentRepository.existsByTypeAndTenantId(existing.getName(), tenantId);
        if (isUsed) {
            throw new IllegalArgumentException("Cannot delete asset class '" + existing.getName() + "' because it is currently linked to one or more investments.");
        }
        
        repository.delete(existing);
        return ResponseEntity.ok().build();
    }
}
