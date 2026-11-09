package com.finnest;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static com.finnest.Sprint7Support.read;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sprint 7 T10 (SPEC P0-5): list screens run the same number of queries for 1 row as for 10. */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint7QueryCountTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired EntityManagerFactory emf;

    /** A family with n accounts, each with a loan, a chit and a ledger entry linked to all three. */
    private String familyWith(int n) throws Exception {
        String t = Sprint7Support.family(mvc, json, "Q" + n).ownerToken();
        for (int i = 0; i < n; i++) {
            String acc = read(mvc, json, post("/api/bankaccounts"), t, Map.of("bankName", "B" + i, "accountType", "Savings", "openingBalance", 1000)).get("id").asText();
            String loan = read(mvc, json, post("/api/loans"), t, Map.of("lenderName", "L" + i, "principalAmount", 1000, "outstandingAmount", 1000,
                    "emiAmount", 100, "interestRate", 12, "linkedAccount", Map.of("id", acc))).get("id").asText();
            String chit = read(mvc, json, post("/api/chitfunds"), t, Map.of("organizerName", "C" + i, "totalValue", 10000, "durationMonths", 10,
                    "monthlyInstallment", 1000, "linkedAccount", Map.of("id", acc))).get("id").asText();
            read(mvc, json, post("/api/expenses"), t, Map.of("amount", 100, "category", "Q", "expenseDate", "2026-11-0" + (1 + i % 9), "type", "DEBIT",
                    "linkedAccount", Map.of("id", acc), "linkedLoan", Map.of("id", loan), "linkedChitFund", Map.of("id", chit)));
        }
        return t;
    }

    private long queriesFor(String url, String token) throws Exception {
        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.clear();
        mvc.perform(get(url).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        return stats.getPrepareStatementCount();
    }

    @Test
    @DisplayName("T10: bank accounts, loans, chits and ledger lists do not run a query per row")
    void constantQueriesPerList() throws Exception {
        String one = familyWith(1), ten = familyWith(10);
        for (String url : new String[] {"/api/bankaccounts", "/api/loans", "/api/chitfunds", "/api/expenses"}) {
            long small = queriesFor(url, one), large = queriesFor(url, ten);
            assertThat(large).as(url + " queries for 10 rows vs 1 row (" + small + ")").isEqualTo(small);
        }
    }
}
