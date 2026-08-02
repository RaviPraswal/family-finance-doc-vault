package com.finnest.budget;

import com.finnest.expense.Expense;
import com.finnest.expense.ExpenseRepository;
import com.finnest.notification.EmailService;
import com.finnest.notification.Notification;
import com.finnest.notification.NotificationRepository;
import com.finnest.scheduler.ScheduledPayment;
import com.finnest.scheduler.ScheduledPaymentRepository;
import com.finnest.tenant.TenantContext;
import com.finnest.user.User;
import com.finnest.user.UserRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;
    private final NotificationRepository notificationRepository;
    private final ScheduledPaymentRepository scheduledPaymentRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public BudgetService(BudgetRepository budgetRepository,
                         ExpenseRepository expenseRepository,
                         NotificationRepository notificationRepository,
                         ScheduledPaymentRepository scheduledPaymentRepository,
                         UserRepository userRepository,
                         EmailService emailService) {
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
        this.notificationRepository = notificationRepository;
        this.scheduledPaymentRepository = scheduledPaymentRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    public List<BudgetSummaryResponse> getBudgetSummary(String monthStr) {
        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());
        YearMonth targetMonth = YearMonth.parse(monthStr); // Format "yyyy-MM"
        LocalDate start = targetMonth.atDay(1);
        LocalDate end = targetMonth.atEndOfMonth();

        // 1. Get all expenses for this tenant in this month
        List<Expense> expenses = expenseRepository.findByTenantIdAndExpenseDateBetween(tenantId, start, end);
        Map<String, BigDecimal> expensesByCategory = expenses.stream()
                .filter(e -> "DEBIT".equalsIgnoreCase(e.getType()))
                .collect(Collectors.groupingBy(
                        Expense::getCategory,
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)
                ));

        // 2. Get all budgets defined for this month
        List<Budget> budgets = budgetRepository.findAllByTenantIdAndMonth(tenantId, monthStr);
        Map<String, Budget> budgetsByCategory = budgets.stream()
                .collect(Collectors.toMap(Budget::getCategory, b -> b));

        // Get a distinct set of all categories that have either a budget or an expense
        Set<String> allCategories = new HashSet<>(expensesByCategory.keySet());
        allCategories.addAll(budgetsByCategory.keySet());
        
        // Also ensure all standard/Sprint categories are always included
        List<String> defaultCategories = Arrays.asList("Daily Life", "Investments", "Projects", "Bills", "Medical", "Education");
        allCategories.addAll(defaultCategories);

        List<BudgetSummaryResponse> summaries = new ArrayList<>();
        LocalDate today = LocalDate.now();
        int daysLeft = 0;
        if (today.getYear() == targetMonth.getYear() && today.getMonthValue() == targetMonth.getMonthValue()) {
            daysLeft = Math.max(0, end.getDayOfMonth() - today.getDayOfMonth());
        } else if (today.isBefore(start)) {
            daysLeft = targetMonth.lengthOfMonth();
        }

        for (String category : allCategories) {
            Budget budget = budgetsByCategory.get(category);
            BigDecimal limitAmount = budget != null ? budget.getAmount() : BigDecimal.ZERO;
            boolean rollover = budget != null && budget.isRollover();
            boolean emailAlert = budget != null && budget.isEmailAlert();

            BigDecimal rolloverAmount = BigDecimal.ZERO;
            if (rollover) {
                // Fetch previous month's budget
                YearMonth prevMonth = targetMonth.minusMonths(1);
                String prevMonthStr = prevMonth.format(DateTimeFormatter.ofPattern("yyyy-MM"));
                Optional<Budget> prevBudgetOpt = budgetRepository.findByTenantIdAndCategoryAndMonth(tenantId, category, prevMonthStr);
                if (prevBudgetOpt.isPresent()) {
                    Budget prevBudget = prevBudgetOpt.get();
                    // Get previous month's expenses
                    List<Expense> prevExpenses = expenseRepository.findByTenantIdAndExpenseDateBetween(tenantId, prevMonth.atDay(1), prevMonth.atEndOfMonth());
                    BigDecimal prevSpent = prevExpenses.stream()
                            .filter(e -> category.equalsIgnoreCase(e.getCategory()) && "DEBIT".equalsIgnoreCase(e.getType()))
                            .map(Expense::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
                    BigDecimal surplus = prevBudget.getAmount().subtract(prevSpent);
                    if (surplus.compareTo(BigDecimal.ZERO) > 0) {
                        rolloverAmount = surplus;
                    }
                }
            }

            BigDecimal effectiveLimit = limitAmount.add(rolloverAmount);
            BigDecimal spent = expensesByCategory.getOrDefault(category, BigDecimal.ZERO);
            BigDecimal percentage = BigDecimal.ZERO;
            if (effectiveLimit.compareTo(BigDecimal.ZERO) > 0) {
                percentage = spent.multiply(new BigDecimal(100)).divide(effectiveLimit, 2, RoundingMode.HALF_UP);
            }

            BudgetSummaryResponse summary = new BudgetSummaryResponse();
            summary.setId(budget != null ? budget.getId() : null);
            summary.setCategory(category);
            summary.setLimitAmount(limitAmount);
            summary.setRolloverAmount(rolloverAmount);
            summary.setSpentAmount(spent);
            summary.setPercentage(percentage);
            summary.setRollover(rollover);
            summary.setEmailAlert(emailAlert);
            summary.setDaysLeft(daysLeft);

            // Construct Alert String
            if (effectiveLimit.compareTo(BigDecimal.ZERO) > 0) {
                if (spent.compareTo(effectiveLimit) > 0) {
                    summary.setAlert("🚨 Budget exceeded! You've spent ₹" + spent + " of ₹" + effectiveLimit + " (" + percentage + "%).");
                    triggerBudgetNotification(tenantId, category, monthStr, spent, effectiveLimit, true, emailAlert);
                } else if (percentage.compareTo(new BigDecimal(80)) >= 0) {
                    summary.setAlert("⚠️ Alert: You've spent ₹" + spent + " of ₹" + effectiveLimit + " (" + percentage + "%). Only ₹" + effectiveLimit.subtract(spent) + " left.");
                    triggerBudgetNotification(tenantId, category, monthStr, spent, effectiveLimit, false, emailAlert);
                }
            }
            
            summaries.add(summary);
        }

        return summaries;
    }

    private void triggerBudgetNotification(UUID tenantId, String category, String month, BigDecimal spent, BigDecimal limit, boolean exceeded, boolean emailAlert) {
        String eventKey = "BUDGET_" + category + "_" + month + (exceeded ? "_EXCEEDED" : "_WARNING");
        
        // Check if notification already exists for this month and category warning level
        List<Notification> existing = notificationRepository.findAll();
        boolean alreadyNotified = existing.stream()
                .anyMatch(n -> tenantId.equals(n.getTenantId()) && n.getMessage().contains(eventKey));

        if (!alreadyNotified) {
            Notification n = new Notification();
            n.setTenantId(tenantId);
            String message = (exceeded ? "🚨 CRITICAL: " : "⚠️ WARNING: ") + "Budget alert (" + eventKey + "). Spent ₹" + spent + " of ₹" + limit + " for " + category + " this month.";
            n.setMessage(message);
            notificationRepository.save(n);

            if (emailAlert) {
                // Find all Admin/Co-Owner users of this tenant and email them
                List<User> users = userRepository.findAll().stream()
                        .filter(u -> tenantId.equals(u.getTenantId()))
                        .collect(Collectors.toList());
                for (User user : users) {
                    emailService.sendEmail(
                            user.getEmail(),
                            "FinNest: Budget Alert for " + category,
                            "Hello " + user.getName() + ",\n\n" +
                                    "This is an automated alert from your FinNest family budget planner.\n\n" +
                                    (exceeded 
                                     ? "CRITICAL: You have EXCEEDED the budget set for '" + category + "'."
                                     : "WARNING: You have used over 80% of the budget set for '" + category + "'.") + "\n\n" +
                                    "Budget Limit: ₹" + limit + "\n" +
                                    "Current Spent: ₹" + spent + "\n" +
                                    "Remaining: ₹" + (limit.subtract(spent)) + "\n\n" +
                                    "Please check your dashboard to review transactions.\n\n" +
                                    "Best,\nThe FinNest Team"
                    );
                }
            }
        }
    }

    public Budget createOrUpdateBudget(Budget budget) {
        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());
        budget.setTenantId(tenantId);
        Optional<Budget> existing = budgetRepository.findByTenantIdAndCategoryAndMonth(tenantId, budget.getCategory(), budget.getMonth());
        if (existing.isPresent()) {
            Budget b = existing.get();
            b.setAmount(budget.getAmount());
            b.setRollover(budget.isRollover());
            b.setEmailAlert(budget.isEmailAlert());
            return budgetRepository.save(b);
        }
        return budgetRepository.save(budget);
    }

    public void deleteBudget(UUID id) {
        budgetRepository.deleteById(id);
    }

    public RecurringObligationsResponse getRecurringObligations(String monthStr) {
        UUID tenantId = UUID.fromString(TenantContext.getCurrentTenant());
        YearMonth targetMonth = YearMonth.parse(monthStr);
        LocalDate start = targetMonth.atDay(1);
        LocalDate end = targetMonth.atEndOfMonth();

        List<ScheduledPayment> obligations = scheduledPaymentRepository.findAll().stream()
                .filter(p -> tenantId.equals(p.getTenantId()) && 
                             !p.getDueDate().isBefore(start) && 
                             !p.getDueDate().isAfter(end))
                .collect(Collectors.toList());

        BigDecimal totalOutgoing = obligations.stream()
                .filter(p -> com.finnest.transaction.TransactionType.DEBIT.equals(p.getTransactionType()))
                .map(ScheduledPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, BigDecimal> breakdown = obligations.stream()
                .filter(p -> com.finnest.transaction.TransactionType.DEBIT.equals(p.getTransactionType()))
                .collect(Collectors.groupingBy(
                        p -> p.getReferenceType() != null ? p.getReferenceType().name() : "OTHER",
                        Collectors.reducing(BigDecimal.ZERO, ScheduledPayment::getAmount, BigDecimal::add)
                ));

        RecurringObligationsResponse response = new RecurringObligationsResponse();
        response.setTotalOutgoing(totalOutgoing);
        response.setBreakdown(breakdown);
        response.setObligations(obligations);
        return response;
    }
}
