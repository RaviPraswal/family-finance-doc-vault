package com.finnest.config;

import com.finnest.expense.Expense;
import com.finnest.expense.ExpenseRepository;
import com.finnest.goal.Goal;
import com.finnest.goal.GoalRepository;
import com.finnest.portfolio.*;
import com.finnest.tenant.TenantContext;
import com.finnest.user.User;
import com.finnest.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner loadTestData(
            UserRepository userRepo,
            GoalRepository goalRepo,
            ProjectRepository projectRepo,
            ExpenseRepository expenseRepo,
            BankAccountRepository bankAccountRepo,
            ChitFundRepository chitFundRepo,
            PeerLendingRepository peerLendingRepo) {
        return args -> {
            // 1. Clean up the old static dummy tenant data if it exists to avoid clutter
            UUID oldDummyTenantId = UUID.fromString("11111111-1111-1111-1111-111111111111");
            cleanTenantData(oldDummyTenantId, goalRepo, projectRepo, expenseRepo, bankAccountRepo, chitFundRepo, peerLendingRepo);

            // 2. Load all users and seed data for each user's tenant
            List<User> users = userRepo.findAll();
            for (User user : users) {
                seedDataForTenant(user, goalRepo, projectRepo, expenseRepo, bankAccountRepo, chitFundRepo, peerLendingRepo);
            }
        };
    }

    public static void seedDataForTenant(
            User user,
            GoalRepository goalRepo,
            ProjectRepository projectRepo,
            ExpenseRepository expenseRepo,
            BankAccountRepository bankAccountRepo,
            ChitFundRepository chitFundRepo,
            PeerLendingRepository peerLendingRepo) {

        UUID tenantId = user.getTenantId();
        if (tenantId == null) {
            return;
        }

        // Set context temporarily
        TenantContext.setCurrentTenant(tenantId.toString());

        try {
            // ---------- Bank Accounts ----------
            BankAccount acct1 = null;
            BankAccount acct2 = null;
            List<BankAccount> existingAccounts = bankAccountRepo.findAllByTenantIdOrderByCreatedAtDesc(tenantId);
            if (existingAccounts.isEmpty()) {
                acct1 = new BankAccount();
                acct1.setName("Primary Savings");
                acct1.setBankName("State Bank of India");
                acct1.setAccountNumber("SBIN00012345");
                acct1.setIban("IN1234567890123456");
                acct1.setTenantId(tenantId);
                acct1 = bankAccountRepo.save(acct1);

                acct2 = new BankAccount();
                acct2.setName("Credit Card");
                acct2.setBankName("HDFC");
                acct2.setAccountNumber("HDFC987654321");
                acct2.setIban("IN9876543210987654");
                acct2.setTenantId(tenantId);
                acct2 = bankAccountRepo.save(acct2);
            } else {
                acct1 = existingAccounts.get(0);
                if (existingAccounts.size() > 1) {
                    acct2 = existingAccounts.get(1);
                }
            }

            // ---------- Goals ----------
            if (goalRepo.findAllByTenantIdOrderByTargetDateAsc(tenantId).isEmpty()) {
                Goal carInsurance = new Goal();
                carInsurance.setName("Car Insurance 2024");
                carInsurance.setTargetAmount(new BigDecimal("15000"));
                carInsurance.setCurrentAmount(new BigDecimal("5000"));
                carInsurance.setTargetDate(LocalDate.now().plusMonths(12));
                carInsurance.setCategory("Insurance");
                carInsurance.setPriority("HIGH");
                carInsurance.setTenantId(tenantId);
                goalRepo.save(carInsurance);

                Goal homeRenov = new Goal();
                homeRenov.setName("Home Renovation");
                homeRenov.setTargetAmount(new BigDecimal("200000"));
                homeRenov.setCurrentAmount(new BigDecimal("25000"));
                homeRenov.setTargetDate(LocalDate.now().plusMonths(24));
                homeRenov.setCategory("Home");
                homeRenov.setPriority("MEDIUM");
                homeRenov.setTenantId(tenantId);
                goalRepo.save(homeRenov);

                Goal newPhone = new Goal();
                newPhone.setName("New Phone");
                newPhone.setTargetAmount(new BigDecimal("30000"));
                newPhone.setCurrentAmount(new BigDecimal("10000"));
                newPhone.setTargetDate(LocalDate.now().plusMonths(6));
                newPhone.setCategory("Gadgets");
                newPhone.setPriority("LOW");
                newPhone.setTenantId(tenantId);
                goalRepo.save(newPhone);
            }

            // ---------- Projects ----------
            if (projectRepo.findAllByTenantIdOrderByCreatedAtDesc(tenantId).isEmpty()) {
                Project house = new Project();
                house.setName("New House Construction");
                house.setStatus("IN_PROGRESS");
                house.setBudget(new BigDecimal("5000000"));
                house.setStartDate(LocalDate.now().minusMonths(2));
                house.setPriority("HIGH");
                house.setTenantId(tenantId);
                projectRepo.save(house);

                Project wedding = new Project();
                wedding.setName("Wedding Planning");
                wedding.setStatus("IN_PROGRESS");
                wedding.setBudget(new BigDecimal("800000"));
                wedding.setStartDate(LocalDate.now());
                wedding.setPriority("MEDIUM");
                wedding.setTenantId(tenantId);
                projectRepo.save(wedding);
            }

            // ---------- Expenses ----------
            if (expenseRepo.findAllByTenantIdOrderByExpenseDateDesc(tenantId).isEmpty()) {
                Expense e1 = new Expense();
                e1.setAmount(new BigDecimal("1500"));
                e1.setCategory("Groceries");
                e1.setExpenseDate(LocalDate.now().minusDays(1));
                e1.setDescription("Weekly grocery shopping");
                e1.setLinkedAccount(acct1);
                e1.setTenantId(tenantId);
                expenseRepo.save(e1);

                Expense e2 = new Expense();
                e2.setAmount(new BigDecimal("2500"));
                e2.setCategory("Utilities");
                e2.setExpenseDate(LocalDate.now().minusDays(2));
                e2.setDescription("Electricity bill");
                e2.setLinkedAccount(acct2);
                e2.setTenantId(tenantId);
                expenseRepo.save(e2);
            }

            // ---------- Chit Funds ----------
            if (chitFundRepo.findAllByTenantIdOrderByCreatedAtDesc(tenantId).isEmpty()) {
                ChitFund cf = new ChitFund();
                cf.setOrganizerName("Vinayaka Chits");
                cf.setMemberName(user.getName());
                cf.setTotalValue(new BigDecimal("100000"));
                cf.setMonthlyInstallment(new BigDecimal("5000"));
                cf.setDurationMonths(20);
                cf.setPendingInstallments(12);
                cf.setStartDate(LocalDate.now().minusMonths(8));
                cf.setIsAllotted(true);
                cf.setAllottedAmount(new BigDecimal("85000"));
                cf.setLinkedAccount(acct1);
                cf.setTenantId(tenantId);
                chitFundRepo.save(cf);
            }

            // ---------- Peer Lending ----------
            if (peerLendingRepo.findAllByTenantIdOrderByCreatedAtDesc(tenantId).isEmpty()) {
                PeerLending pl = new PeerLending();
                pl.setType("GIVEN");
                pl.setPersonName("Ramesh Kumar");
                pl.setOwnerName(user.getName());
                pl.setAmount(new BigDecimal("50000"));
                pl.setDate(LocalDate.now());
                pl.setExpectedReturnDate(LocalDate.now().plusMonths(12));
                pl.setSettled(false);
                pl.setTenantId(tenantId);
                peerLendingRepo.save(pl);
            }

        } finally {
            TenantContext.clear();
        }
    }

    private void cleanTenantData(
            UUID tenantId,
            GoalRepository goalRepo,
            ProjectRepository projectRepo,
            ExpenseRepository expenseRepo,
            BankAccountRepository bankAccountRepo,
            ChitFundRepository chitFundRepo,
            PeerLendingRepository peerLendingRepo) {
        TenantContext.setCurrentTenant(tenantId.toString());
        try {
            goalRepo.findAllByTenantIdOrderByTargetDateAsc(tenantId).forEach(goalRepo::delete);
            projectRepo.findAllByTenantIdOrderByCreatedAtDesc(tenantId).forEach(projectRepo::delete);
            expenseRepo.findAllByTenantIdOrderByExpenseDateDesc(tenantId).forEach(expenseRepo::delete);
            chitFundRepo.findAllByTenantIdOrderByCreatedAtDesc(tenantId).forEach(chitFundRepo::delete);
            peerLendingRepo.findAllByTenantIdOrderByCreatedAtDesc(tenantId).forEach(peerLendingRepo::delete);
            bankAccountRepo.findAllByTenantIdOrderByCreatedAtDesc(tenantId).forEach(bankAccountRepo::delete);
        } finally {
            TenantContext.clear();
        }
    }
}
