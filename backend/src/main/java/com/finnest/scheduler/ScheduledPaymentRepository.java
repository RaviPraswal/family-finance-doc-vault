package com.finnest.scheduler;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ScheduledPaymentRepository extends JpaRepository<ScheduledPayment, UUID> {
    List<ScheduledPayment> findByStatusAndDueDateLessThanEqual(ScheduledPaymentStatus status, LocalDate date);
    List<ScheduledPayment> findByBankAccountIdOrderByDueDateAsc(UUID bankAccountId);
}
