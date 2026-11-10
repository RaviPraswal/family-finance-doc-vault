package com.finnest.quicklog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuickTemplateRepository extends JpaRepository<QuickTemplate, UUID> {
    List<QuickTemplate> findAllByTenantIdAndUserIdOrderByCreatedAtAsc(UUID tenantId, UUID userId);
    Optional<QuickTemplate> findByIdAndTenantIdAndUserId(UUID id, UUID tenantId, UUID userId);
}
