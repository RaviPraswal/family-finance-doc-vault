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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sprint 5 (S5-03): a loan keeps the details its EMI schedule is built from. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint5LoanScheduleFieldsTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    String token;

    @BeforeEach
    void family() throws Exception {
        String run = UUID.randomUUID().toString().substring(0, 8);
        Map<String, Object> req = Map.of("familyName", "Loans " + run, "address", "x", "phone", "9000000000",
                "members", List.of(Map.of("name", "Owner", "email", "l-" + run + "@example.com", "password", "Test@12345", "phone", "9000000000", "isAdmin", true)));
        token = json.readTree(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(req)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    @DisplayName("S5-03: tenure, first EMI date, disbursement date, EMIs paid before FinNest and foreclosure terms are saved and returned")
    void scheduleFieldsRoundTrip() throws Exception {
        Map<String, Object> loan = new HashMap<>(Map.of("lenderName", "Test Bank", "principalAmount", 1000000, "outstandingAmount", 950000,
                "emiAmount", 20758, "interestRate", 9, "interestMethod", "DAILY_365"));
        loan.putAll(Map.of("tenureMonths", 60, "firstEmiDate", "2026-01-25", "disbursementDate", "2026-01-10",
                "paidInstallmentsOpening", 3, "foreclosureRate", 4, "foreclosureLockInMonths", 1));
        JsonNode saved = send(post("/api/loans"), loan);

        JsonNode got = json.readTree(mvc.perform(get("/api/loans").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get(0);
        assertThat(got.get("tenureMonths").asInt()).isEqualTo(60);
        assertThat(got.get("firstEmiDate").asText()).isEqualTo("2026-01-25");
        assertThat(got.get("disbursementDate").asText()).isEqualTo("2026-01-10");
        assertThat(got.get("paidInstallmentsOpening").asInt()).isEqualTo(3);
        assertThat(got.get("foreclosureRate").asDouble()).isEqualTo(4.0);
        assertThat(got.get("foreclosureLockInMonths").asInt()).isEqualTo(1);

        loan.put("paidInstallmentsOpening", 4);
        JsonNode updated = send(put("/api/loans/" + saved.get("id").asText()), loan);
        assertThat(updated.get("paidInstallmentsOpening").asInt()).isEqualTo(4);
    }

    private JsonNode send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder req, Object body) throws Exception {
        return json.readTree(mvc.perform(req.header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
}
