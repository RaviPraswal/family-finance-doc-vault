package com.finnest.portfolio;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChitFundRepository extends JpaRepository<ChitFund, UUID> {
    List<ChitFund> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
