package com.finnest.expense;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.support.TransactionTemplate;

/** Fills {@link Expense#getKind()} for rows saved before it existed or inserted by raw SQL scripts. */
@Configuration
public class EntryKindBackfill {

    @Bean
    ApplicationRunner backfillEntryKind(ExpenseRepository repository, TransactionTemplate tx) {
        return args -> tx.executeWithoutResult(status -> {
            var rows = repository.findAllByKindIsNull();
            rows.forEach(Expense::deriveKind);
            repository.saveAll(rows);
        });
    }
}
