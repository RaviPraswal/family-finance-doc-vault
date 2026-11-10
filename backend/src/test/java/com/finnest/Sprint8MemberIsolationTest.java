package com.finnest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finnest.ai.FinancialAdvisorService;
import com.finnest.goal.Goal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.finnest.Sprint7Support.read;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Sprint 8 (Ravi, 2026-11-10): a member saw the owner's Quick Logger templates. D-02 — a MEMBER sees only their own
 * rows. Covers quick templates and every other screen that still read the whole family's rows for a member.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint8MemberIsolationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @MockBean FinancialAdvisorService advisor;

    private JsonNode get(String url, String token) throws Exception {
        return read(mvc, json, org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(url), token, null);
    }

    private int code(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder req, String token) throws Exception {
        return mvc.perform(req.header("Authorization", "Bearer " + token)).andReturn().getResponse().getStatus();
    }

    @Test
    @DisplayName("Quick Logger templates are per person: nobody sees, edits or deletes anyone else's")
    void quickTemplatesPerUser() throws Exception {
        Sprint7Support.Family fam = Sprint7Support.family(mvc, json, "Tpl");
        assertThat(get("/api/quick-templates", fam.memberToken())).isEmpty(); // a new member starts empty — no built-in samples

        JsonNode salary = read(mvc, json, post("/api/quick-templates"), fam.ownerToken(), Map.of("name", "Monthly Salary",
                "amount", 50000, "category", "Wages", "type", "CREDIT", "madeAgainst", "INCOME_SOURCE"));
        assertThat(salary.get("amount").decimalValue()).isEqualByComparingTo("50000");
        String ownerTpl = salary.get("id").asText();

        assertThat(get("/api/quick-templates", fam.memberToken())).isEmpty();
        JsonNode own = read(mvc, json, post("/api/quick-templates"), fam.memberToken(), Map.of("name", "Bus pass",
                "amount", 300, "category", "Daily Life", "type", "DEBIT", "madeAgainst", "MANUAL_ENTRY"));
        assertThat(get("/api/quick-templates", fam.memberToken())).extracting(n -> n.get("name").asText()).containsExactly("Bus pass");
        assertThat(get("/api/quick-templates", fam.ownerToken())).extracting(n -> n.get("name").asText()).containsExactly("Monthly Salary");

        assertThat(code(delete("/api/quick-templates/" + ownerTpl), fam.memberToken())).isEqualTo(404);
        assertThat(code(put("/api/quick-templates/" + ownerTpl).contentType("application/json")
                .content("{\"name\":\"x\",\"amount\":1,\"category\":\"Wages\",\"type\":\"CREDIT\"}"), fam.memberToken())).isEqualTo(404);
        assertThat(code(delete("/api/quick-templates/" + own.get("id").asText()), fam.ownerToken())).isEqualTo(404);
        assertThat(get("/api/quick-templates", fam.ownerToken())).hasSize(1);

        JsonNode renamed = read(mvc, json, put("/api/quick-templates/" + own.get("id").asText()), fam.memberToken(),
                Map.of("name", "Metro pass", "amount", 450, "category", "Daily Life", "type", "DEBIT", "madeAgainst", "MANUAL_ENTRY"));
        assertThat(renamed.get("name").asText()).isEqualTo("Metro pass");
        assertThat(code(delete("/api/quick-templates/" + own.get("id").asText()), fam.memberToken())).isEqualTo(204);
        assertThat(get("/api/quick-templates", fam.memberToken())).isEmpty();

        // another family never sees them either
        Sprint7Support.Family other = Sprint7Support.family(mvc, json, "Tpl2");
        assertThat(get("/api/quick-templates", other.ownerToken())).isEmpty();
        assertThat(code(delete("/api/quick-templates/" + ownerTpl), other.ownerToken())).isEqualTo(404);

        // a template cannot be bad data
        assertThat(code(post("/api/quick-templates").contentType("application/json")
                .content("{\"name\":\"\",\"amount\":-5,\"category\":\"Wages\",\"type\":\"CREDIT\"}"), fam.ownerToken())).isEqualTo(400);
    }

    @Test
    @DisplayName("Budgets: a member sees only their own spending and budgets, and saving one never overwrites the owner's")
    void budgetsPerMember() throws Exception {
        Sprint7Support.Family fam = Sprint7Support.family(mvc, json, "Bdg");
        read(mvc, json, post("/api/expenses"), fam.ownerToken(), Map.of("amount", 900, "category", "Bills", "expenseDate", "2026-11-05", "type", "DEBIT"));
        read(mvc, json, post("/api/budgets"), fam.ownerToken(), Map.of("category", "Bills", "amount", 5000, "month", "2026-11"));

        JsonNode memberBills = bills(get("/api/budgets/summary?month=2026-11", fam.memberToken()));
        assertThat(memberBills.get("spentAmount").decimalValue()).isEqualByComparingTo("0");
        assertThat(memberBills.get("limitAmount").decimalValue()).isEqualByComparingTo("0");

        read(mvc, json, post("/api/expenses"), fam.memberToken(), Map.of("amount", 120, "category", "Bills", "expenseDate", "2026-11-06", "type", "DEBIT"));
        read(mvc, json, post("/api/budgets"), fam.memberToken(), Map.of("category", "Bills", "amount", 1000, "month", "2026-11"));
        memberBills = bills(get("/api/budgets/summary?month=2026-11", fam.memberToken()));
        assertThat(memberBills.get("spentAmount").decimalValue()).isEqualByComparingTo("120");
        assertThat(memberBills.get("limitAmount").decimalValue()).isEqualByComparingTo("1000");

        JsonNode ownerBills = bills(get("/api/budgets/summary?month=2026-11", fam.ownerToken()));
        assertThat(ownerBills.get("limitAmount").decimalValue()).isEqualByComparingTo("5000"); // the family budget is untouched
        assertThat(ownerBills.get("spentAmount").decimalValue()).isEqualByComparingTo("1020"); // the owner sees the family

        assertThat(code(delete("/api/budgets/" + ownerBills.get("id").asText()), fam.memberToken())).isEqualTo(403);
    }

    private static JsonNode bills(JsonNode summary) {
        for (JsonNode s : summary) if ("Bills".equals(s.get("category").asText())) return s;
        throw new AssertionError("no Bills row");
    }

    @Test
    @DisplayName("Obligations, notifications, almirah and AI advice: a member gets only their own")
    void otherScreensPerMember() throws Exception {
        Sprint7Support.Family fam = Sprint7Support.family(mvc, json, "Iso");
        JsonNode account = read(mvc, json, post("/api/bankaccounts"), fam.ownerToken(), Map.of("bankName", "Owner Bank",
                "accountType", "Savings", "openingBalance", 1000));
        UUID tenant = UUID.fromString(account.get("tenantId").asText());
        UUID owner = UUID.fromString(account.get("userId").asText());

        // obligations
        jdbc.update("INSERT INTO scheduled_payments (id, tenant_id, user_id, amount, due_date, bank_account_id, reference_id, reference_type, status, "
                + "transaction_type, created_at, updated_at) VALUES (?, ?, ?, 4500, '2026-11-15', ?, ?, 'LOAN_EMI', 'PENDING', 'DEBIT', now(), now())",
                UUID.randomUUID(), tenant, owner, UUID.fromString(account.get("id").asText()), UUID.randomUUID());
        assertThat(get("/api/budgets/obligations?month=2026-11", fam.memberToken()).get("obligations")).isEmpty();
        assertThat(get("/api/budgets/obligations?month=2026-11", fam.ownerToken()).get("obligations")).hasSize(1);

        // notifications: the owner's own and a family-wide one stay with the owner
        UUID ownerNote = UUID.randomUUID();
        jdbc.update("INSERT INTO notifications (id, tenant_id, user_id, message, is_read, created_at, updated_at) VALUES (?, ?, ?, 'Owner passport expiring', false, now(), now())",
                ownerNote, tenant, owner);
        jdbc.update("INSERT INTO notifications (id, tenant_id, message, is_read, created_at, updated_at) VALUES (?, ?, 'Budget alert (BUDGET_Bills)', false, now(), now())",
                UUID.randomUUID(), tenant);
        assertThat(get("/api/notifications", fam.memberToken())).isEmpty();
        assertThat(get("/api/notifications/unread", fam.memberToken())).isEmpty();
        assertThat(get("/api/notifications", fam.ownerToken())).hasSize(2);
        assertThat(code(put("/api/notifications/" + ownerNote + "/read"), fam.memberToken())).isEqualTo(403);
        mvc.perform(put("/api/notifications/read-all").header("Authorization", "Bearer " + fam.memberToken())).andExpect(status().isOk());
        assertThat(get("/api/notifications/unread", fam.ownerToken())).hasSize(2); // the member's "read all" leaves the owner's alone

        // physical almirah
        UUID doc = UUID.randomUUID();
        jdbc.update("INSERT INTO documents (id, tenant_id, user_id, uploaded_by, name, category, type, file_path, size, created_at, updated_at) "
                + "VALUES (?, ?, ?, ?, 'Owner passport', 'Identity', 'application/pdf', 'x/y.pdf', 10, now(), now())", doc, tenant, owner, owner);
        assertThat(get("/api/physical-documents/stats", fam.memberToken()).get("totalDocuments").asLong()).isZero();
        assertThat(get("/api/physical-documents/stats", fam.ownerToken()).get("totalDocuments").asLong()).isEqualTo(1);
        assertThat(code(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/physical-documents/" + doc), fam.memberToken())).isEqualTo(403);
        assertThat(code(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/physical-documents/" + doc + "/logs"), fam.memberToken())).isEqualTo(403);
        assertThat(code(post("/api/physical-documents/" + doc + "/check-out").contentType("application/json")
                .content("{\"borrowerName\":\"x\"}"), fam.memberToken())).isEqualTo(403);

        // AI advice is built from the member's own goals only
        read(mvc, json, post("/api/goals"), fam.ownerToken(), Map.of("name", "Owner car", "targetAmount", 500000,
                "targetDate", "2028-01-01", "priority", "HIGH"));
        when(advisor.insights(anyList(), anyList())).thenReturn(new FinancialAdvisorService.Insights(true, null, List.of()));
        get("/api/ai/recommendations", fam.memberToken());
        @SuppressWarnings("unchecked") ArgumentCaptor<List<Goal>> goals = ArgumentCaptor.forClass(List.class);
        verify(advisor).insights(goals.capture(), any());
        assertThat(goals.getValue()).isEmpty();
    }
}
