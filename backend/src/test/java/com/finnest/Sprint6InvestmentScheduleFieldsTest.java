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

/** Sprint 6 (S6-04): a Sukanya Samriddhi investment keeps what its year-by-year schedule is built from. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint6InvestmentScheduleFieldsTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    String token;

    @BeforeEach
    void family() throws Exception {
        String run = UUID.randomUUID().toString().substring(0, 8);
        Map<String, Object> req = Map.of("familyName", "Ssy " + run, "address", "x", "phone", "9000000000",
                "members", List.of(Map.of("name", "Owner", "email", "s-" + run + "@example.com", "password", "Test@12345", "phone", "9000000000", "isAdmin", true)));
        token = json.readTree(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(req)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    @DisplayName("S6-04: start date, yearly deposit and interest rate of an investment are saved and returned")
    void scheduleFieldsRoundTrip() throws Exception {
        Map<String, Object> inv = new HashMap<>(Map.of("type", "Sukanya Samriddhi", "name", "Test daughter SSY",
                "investedAmount", 30000, "currentValue", 30000,
                "startDate", "2024-04-10", "yearlyContribution", 15000, "interestRate", 8.2));
        JsonNode saved = send(post("/api/investments"), inv);

        JsonNode got = json.readTree(mvc.perform(get("/api/investments").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get(0);
        assertThat(got.get("startDate").asText()).isEqualTo("2024-04-10");
        assertThat(got.get("yearlyContribution").asDouble()).isEqualTo(15000.0);
        assertThat(got.get("interestRate").asDouble()).isEqualTo(8.2);

        inv.put("yearlyContribution", 20000);
        JsonNode updated = send(put("/api/investments/" + saved.get("id").asText()), inv);
        assertThat(updated.get("yearlyContribution").asDouble()).isEqualTo(20000.0);
    }

    private JsonNode send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder req, Object body) throws Exception {
        return json.readTree(mvc.perform(req.header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
}
