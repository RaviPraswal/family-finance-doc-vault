package com.finnest.portfolio;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DepositRepository extends JpaRepository<Deposit, UUID> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "linkedAccount") // Sprint 7 T10: no query per row
    List<Deposit> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
