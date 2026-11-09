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

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import static com.finnest.Sprint7Support.read;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sprint 7 T4/T5 (SPEC P0-1, D-03): balances, loan outstanding and RD totals always equal the ledger. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint7DerivedTotalsTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;

    private JsonNode entry(String token, Map<String, Object> link, String type, int amount, String date) throws Exception {
        Map<String, Object> e = new HashMap<>(Map.of("amount", amount, "category", "Test", "expenseDate", date, "type", type));
        e.putAll(link);
        return read(mvc, json, post("/api/expenses"), token, e);
    }

    private BigDecimal field(String token, String url, String id, String name) throws Exception {
        for (JsonNode n : read(mvc, json, get(url), token, null)) if (id.equals(n.get("id").asText())) return n.get(name).decimalValue();
        throw new AssertionError(id + " not found in " + url);
    }

    @Test
    @DisplayName("T4: bank balance follows create, edit and delete of ledger entries to the paisa, and is stored")
    void bankBalanceFollowsLedger() throws Exception {
        String t = Sprint7Support.family(mvc, json, "Bal").ownerToken();
        String acc = read(mvc, json, post("/api/bankaccounts"), t, Map.of("bankName", "B", "accountType", "Savings", "openingBalance", 1000)).get("id").asText();
        Map<String, Object> link = Map.of("linkedAccount", Map.of("id", acc));
        JsonNode salary = entry(t, link, "CREDIT", 5000, "2026-11-01");
        JsonNode food = entry(t, link, "DEBIT", 1250, "2026-11-02");
        assertThat(field(t, "/api/bankaccounts", acc, "currentBalance")).isEqualByComparingTo("4750");

        Map<String, Object> edited = new HashMap<>(Map.of("amount", 1500, "category", "Test", "expenseDate", "2026-11-02", "type", "DEBIT"));
        edited.putAll(link);
        read(mvc, json, put("/api/expenses/" + food.get("id").asText()), t, edited);
        assertThat(field(t, "/api/bankaccounts", acc, "currentBalance")).isEqualByComparingTo("4500");

        mvc.perform(delete("/api/expenses/" + salary.get("id").asText()).header("Authorization", "Bearer " + t)).andExpect(status().isOk());
        assertThat(field(t, "/api/bankaccounts", acc, "currentBalance")).isEqualByComparingTo("-500");
        assertThat(read(mvc, json, get("/api/ledger/drift"), t, null)).isEmpty();
    }

    @Test
    @DisplayName("T5: EMIs reduce outstanding by their principal portion only; deleting one restores it exactly")
    void loanOutstandingFollowsLedger() throws Exception {
        String t = Sprint7Support.family(mvc, json, "Loan").ownerToken();
        String loan = read(mvc, json, post("/api/loans"), t, Map.of("lenderName", "L", "principalAmount", 100000, "outstandingAmount", 100000,
                "emiAmount", 10000, "interestRate", 12, "interestMethod", "MONTHLY")).get("id").asText();
        Map<String, Object> link = Map.of("linkedLoan", Map.of("id", loan));
        entry(t, link, "DEBIT", 10000, "2026-09-05");                      // interest 1,000 → principal 9,000
        JsonNode second = entry(t, link, "DEBIT", 10000, "2026-10-05");     // interest 910 → principal 9,090
        assertThat(field(t, "/api/loans", loan, "outstandingAmount")).isEqualByComparingTo("81910");

        mvc.perform(delete("/api/expenses/" + second.get("id").asText()).header("Authorization", "Bearer " + t)).andExpect(status().isOk());
        assertThat(field(t, "/api/loans", loan, "outstandingAmount")).isEqualByComparingTo("91000");
        assertThat(read(mvc, json, get("/api/ledger/drift"), t, null)).isEmpty();
    }

    @Test
    @DisplayName("T5: editing a loan's outstanding by hand is kept as a correction, and later EMIs still follow the ledger")
    void manualLoanCorrectionIsKept() throws Exception {
        String t = Sprint7Support.family(mvc, json, "Fix").ownerToken();
        Map<String, Object> body = new HashMap<>(Map.of("lenderName", "L", "principalAmount", 100000, "outstandingAmount", 100000,
                "emiAmount", 10000, "interestRate", 12, "interestMethod", "MONTHLY"));
        String loan = read(mvc, json, post("/api/loans"), t, body).get("id").asText();
        body.put("outstandingAmount", 95000);
        read(mvc, json, put("/api/loans/" + loan), t, body);
        assertThat(field(t, "/api/loans", loan, "outstandingAmount")).isEqualByComparingTo("95000");
        entry(t, Map.of("linkedLoan", Map.of("id", loan)), "DEBIT", 10000, "2026-09-05"); // interest 950 → principal 9,050
        assertThat(field(t, "/api/loans", loan, "outstandingAmount")).isEqualByComparingTo("85950");
    }

    @Test
    @DisplayName("T5: an RD's total deposited adds instalments from the ledger and keeps its monthly amount")
    void rdTotalFollowsLedger() throws Exception {
        String t = Sprint7Support.family(mvc, json, "Rd").ownerToken();
        String rd = read(mvc, json, post("/api/deposits"), t, Map.of("type", "RD", "institution", "Axis Test", "monthlyDepositAmount", 5000,
                "totalDeposited", 10000, "interestRate", 7, "startDate", "2026-07-05")).get("id").asText();
        JsonNode inst = entry(t, Map.of("linkedDeposit", Map.of("id", rd)), "DEBIT", 5000, "2026-11-05");
        assertThat(field(t, "/api/deposits", rd, "totalDeposited")).isEqualByComparingTo("15000");
        assertThat(field(t, "/api/deposits", rd, "monthlyDepositAmount")).isEqualByComparingTo("5000");
        mvc.perform(delete("/api/expenses/" + inst.get("id").asText()).header("Authorization", "Bearer " + t)).andExpect(status().isOk());
        assertThat(field(t, "/api/deposits", rd, "totalDeposited")).isEqualByComparingTo("10000");
    }

    @Test
    @DisplayName("T4/T5: a stored total changed behind the ledger's back (import, manual SQL) heals on the next entry instead of compounding")
    void tamperedTotalsHealOnNextEntry() throws Exception {
        String t = Sprint7Support.family(mvc, json, "Heal").ownerToken();
        String acc = read(mvc, json, post("/api/bankaccounts"), t, Map.of("bankName", "B", "accountType", "Savings", "openingBalance", 1000)).get("id").asText();
        jdbc.update("update bank_accounts set current_balance = 999999 where id = ?", java.util.UUID.fromString(acc));
        entry(t, Map.of("linkedAccount", Map.of("id", acc)), "DEBIT", 100, "2026-11-03");
        assertThat(jdbc.queryForObject("select current_balance from bank_accounts where id = ?", BigDecimal.class, java.util.UUID.fromString(acc)))
                .isEqualByComparingTo("900");
    }
}
