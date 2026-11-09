package com.finnest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.finnest.Sprint7Support.read;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sprint 8 · S8-1: the daily bank balance check posts any difference to the ledger as one adjustment entry. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint8BalanceCheckTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String account(String t, int opening) throws Exception {
        return read(mvc, json, post("/api/bankaccounts"), t, Map.of("bankName", "B", "accountType", "Savings", "openingBalance", opening)).get("id").asText();
    }

    private JsonNode check(String t, String acc, Object actual) throws Exception {
        return read(mvc, json, post("/api/bankaccounts/" + acc + "/balance-checks"), t, Map.of("actualBalance", actual, "checkDate", "2026-11-09"));
    }

    private BigDecimal balance(String t, String acc) throws Exception {
        for (JsonNode n : read(mvc, json, get("/api/bankaccounts"), t, null)) if (acc.equals(n.get("id").asText())) return n.get("currentBalance").decimalValue();
        throw new AssertionError("account missing");
    }

    private List<JsonNode> adjustments(String t, String acc) throws Exception {
        List<JsonNode> out = new ArrayList<>();
        for (JsonNode e : read(mvc, json, get("/api/expenses"), t, null)) {
            JsonNode link = e.get("linkedAccount");
            if ("Balance adjustment".equals(e.get("category").asText()) && link != null && !link.isNull() && acc.equals(link.get("id").asText())) out.add(e);
        }
        return out;
    }

    @Test
    @DisplayName("A lower real balance posts one debit for the exact difference and the balance then matches the bank")
    void lowerBalancePostsDebit() throws Exception {
        String t = Sprint7Support.family(mvc, json, "Chk").ownerToken();
        String acc = account(t, 1000);
        read(mvc, json, post("/api/expenses"), t, Map.of("amount", 5000, "category", "Salary", "expenseDate", "2026-11-01", "type", "CREDIT", "linkedAccount", Map.of("id", acc)));

        JsonNode r = check(t, acc, "5800.50");
        assertThat(r.get("ledgerBalance").decimalValue()).isEqualByComparingTo("6000");
        assertThat(r.get("actualBalance").decimalValue()).isEqualByComparingTo("5800.50");
        assertThat(r.get("difference").decimalValue()).isEqualByComparingTo("-199.50");
        assertThat(r.get("adjustmentId").isNull()).isFalse();

        List<JsonNode> adj = adjustments(t, acc);
        assertThat(adj).hasSize(1);
        assertThat(adj.get(0).get("type").asText()).isEqualTo("DEBIT");
        assertThat(adj.get(0).get("amount").decimalValue()).isEqualByComparingTo("199.50");
        assertThat(adj.get(0).get("expenseDate").asText()).isEqualTo("2026-11-09");
        assertThat(balance(t, acc)).isEqualByComparingTo("5800.50");
        assertThat(read(mvc, json, get("/api/ledger/drift"), t, null)).isEmpty();
    }

    @Test
    @DisplayName("A higher real balance posts a credit; a matching balance posts nothing but is still recorded as checked")
    void higherPostsCreditMatchingPostsNothing() throws Exception {
        String t = Sprint7Support.family(mvc, json, "Chk2").ownerToken();
        String acc = account(t, 1000);

        check(t, acc, 1250);
        assertThat(adjustments(t, acc)).singleElement().satisfies(e -> {
            assertThat(e.get("type").asText()).isEqualTo("CREDIT");
            assertThat(e.get("amount").decimalValue()).isEqualByComparingTo("250");
        });

        JsonNode same = check(t, acc, 1250);
        assertThat(same.get("difference").decimalValue()).isEqualByComparingTo("0");
        assertThat(same.get("adjustmentId").isNull()).isTrue();
        assertThat(adjustments(t, acc)).hasSize(1);

        JsonNode latest = read(mvc, json, get("/api/bankaccounts/balance-checks/latest"), t, null);
        assertThat(latest).hasSize(1);
        assertThat(latest.get(0).get("accountId").asText()).isEqualTo(acc);
        assertThat(latest.get(0).get("checkDate").asText()).isEqualTo("2026-11-09");
        assertThat(latest.get(0).get("difference").decimalValue()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("Only the account's family and owner may check it; a balance is required")
    void accessAndValidation() throws Exception {
        Sprint7Support.Family fam = Sprint7Support.family(mvc, json, "Chk3");
        String acc = account(fam.ownerToken(), 1000);
        String body = json.writeValueAsString(Map.of("actualBalance", 900, "checkDate", "2026-11-09"));

        mvc.perform(post("/api/bankaccounts/" + acc + "/balance-checks").header("Authorization", "Bearer " + fam.memberToken())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        String other = Sprint7Support.family(mvc, json, "Other").ownerToken();
        mvc.perform(post("/api/bankaccounts/" + acc + "/balance-checks").header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNotFound());
        mvc.perform(post("/api/bankaccounts/" + acc + "/balance-checks").header("Authorization", "Bearer " + fam.ownerToken())
                .contentType(MediaType.APPLICATION_JSON).content("{\"checkDate\":\"2026-11-09\"}")).andExpect(status().isBadRequest());
        assertThat(adjustments(fam.ownerToken(), acc)).isEmpty();
    }
}
