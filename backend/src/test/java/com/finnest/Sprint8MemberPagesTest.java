package com.finnest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static com.finnest.Sprint7Support.read;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sprint 8 fixes reported by Ravi as a family member (2026-11-09). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint8MemberPagesTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @Test
    @DisplayName("A chit stays active until its owner marks it closed, and can be reopened; edits keep the other fields")
    void chitClosedFlag() throws Exception {
        String m = Sprint7Support.family(mvc, json, "Chit").memberToken();
        JsonNode chit = read(mvc, json, post("/api/chitfunds"), m, Map.of("organizerName", "Committee", "memberName", "M",
                "totalValue", 50000, "monthlyInstallment", 5000, "durationMonths", 10, "startDate", "2026-04-01",
                "isAllotted", true, "allottedAmount", 49550));
        assertThat(chit.get("isClosed").asBoolean()).isFalse();

        Map<String, Object> edit = json.convertValue(chit, HashMap.class);
        edit.put("isClosed", true);
        edit.put("organizerName", "Committee 04/26");
        JsonNode closed = read(mvc, json, put("/api/chitfunds/" + chit.get("id").asText()), m, edit);
        assertThat(closed.get("isClosed").asBoolean()).isTrue();
        assertThat(closed.get("organizerName").asText()).isEqualTo("Committee 04/26");
        assertThat(closed.get("allottedAmount").decimalValue()).isEqualByComparingTo("49550");
        assertThat(closed.get("closedOn").asText()).isNotBlank();

        edit.put("isClosed", false);
        JsonNode reopened = read(mvc, json, put("/api/chitfunds/" + chit.get("id").asText()), m, edit);
        assertThat(reopened.get("isClosed").asBoolean()).isFalse();
        assertThat(reopened.get("closedOn").isNull()).isTrue();
    }

    @Test
    @DisplayName("Budgets load even with a blank-category entry and a duplicated budget row")
    void budgetsRobust() throws Exception {
        Sprint7Support.Family fam = Sprint7Support.family(mvc, json, "Bud");
        read(mvc, json, post("/api/expenses"), fam.memberToken(), Map.of("amount", 120, "category", "Daily Life", "expenseDate", "2026-11-05", "type", "DEBIT"));
        JsonNode budget = read(mvc, json, post("/api/budgets"), fam.ownerToken(), Map.of("category", "Daily Life", "amount", 5000, "month", "2026-11"));
        UUID tenant = UUID.fromString(budget.get("tenantId").asText());
        jdbc.update("UPDATE expenses SET category = '' WHERE tenant_id = ?", tenant);
        jdbc.update("INSERT INTO budgets (id, tenant_id, category, amount, month, rollover, email_alert, created_at, updated_at) "
                + "VALUES (?, ?, 'Daily Life', 3000, '2026-11', false, false, now(), now())", UUID.randomUUID(), tenant);

        for (String t : new String[] { fam.ownerToken(), fam.memberToken() }) {
            mvc.perform(get("/api/budgets/summary?month=2026-11").header("Authorization", "Bearer " + t)).andExpect(status().isOk());
            mvc.perform(get("/api/budgets/obligations?month=2026-11").header("Authorization", "Bearer " + t)).andExpect(status().isOk());
            mvc.perform(post("/api/budgets").header("Authorization", "Bearer " + t).contentType("application/json")
                    .content("{\"category\":\"Daily Life\",\"amount\":6000,\"month\":\"2026-11\"}")).andExpect(status().isOk());
        }
    }
}
