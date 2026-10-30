package com.finnest.expense;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Keeps {@link Expense#getKind()} right for rows saved before it existed, inserted by raw SQL
 * scripts, or classified by older rules. Only rows whose kind actually changes are written.
 */
@Configuration
public class EntryKindBackfill {

    @Bean
    ApplicationRunner backfillEntryKind(ExpenseRepository repository, TransactionTemplate tx) {
        return args -> tx.executeWithoutResult(status -> {
            var changed = new java.util.ArrayList<Expense>();
            for (Expense e : repository.findAll()) {
                EntryKind before = e.getKind();
                e.deriveKind();
                if (before != e.getKind()) changed.add(e);
            }
            repository.saveAll(changed);
        });
    }
}
