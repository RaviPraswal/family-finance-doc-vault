package com.finnest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;

import static com.finnest.Sprint7Support.read;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Sprint 9 stage 2: spending limits are on the seven plain Money Out groups; old budgets and entries are mapped, not rewritten. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint9BudgetGroupsTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private Map<String, JsonNode> summary(String token) throws Exception {
        Map<String, JsonNode> rows = new HashMap<>();
        for (JsonNode n : read(mvc, json, get("/api/budgets/summary?month=2026-11"), token, null)) {
            assertThat(rows.put(n.get("category").asText(), n)).as("one row per group").isNull();
        }
        return rows;
    }

    private void spend(String token, int amount, String category) throws Exception {
        read(mvc, json, post("/api/expenses"), token, Map.of("amount", amount, "category", category, "expenseDate", "2026-11-05", "type", "DEBIT"));
    }

    @Test
    @DisplayName("The summary has the seven groups; old categories and an old budget land in their group")
    void sevenGroups() throws Exception {
        String owner = Sprint7Support.family(mvc, json, "Grp").ownerToken();
        spend(owner, 12000, "Rent");
        spend(owner, 800, "Electricity");
        spend(owner, 4000, "Groceries");
        spend(owner, 300, "Misc");
        read(mvc, json, post("/api/expenses"), owner, Map.of("amount", 5000, "category", "Investment", "expenseDate", "2026-11-06", "type", "DEBIT"));
        read(mvc, json, post("/api/budgets"), owner, Map.of("category", "Bills", "amount", 20000, "month", "2026-11")); // an old-style budget
        read(mvc, json, post("/api/budgets"), owner, Map.of("category", "Investments", "amount", 9000, "month", "2026-11")); // not spending

        Map<String, JsonNode> rows = summary(owner);
        assertThat(rows.keySet()).containsExactlyInAnyOrder("Home & bills", "Food & daily needs", "Transport & travel", "Health & insurance",
                "Education & children", "Shopping & fun", "Family & giving", "Not sorted yet");
        assertThat(rows.get("Home & bills").get("spentAmount").decimalValue()).isEqualByComparingTo("12800");
        assertThat(rows.get("Home & bills").get("limitAmount").decimalValue()).isEqualByComparingTo("20000");
        assertThat(rows.get("Food & daily needs").get("spentAmount").decimalValue()).isEqualByComparingTo("4000");
        assertThat(rows.get("Not sorted yet").get("spentAmount").decimalValue()).isEqualByComparingTo("300");
        assertThat(rows.get("Transport & travel").get("spentAmount").decimalValue()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("A new limit on the group replaces the old-name budget in the summary; with nothing unsorted there is no extra row")
    void newLimitWins() throws Exception {
        String owner = Sprint7Support.family(mvc, json, "Grp2").ownerToken();
        spend(owner, 1000, "Bills");
        read(mvc, json, post("/api/budgets"), owner, Map.of("category", "Bills", "amount", 20000, "month", "2026-11"));
        read(mvc, json, post("/api/budgets"), owner, Map.of("category", "Home & bills", "amount", 15000, "month", "2026-11"));

        Map<String, JsonNode> rows = summary(owner);
        assertThat(rows).hasSize(7).doesNotContainKey("Not sorted yet");
        assertThat(rows.get("Home & bills").get("limitAmount").decimalValue()).isEqualByComparingTo("15000");
        assertThat(rows.get("Home & bills").get("spentAmount").decimalValue()).isEqualByComparingTo("1000");
    }
}
