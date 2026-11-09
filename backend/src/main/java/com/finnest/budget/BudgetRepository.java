package com.finnest.budget;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, UUID> {
    /** Newest row wins if an old duplicate exists (no unique constraint in V1). */
    Optional<Budget> findFirstByTenantIdAndCategoryAndMonthOrderByUpdatedAtDesc(UUID tenantId, String category, String month);
    List<Budget> findAllByTenantIdAndMonth(UUID tenantId, String month);
}
