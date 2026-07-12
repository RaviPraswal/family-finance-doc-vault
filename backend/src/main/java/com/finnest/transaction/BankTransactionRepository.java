package com.finnest.transaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BankTransactionRepository extends JpaRepository<BankTransaction, UUID> {
    List<BankTransaction> findByBankAccountIdOrderByTransactionDateDesc(UUID bankAccountId);
    List<BankTransaction> findByReferenceTypeAndReferenceId(ReferenceType referenceType, UUID referenceId);
}
