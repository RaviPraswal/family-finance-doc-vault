package com.finnest.portfolio;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AssetClassRepository extends JpaRepository<AssetClass, UUID> {
    List<AssetClass> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    boolean existsByNameIgnoreCaseAndTenantId(String name, UUID tenantId);
}
