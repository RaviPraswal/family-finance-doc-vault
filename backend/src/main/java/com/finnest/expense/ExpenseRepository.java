package com.finnest.expense;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
    List<Expense> findAllByTenantIdOrderByExpenseDateDesc(UUID tenantId);

    @Query("SELECT DISTINCT e.category FROM Expense e WHERE e.tenantId = :tenantId")
    List<String> findDistinctCategoriesByTenantId(@Param("tenantId") UUID tenantId);

    @Query("SELECT e FROM Expense e WHERE e.linkedAccount.id = :bankAccountId")
    List<Expense> findAllByLinkedAccountId(@Param("bankAccountId") UUID bankAccountId);

    @Query("SELECT e FROM Expense e WHERE e.linkedCreditCard.id = :creditCardId")
    List<Expense> findAllByLinkedCreditCardId(@Param("creditCardId") UUID creditCardId);
}

