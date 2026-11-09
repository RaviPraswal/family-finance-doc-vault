package com.finnest.ledger;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BalanceCheckRepository extends JpaRepository<BalanceCheck, UUID> {
    /** The latest check per account of a family (one query). */
    @Query("SELECT c FROM BalanceCheck c WHERE c.tenantId = :tenantId AND c.createdAt = ("
         + "SELECT MAX(c2.createdAt) FROM BalanceCheck c2 WHERE c2.tenantId = :tenantId AND c2.bankAccountId = c.bankAccountId)")
    List<BalanceCheck> latestPerAccount(@Param("tenantId") UUID tenantId);
}
