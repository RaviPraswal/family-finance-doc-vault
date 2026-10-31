package com.finnest.budget;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;

/** Checks every family's budgets once a day at 09:00 and sends 80% / exceeded alerts (Sprint 3, S3-13). */
@Component("budgetAlertJob")
public class BudgetAlertJob implements Runnable {

    private final BudgetService budgetService;

    public BudgetAlertJob(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @Override
    @Scheduled(cron = "0 0 9 * * *")
    public void run() {
        String month = YearMonth.now().toString();
        for (java.util.UUID tenantId : budgetService.tenantsWithBudgets(month)) {
            budgetService.sendBudgetAlerts(tenantId, month);
        }
    }
}
