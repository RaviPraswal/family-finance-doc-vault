package com.finnest.expense;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
    // Sprint 7 T10: every link the ledger list sends is loaded in the same query (no query per row).
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"linkedAccount", "linkedLoan", "linkedLoan.linkedAccount", "linkedChitFund", "linkedChitFund.linkedAccount", "linkedPeerLending", "linkedInvestment", "linkedDeposit", "linkedDeposit.linkedAccount", "linkedProject", "linkedIncomeSource", "linkedCreditCard"})
    List<Expense> findAllByTenantIdOrderByExpenseDateDesc(UUID tenantId);

    /** Sprint 7 T10: a member's own entries, filtered in SQL rather than in memory. */
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"linkedAccount", "linkedLoan", "linkedLoan.linkedAccount", "linkedChitFund", "linkedChitFund.linkedAccount", "linkedPeerLending", "linkedInvestment", "linkedDeposit", "linkedDeposit.linkedAccount", "linkedProject", "linkedIncomeSource", "linkedCreditCard"})
    List<Expense> findAllByTenantIdAndUserIdOrderByExpenseDateDesc(UUID tenantId, UUID userId);

    /** Sprint 7 T10: bank-account nets for a whole family in one grouped query. */
    @Query("SELECT e.linkedAccount.id, COALESCE(SUM(CASE WHEN UPPER(e.type) = 'CREDIT' THEN e.amount ELSE -e.amount END), 0) FROM Expense e "
         + "WHERE e.tenantId = :tenantId AND e.linkedAccount IS NOT NULL AND e.amount IS NOT NULL GROUP BY e.linkedAccount.id")
    List<Object[]> netByAccount(@Param("tenantId") UUID tenantId);

    List<Expense> findAllByKindIsNull();

    List<Expense> findByTenantIdAndExpenseDateBetween(UUID tenantId, java.time.LocalDate startDate, java.time.LocalDate endDate);

    @Query("SELECT DISTINCT e.category FROM Expense e WHERE e.tenantId = :tenantId")
    List<String> findDistinctCategoriesByTenantId(@Param("tenantId") UUID tenantId);

    @Query("SELECT e FROM Expense e WHERE e.linkedAccount.id = :bankAccountId")
    List<Expense> findAllByLinkedAccountId(@Param("bankAccountId") UUID bankAccountId);

    /** The latest earlier payment against a loan, excluding the given expense (used for day-count interest). */
    java.util.Optional<Expense> findFirstByLinkedLoanIdAndIdNotAndExpenseDateBeforeOrderByExpenseDateDesc(UUID loanId, UUID excludeId, java.time.LocalDate date);

    @Query("SELECT e FROM Expense e WHERE e.linkedCreditCard.id = :creditCardId")
    List<Expense> findAllByLinkedCreditCardId(@Param("creditCardId") UUID creditCardId);

    // Sprint 7 T3: ledger sums behind every derived total (tenant-scoped, bound parameters only).
    @Query("SELECT COALESCE(SUM(CASE WHEN UPPER(e.type) = 'CREDIT' THEN e.amount ELSE -e.amount END), 0) FROM Expense e "
         + "WHERE e.tenantId = :tenantId AND e.linkedAccount.id = :accountId AND e.amount IS NOT NULL")
    java.math.BigDecimal netForAccount(@Param("tenantId") UUID tenantId, @Param("accountId") UUID accountId);

    @Query("SELECT COALESCE(SUM(CASE WHEN UPPER(e.type) = 'CREDIT' THEN -e.amount ELSE COALESCE(e.loanPrincipalPortion, e.amount) END), 0) "
         + "FROM Expense e WHERE e.tenantId = :tenantId AND e.linkedLoan.id = :loanId AND e.amount IS NOT NULL")
    java.math.BigDecimal principalRepaidForLoan(@Param("tenantId") UUID tenantId, @Param("loanId") UUID loanId);

    @Query("SELECT COALESCE(SUM(CASE WHEN UPPER(e.type) = 'CREDIT' THEN -e.amount ELSE COALESCE(e.loanPrincipalPortion, e.amount) END), 0) "
         + "FROM Expense e WHERE e.tenantId = :tenantId AND e.linkedLoan.id = :loanId AND e.amount IS NOT NULL AND e.id <> :excludeId")
    java.math.BigDecimal principalRepaidForLoanExcluding(@Param("tenantId") UUID tenantId, @Param("loanId") UUID loanId, @Param("excludeId") UUID excludeId);

    @Query("SELECT COALESCE(SUM(CASE WHEN UPPER(e.type) = 'CREDIT' THEN -e.amount ELSE e.amount END), 0) FROM Expense e "
         + "WHERE e.tenantId = :tenantId AND e.linkedDeposit.id = :depositId AND e.amount IS NOT NULL")
    java.math.BigDecimal netDepositedForDeposit(@Param("tenantId") UUID tenantId, @Param("depositId") UUID depositId);
}
