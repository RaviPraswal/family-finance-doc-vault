package com.finnest.notification;

import com.finnest.document.Document;
import com.finnest.document.DocumentRepository;
import com.finnest.user.User;
import com.finnest.user.UserRepository;
import com.finnest.expense.Expense;
import com.finnest.expense.ExpenseRepository;
import com.finnest.budget.Budget;
import com.finnest.budget.BudgetRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReminderScheduler {

    private final DocumentRepository documentRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final ExpenseRepository expenseRepository;
    private final BudgetRepository budgetRepository;

    public ReminderScheduler(DocumentRepository documentRepository,
                             NotificationRepository notificationRepository,
                             UserRepository userRepository,
                             EmailService emailService,
                             ExpenseRepository expenseRepository,
                             BudgetRepository budgetRepository) {
        this.documentRepository = documentRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.expenseRepository = expenseRepository;
        this.budgetRepository = budgetRepository;
    }

    // Runs every day at 8:00 AM
    @Scheduled(cron = "0 0 8 * * *")
    public void checkExpiries() {
        System.out.println("Running daily expiry check...");
        List<Document> documents = documentRepository.findAll();
        LocalDate today = LocalDate.now();

        for (Document doc : documents) {
            if (doc.getExpiryDate() != null) {
                long daysUntilExpiry = java.time.temporal.ChronoUnit.DAYS.between(today, doc.getExpiryDate());

                if (daysUntilExpiry == 30 || daysUntilExpiry == 14 || daysUntilExpiry == 3) {
                    // Create Notification
                    Notification notification = new Notification();
                    notification.setTenantId(doc.getTenantId());
                    notification.setDocumentId(doc.getId());
                    notification.setMessage("Document '" + doc.getName() + "' is expiring in " + daysUntilExpiry + " days.");
                    notificationRepository.save(notification);

                    // Send Email to the user who uploaded it
                    userRepository.findById(doc.getUploadedBy()).ifPresent(user -> {
                        emailService.sendEmail(
                                user.getEmail(),
                                "Reminder: Document Expiring Soon",
                                "Hello " + user.getName() + ",\n\n" +
                                        "Your document '" + doc.getName() + "' is expiring on " + doc.getExpiryDate() + ".\n\n" +
                                        "Please take necessary action.\n\n" +
                                        "Best,\nThe FinNest Team"
                        );
                    });
                }
            }
        }
    }

    // Runs every Sunday at 6:00 PM
    @Scheduled(cron = "0 0 18 * * SUN")
    public void sendWeeklySpendDigest() {
        System.out.println("Running Sunday weekly spend digest email sender...");
        List<User> users = userRepository.findAll();
        
        // Group users by tenantId to aggregate family spendings together
        Map<UUID, List<User>> usersByTenant = users.stream()
                .filter(u -> u.getTenantId() != null)
                .collect(Collectors.groupingBy(User::getTenantId));

        LocalDate today = LocalDate.now();
        LocalDate startOfWeek = today.minusDays(7);
        String currentMonthStr = YearMonth.now().toString(); // "yyyy-MM"

        for (Map.Entry<UUID, List<User>> entry : usersByTenant.entrySet()) {
            UUID tenantId = entry.getKey();
            List<User> tenantUsers = entry.getValue();

            // Fetch expenses for this tenant in the last 7 days
            List<Expense> weeklyExpenses = expenseRepository.findByTenantIdAndExpenseDateBetween(tenantId, startOfWeek, today);
            
            // Total spent this week (DEBIT)
            BigDecimal totalSpent = weeklyExpenses.stream()
                    .filter(e -> "DEBIT".equalsIgnoreCase(e.getType()))
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (totalSpent.compareTo(BigDecimal.ZERO) == 0 && weeklyExpenses.isEmpty()) {
                continue; // Skip if no activity to keep emails meaningful
            }

            // Find the highest expense category
            Map<String, BigDecimal> categoryTotals = weeklyExpenses.stream()
                    .filter(e -> "DEBIT".equalsIgnoreCase(e.getType()))
                    .collect(Collectors.groupingBy(
                            Expense::getCategory,
                            Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)
                    ));
            
            String biggestCategory = "N/A";
            BigDecimal biggestAmount = BigDecimal.ZERO;
            for (Map.Entry<String, BigDecimal> catTotal : categoryTotals.entrySet()) {
                if (catTotal.getValue().compareTo(biggestAmount) > 0) {
                    biggestCategory = catTotal.getKey();
                    biggestAmount = catTotal.getValue();
                }
            }

            // Check current month budgets status for warning level
            List<Budget> budgets = budgetRepository.findAllByTenantIdAndMonth(tenantId, currentMonthStr);
            long atRiskCount = 0;
            if (!budgets.isEmpty()) {
                // Fetch all monthly expenses
                List<Expense> monthlyExpenses = expenseRepository.findByTenantIdAndExpenseDateBetween(
                        tenantId, YearMonth.now().atDay(1), YearMonth.now().atEndOfMonth()
                );
                Map<String, BigDecimal> monthlyTotals = monthlyExpenses.stream()
                        .filter(e -> "DEBIT".equalsIgnoreCase(e.getType()))
                        .collect(Collectors.groupingBy(
                                Expense::getCategory,
                                Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)
                        ));

                for (Budget b : budgets) {
                    BigDecimal spent = monthlyTotals.getOrDefault(b.getCategory(), BigDecimal.ZERO);
                    BigDecimal threshold = b.getAmount().multiply(new BigDecimal("0.8")); // 80% limit
                    if (spent.compareTo(threshold) >= 0) {
                        atRiskCount++;
                    }
                }
            }

            // Send weekly digest email to all users of this tenant
            for (User user : tenantUsers) {
                String emailText = "Hello " + user.getName() + ",\n\n" +
                        "Here is your FinNest Sunday weekly family finance digest:\n\n" +
                        "📊 This week: ₹" + totalSpent + " spent in total.\n" +
                        "🛍️ Biggest spend category: " + biggestCategory + " (₹" + biggestAmount + ").\n" +
                        "⚠️ Budget status: " + atRiskCount + " categories are currently at risk (>80% limit).\n\n" +
                        "Log in to your dashboard to review full transaction history.\n\n" +
                        "Best,\nThe FinNest Team";

                emailService.sendEmail(
                        user.getEmail(),
                        "FinNest: Sunday Weekly Finance Digest",
                        emailText
                );
            }
        }
    }
}
