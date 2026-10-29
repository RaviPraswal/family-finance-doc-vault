package com.finnest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sprint 2: loan EMIs reduce only principal; udhaar keeps its history. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class MoneyCorrectnessTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    String token, accountId;

    @BeforeEach
    void family() throws Exception {
        String email = "m-" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        Map<String, Object> req = Map.of("familyName", "Money test", "address", "x", "phone", "9000000000",
                "members", List.of(Map.of("name", "Owner", "email", email, "password", "Test@12345", "phone", "9000000000", "isAdmin", true)));
        token = json.readTree(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(req)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
        accountId = postJson("/api/bankaccounts", Map.of("bankName", "SBI", "accountNumber", "X1", "openingBalance", 100000)).get("id").asText();
    }

    @Test
    @DisplayName("An EMI reduces the loan by its principal part only, and deleting it restores the balance exactly")
    void emiReducesPrincipalOnly() throws Exception {
        String loanId = postJson("/api/loans", Map.of("lenderName", "SBI", "outstandingAmount", 1500000, "interestRate", 10.5, "emiAmount", 16581)).get("id").asText();

        JsonNode exp = postJson("/api/expenses", expense(16581, "DEBIT", Map.of("linkedLoan", Map.of("id", loanId))));
        assertThat(new BigDecimal(exp.get("loanPrincipalPortion").asText())).isEqualByComparingTo("3456.00");
        assertThat(new BigDecimal(exp.get("loanInterestPortion").asText())).isEqualByComparingTo("13125.00");
        assertThat(outstanding(loanId)).isEqualByComparingTo("1496544.00");

        mvc.perform(auth(delete("/api/expenses/" + exp.get("id").asText()))).andExpect(status().isOk());
        assertThat(outstanding(loanId)).isEqualByComparingTo("1500000");
    }

    @Test
    @DisplayName("Editing an EMI's amount re-splits it against the restored balance")
    void editingEmiResplits() throws Exception {
        String loanId = postJson("/api/loans", Map.of("lenderName", "SBI", "outstandingAmount", 1500000, "interestRate", 10.5, "emiAmount", 16581)).get("id").asText();
        JsonNode exp = postJson("/api/expenses", expense(16581, "DEBIT", Map.of("linkedLoan", Map.of("id", loanId))));

        Map<String, Object> edited = expense(20000, "DEBIT", Map.of("linkedLoan", Map.of("id", loanId)));
        mvc.perform(auth(put("/api/expenses/" + exp.get("id").asText())).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(edited))).andExpect(status().isOk());

        // 20,000 − 13,125 interest = 6,875 principal
        assertThat(outstanding(loanId)).isEqualByComparingTo("1493125.00");
    }

    @Test
    @DisplayName("Daily-interest loans charge for the actual days since the previous EMI")
    void dailyLoanUsesDaysSincePreviousEmi() throws Exception {
        String loanId = postJson("/api/loans", Map.of("lenderName", "Bank", "outstandingAmount", 1000000, "interestRate", 10.0,
                "emiAmount", 25000, "interestMethod", "DAILY_365")).get("id").asText();
        LocalDate first = LocalDate.of(2026, 7, 4);
        Map<String, Object> e1 = expense(25000, "DEBIT", Map.of("linkedLoan", Map.of("id", loanId)));
        e1.put("expenseDate", first.toString());
        postJson("/api/expenses", e1);   // no earlier EMI: 30 days assumed → interest 8,219.18

        Map<String, Object> e2 = expense(25000, "DEBIT", Map.of("linkedLoan", Map.of("id", loanId)));
        e2.put("expenseDate", first.plusDays(31).toString());
        JsonNode second = postJson("/api/expenses", e2);
        // 31 days on 9,83,219.18 at 10% = 8,350.63
        assertThat(new BigDecimal(second.get("loanInterestPortion").asText())).isEqualByComparingTo("8350.63");
    }

    @Test
    @DisplayName("Moving a daily-loan EMI to a later date counts days from the previous EMI, not from itself")
    void editingDailyEmiDateUsesPreviousPayment() throws Exception {
        String loanId = postJson("/api/loans", Map.of("lenderName", "Bank", "outstandingAmount", 1000000, "interestRate", 10.0,
                "emiAmount", 25000, "interestMethod", "DAILY_365")).get("id").asText();
        LocalDate first = LocalDate.of(2026, 7, 4);
        Map<String, Object> e1 = expense(25000, "DEBIT", Map.of("linkedLoan", Map.of("id", loanId)));
        e1.put("expenseDate", first.toString());
        postJson("/api/expenses", e1);
        Map<String, Object> e2 = expense(25000, "DEBIT", Map.of("linkedLoan", Map.of("id", loanId)));
        e2.put("expenseDate", first.plusDays(31).toString());
        String secondId = postJson("/api/expenses", e2).get("id").asText();

        e2.put("expenseDate", first.plusDays(35).toString());
        JsonNode edited = json.readTree(mvc.perform(auth(put("/api/expenses/" + secondId)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(e2))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        // 35 days on 9,83,219.18 at 10% = 9,428.13 (the bug gave 4 days = 1,077.50)
        assertThat(new BigDecimal(edited.get("loanInterestPortion").asText())).isEqualByComparingTo("9428.13");
    }

    @Test
    @DisplayName("Udhaar repayments are tracked; the original amount is kept")
    void udhaarKeepsPrincipal() throws Exception {
        String udhaarId = postJson("/api/peerlendings", Map.of("type", "GIVEN", "personName", "Ramesh", "amount", 20000)).get("id").asText();
        JsonNode exp = postJson("/api/expenses", expense(5000, "CREDIT", Map.of("linkedPeerLending", Map.of("id", udhaarId))));

        JsonNode u = find("/api/peerlendings", udhaarId);
        assertThat(new BigDecimal(u.get("amount").asText())).isEqualByComparingTo("15000");
        assertThat(new BigDecimal(u.get("principalAmount").asText())).isEqualByComparingTo("20000");
        assertThat(new BigDecimal(u.get("repaidAmount").asText())).isEqualByComparingTo("5000");

        mvc.perform(auth(delete("/api/expenses/" + exp.get("id").asText()))).andExpect(status().isOk());
        u = find("/api/peerlendings", udhaarId);
        assertThat(new BigDecimal(u.get("amount").asText())).isEqualByComparingTo("20000");
        assertThat(new BigDecimal(u.get("repaidAmount").asText())).isEqualByComparingTo("0");
    }

    // ---------- helpers ----------

    private Map<String, Object> expense(int amount, String type, Map<String, Object> links) {
        Map<String, Object> m = new HashMap<>(links);
        m.put("amount", amount);
        m.put("type", type);
        m.put("category", "EMI");
        m.put("expenseDate", LocalDate.now().toString());
        m.put("linkedAccount", Map.of("id", accountId));
        return m;
    }

    private BigDecimal outstanding(String loanId) throws Exception {
        return new BigDecimal(find("/api/loans", loanId).get("outstandingAmount").asText());
    }

    private JsonNode find(String url, String id) throws Exception {
        for (JsonNode n : json.readTree(mvc.perform(auth(get(url))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString())) {
            if (n.get("id").asText().equals(id)) return n;
        }
        throw new AssertionError("not found: " + id);
    }

    private JsonNode postJson(String url, Object body) throws Exception {
        return json.readTree(mvc.perform(auth(post(url)).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder r) {
        return r.header("Authorization", "Bearer " + token);
    }
}
