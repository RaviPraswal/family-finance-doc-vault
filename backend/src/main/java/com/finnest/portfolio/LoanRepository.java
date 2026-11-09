package com.finnest.portfolio;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoanRepository extends JpaRepository<Loan, UUID> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = "linkedAccount") // Sprint 7 T10: no query per row
    List<Loan> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
