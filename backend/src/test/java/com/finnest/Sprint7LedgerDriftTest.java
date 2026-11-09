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

import java.util.Map;
import java.util.UUID;

import static com.finnest.Sprint7Support.read;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sprint 7 T3 (SPEC P0-1): a read-only report of every stored total that differs from the ledger. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint7LedgerDriftTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @Test
    @DisplayName("T3: lists a tampered bank balance and loan with the exact difference; matching rows are not listed")
    void reportsOnlyMismatches() throws Exception {
        var fam = Sprint7Support.family(mvc, json, "Drift");
        JsonNode acc = read(mvc, json, post("/api/bankaccounts"), fam.ownerToken(),
                Map.of("bankName", "Drift Bank", "accountType", "Savings", "openingBalance", 1000));
        read(mvc, json, post("/api/expenses"), fam.ownerToken(), Map.of("amount", 200, "category", "Food", "expenseDate", "2026-11-01",
                "type", "DEBIT", "linkedAccount", Map.of("id", acc.get("id").asText())));
        JsonNode okAcc = read(mvc, json, post("/api/bankaccounts"), fam.ownerToken(),
                Map.of("bankName", "Clean Bank", "accountType", "Savings", "openingBalance", 500));
        JsonNode loan = read(mvc, json, post("/api/loans"), fam.ownerToken(),
                Map.of("lenderName", "Drift Loan", "principalAmount", 100000, "outstandingAmount", 100000, "emiAmount", 5000, "interestRate", 12));

        // An import or a manual DB edit changes stored totals behind the ledger's back.
        jdbc.update("update bank_accounts set current_balance = 999 where id = ?", UUID.fromString(acc.get("id").asText()));
        jdbc.update("update loans set outstanding_amount = 90000 where id = ?", UUID.fromString(loan.get("id").asText()));

        JsonNode drift = read(mvc, json, get("/api/ledger/drift"), fam.ownerToken(), null);
        assertThat(drift).hasSize(2);
        JsonNode bank = find(drift, acc.get("id").asText());
        assertThat(bank.get("entity").asText()).isEqualTo("BANK_ACCOUNT");
        assertThat(bank.get("stored").decimalValue()).isEqualByComparingTo("999");
        assertThat(bank.get("ledger").decimalValue()).isEqualByComparingTo("800");
        assertThat(bank.get("difference").decimalValue()).isEqualByComparingTo("199");
        JsonNode l = find(drift, loan.get("id").asText());
        assertThat(l.get("entity").asText()).isEqualTo("LOAN");
        assertThat(l.get("ledger").decimalValue()).isEqualByComparingTo("100000");
        assertThat(l.get("difference").decimalValue()).isEqualByComparingTo("-10000");
        assertThat(drift.toString()).doesNotContain(okAcc.get("id").asText());
    }

    @Test
    @DisplayName("T3: a MEMBER cannot see the drift report, and another family's rows never appear")
    void ownerOnlyAndTenantScoped() throws Exception {
        var fam = Sprint7Support.family(mvc, json, "DriftA");
        var other = Sprint7Support.family(mvc, json, "DriftB");
        JsonNode theirs = read(mvc, json, post("/api/bankaccounts"), other.ownerToken(),
                Map.of("bankName", "Other Bank", "accountType", "Savings", "openingBalance", 100));
        jdbc.update("update bank_accounts set current_balance = 1 where id = ?", UUID.fromString(theirs.get("id").asText()));

        mvc.perform(get("/api/ledger/drift").header("Authorization", "Bearer " + fam.memberToken())).andExpect(status().isForbidden());
        JsonNode mine = read(mvc, json, get("/api/ledger/drift"), fam.ownerToken(), null);
        assertThat(mine.toString()).doesNotContain(theirs.get("id").asText());
    }

    private static JsonNode find(JsonNode list, String id) {
        for (JsonNode n : list) if (id.equals(n.get("id").asText())) return n;
        throw new AssertionError("not in drift report: " + id);
    }
}
