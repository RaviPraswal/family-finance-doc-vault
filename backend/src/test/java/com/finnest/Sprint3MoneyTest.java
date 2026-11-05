package com.finnest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finnest.notification.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sprint 3, batch B: the money stories S3-09 to S3-13. One fresh family per test. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint3MoneyTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired ApplicationContext context;
    @MockBean EmailService emailService;

    String run, ownerEmail, token, accountId;

    @BeforeEach
    void family() throws Exception {
        run = UUID.randomUUID().toString().substring(0, 8);
        ownerEmail = "o-" + run + "@example.com";
        Map<String, Object> req = Map.of("familyName", "Money " + run, "address", "x", "phone", "9000000000",
                "members", List.of(Map.of("name", "Owner", "email", ownerEmail, "password", "Test@12345", "phone", "9000000000", "isAdmin", true)));
        token = json.readTree(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(req)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
        accountId = postJson("/api/bankaccounts", Map.of("bankName", "SBI", "accountNumber", "X1", "openingBalance", 100000)).get("id").asText();
    }

    // ---------- S3-09 ----------

    @Test
    @DisplayName("S3-09: the schema is created by Flyway migrations, not by Hibernate")
    void schemaComesFromFlyway() {
        Integer applied = jdbc.queryForObject("select count(*) from flyway_schema_history where success", Integer.class);
        assertThat(applied).isGreaterThanOrEqualTo(1);
        assertThat(context.getEnvironment().getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
    }

    // ---------- S3-10 ----------

    @Test
    @DisplayName("S3-10: paying a loan EMI from the Ledger creates a ledger entry, moves the shown balance and splits principal")
    void ledgerEmiBecomesExpense() throws Exception {
        String loanId = postJson("/api/loans", Map.of("lenderName", "SBI", "outstandingAmount", 1500000, "interestRate", 10.5,
                "emiAmount", 16581, "remainingTenure", 12)).get("id").asText();
        String paymentId = schedule("LOAN_EMI", loanId, 16581);

        mvc.perform(auth(post("/api/transactions/process-scheduled/" + paymentId))).andExpect(status().isOk());

        assertThat(balance()).isEqualByComparingTo("83419");
        assertThat(field("/api/loans", loanId, "outstandingAmount")).isEqualByComparingTo("1496544.00");
        JsonNode expenses = getJson("/api/expenses");
        assertThat(expenses).hasSize(1);
        assertThat(expenses.get(0).get("kind").asText()).isEqualTo("LOAN_PAYMENT");
        assertThat(new BigDecimal(expenses.get(0).get("loanPrincipalPortion").asText())).isEqualByComparingTo("3456.00");
        // the next EMI is scheduled
        assertThat(getJson("/api/transactions/scheduled/pending")).hasSize(1);
    }

    @Test
    @DisplayName("S3-10: a chit installment paid from the Ledger reduces pending installments exactly once")
    void ledgerChitInstallmentCountsOnce() throws Exception {
        String chitId = postJson("/api/chitfunds", Map.of("organizerName", "Shriram", "totalValue", 100000, "monthlyInstallment", 5000,
                "durationMonths", 20, "pendingInstallments", 10)).get("id").asText();
        String paymentId = schedule("CHIT_INSTALLMENT", chitId, 5000);

        mvc.perform(auth(post("/api/transactions/process-scheduled/" + paymentId))).andExpect(status().isOk());

        assertThat(field("/api/chitfunds", chitId, "pendingInstallments")).isEqualByComparingTo("9");
        assertThat(balance()).isEqualByComparingTo("95000");
    }

    @Test
    @DisplayName("S3-10: a Ledger payment larger than the shown balance fails and records nothing")
    void ledgerPaymentChecksShownBalance() throws Exception {
        // Shown balance drops to 2,000 through an ordinary expense.
        postJson("/api/expenses", expense(98000, "DEBIT", "Rent", Map.of()));
        String loanId = postJson("/api/loans", Map.of("lenderName", "SBI", "outstandingAmount", 50000, "interestRate", 10, "emiAmount", 5000)).get("id").asText();
        String paymentId = schedule("LOAN_EMI", loanId, 5000);

        mvc.perform(auth(post("/api/transactions/process-scheduled/" + paymentId))).andExpect(status().isBadRequest());

        assertThat(getJson("/api/expenses")).hasSize(1);
        assertThat(balance()).isEqualByComparingTo("2000");
    }

    // ---------- S3-11 ----------

    @Test
    @DisplayName("S3-11: zero and negative amounts are refused")
    void amountsMustBePositive() throws Exception {
        sendExpense(post("/api/expenses"), expense(0, "DEBIT", "Food", Map.of())).andExpect(status().isBadRequest());
        sendExpense(post("/api/expenses"), expense(-1000, "DEBIT", "Food", Map.of())).andExpect(status().isBadRequest());

        String id = postJson("/api/expenses", expense(500, "DEBIT", "Food", Map.of())).get("id").asText();
        sendExpense(put("/api/expenses/" + id), expense(-5, "DEBIT", "Food", Map.of())).andExpect(status().isBadRequest());

        assertThat(balance()).isEqualByComparingTo("99500");
    }

    @Test
    @DisplayName("S3-11: a 0.5% loan charges 0.5%, not 50%")
    void lowRateStaysPercent() throws Exception {
        String loanId = postJson("/api/loans", Map.of("lenderName", "Family", "outstandingAmount", 100000, "interestRate", 0.5, "emiAmount", 1000)).get("id").asText();

        JsonNode exp = postJson("/api/expenses", expense(1000, "DEBIT", "Loan EMI", Map.of("linkedLoan", Map.of("id", loanId))));

        assertThat(new BigDecimal(exp.get("loanInterestPortion").asText())).isEqualByComparingTo("41.67");
    }

    // ---------- S3-12 ----------

    @Test
    @DisplayName("S3-12: budgets count only spending, not EMIs paid under the same category")
    void budgetCountsOnlySpending() throws Exception {
        String month = YearMonth.now().toString();
        postJson("/api/budgets", Map.of("category", "Bills", "amount", 10000, "month", month, "emailAlert", false));
        postJson("/api/expenses", expense(2000, "DEBIT", "Bills", Map.of()));
        postJson("/api/expenses", expense(5000, "DEBIT", "Bills", Map.of("madeAgainst", "LOAN_EMI")));

        assertThat(budgetSpent(month, "Bills")).isEqualByComparingTo("2000");
    }

    @Test
    @DisplayName("S3-12: monthly obligations count only payments still pending")
    void obligationsCountOnlyPending() throws Exception {
        String loanId = postJson("/api/loans", Map.of("lenderName", "SBI", "outstandingAmount", 50000, "interestRate", 10, "emiAmount", 3000)).get("id").asText();
        String paid = schedule("LOAN_EMI", loanId, 3000);
        schedule("LOAN_EMI", loanId, 4000);
        mvc.perform(auth(post("/api/transactions/process-scheduled/" + paid))).andExpect(status().isOk());

        JsonNode obligations = getJson("/api/budgets/obligations?month=" + YearMonth.now());

        assertThat(new BigDecimal(obligations.get("totalOutgoing").asText())).isEqualByComparingTo("4000");
    }

    // ---------- S3-13 ----------

    @Test
    @DisplayName("S3-13: opening the budget page creates no notifications")
    void budgetSummaryHasNoSideEffects() throws Exception {
        String month = YearMonth.now().toString();
        postJson("/api/budgets", Map.of("category", "Food", "amount", 1000, "month", month));
        postJson("/api/expenses", expense(950, "DEBIT", "Food", Map.of()));

        getJson("/api/budgets/summary?month=" + month);

        assertThat(getJson("/api/notifications")).isEmpty();
    }

    @Test
    @DisplayName("S3-13: the daily alert job notifies once per level and emails owners only")
    void alertJobNotifiesOnceAndEmailsOwners() throws Exception {
        String memberEmail = "m-" + run + "@example.com";
        postJson("/api/family-members", Map.of("name", "Member", "email", memberEmail, "phone", "9000000001", "password", "Test@12345"));
        String month = YearMonth.now().toString();
        postJson("/api/budgets", Map.of("category", "Food", "amount", 1000, "month", month));
        postJson("/api/expenses", expense(950, "DEBIT", "Food", Map.of()));

        Runnable job = context.getBean("budgetAlertJob", Runnable.class);
        job.run();
        job.run();

        assertThat(getJson("/api/notifications")).hasSize(1);
        verify(emailService).sendEmail(eq(ownerEmail), any(), any());
        verify(emailService, never()).sendEmail(eq(memberEmail), any(), any());
    }

    // ---------- helpers ----------

    private String schedule(String type, String referenceId, int amount) throws Exception {
        Map<String, Object> body = Map.of("scheduleType", type, "institutionName", "Test", "description", type,
                "installments", List.of(Map.of("amount", amount, "dueDate", LocalDate.now().toString())));
        mvc.perform(auth(post("/api/ai/save-schedule?bankAccountId=" + accountId + "&referenceId=" + referenceId))
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isOk());
        for (JsonNode p : getJson("/api/transactions/scheduled/pending")) {
            if (p.get("amount").decimalValue().compareTo(BigDecimal.valueOf(amount)) == 0
                    && referenceId.equals(p.get("referenceId").asText())) {
                return p.get("id").asText();
            }
        }
        throw new AssertionError("scheduled payment missing");
    }

    private Map<String, Object> expense(int amount, String type, String category, Map<String, Object> extra) {
        Map<String, Object> e = new HashMap<>(Map.of("amount", amount, "type", type, "category", category,
                "expenseDate", LocalDate.now().toString(), "linkedAccount", Map.of("id", accountId)));
        e.putAll(extra);
        return e;
    }

    private org.springframework.test.web.servlet.ResultActions sendExpense(MockHttpServletRequestBuilder req, Object body) throws Exception {
        return mvc.perform(auth(req).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
    }

    private BigDecimal balance() throws Exception {
        return field("/api/bankaccounts", accountId, "currentBalance");
    }

    private BigDecimal budgetSpent(String month, String category) throws Exception {
        for (JsonNode b : getJson("/api/budgets/summary?month=" + month)) {
            if (category.equals(b.get("category").asText())) return new BigDecimal(b.get("spentAmount").asText());
        }
        throw new AssertionError("budget missing: " + category);
    }

    private BigDecimal field(String url, String id, String name) throws Exception {
        for (JsonNode n : getJson(url)) {
            if (id.equals(n.get("id").asText())) return new BigDecimal(n.get(name).asText());
        }
        throw new AssertionError("record missing: " + id);
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder req) {
        return req.header("Authorization", "Bearer " + token);
    }

    private JsonNode getJson(String url) throws Exception {
        return json.readTree(mvc.perform(auth(get(url))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private JsonNode postJson(String url, Object body) throws Exception {
        return json.readTree(mvc.perform(auth(post(url)).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
}
