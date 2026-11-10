package com.finnest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * Sprint 8 fix: a browser session must be able to save more than once. Found end-to-end on 2026-11-09:
 * every authenticated response cleared the XSRF-TOKEN cookie, so the second save after login got 403
 * (Add Funds after creating a goal, updating a side income source after recording a payment, editing a chit).
 * This test behaves like a browser: it keeps a cookie jar and echoes whatever XSRF-TOKEN it currently holds.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint8BrowserSessionTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    /** A tiny browser cookie jar: applies Set-Cookie headers, removing cookies sent with Max-Age=0. */
    static final class Browser {
        final Map<String, String> jar = new LinkedHashMap<>();
        final MockMvc mvc;
        Browser(MockMvc mvc) { this.mvc = mvc; }

        MockHttpServletResponse send(MockHttpServletRequestBuilder req, String body) throws Exception {
            if (!jar.isEmpty()) req.cookie(jar.entrySet().stream().map(e -> new Cookie(e.getKey(), e.getValue())).toArray(Cookie[]::new));
            String xsrf = jar.get("XSRF-TOKEN");
            if (xsrf != null) req.header("X-XSRF-TOKEN", xsrf);
            if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(body);
            MockHttpServletResponse r = mvc.perform(req).andReturn().getResponse();
            for (String h : r.getHeaders("Set-Cookie")) {
                String nameValue = h.split(";", 2)[0];
                String name = nameValue.substring(0, nameValue.indexOf('='));
                String value = nameValue.substring(nameValue.indexOf('=') + 1);
                if (h.contains("Max-Age=0") || value.isEmpty()) jar.remove(name); else jar.put(name, value);
            }
            return r;
        }
    }

    private Browser loggedIn(String email, String role) throws Exception {
        Browser b = new Browser(mvc);
        b.send(post("/api/auth/login"), json.writeValueAsString(Map.of("email", email, "password", "Test@12345")));
        b.send(get("/api/auth/session"), null); // what the app does right after login
        assertThat(b.jar).containsKey("FINNEST_SESSION");
        return b;
    }

    private String[] family() throws Exception {
        String run = UUID.randomUUID().toString().substring(0, 8);
        String owner = "o-" + run + "@example.com", member = "m-" + run + "@example.com";
        Map<String, Object> reg = Map.of("familyName", "Browser " + run, "address", "x", "phone", "9000000000", "members", List.of(
                Map.of("name", "Owner", "email", owner, "password", "Test@12345", "phone", "9000000000", "isAdmin", true),
                Map.of("name", "Member", "email", member, "password", "Test@12345", "phone", "9000000001", "isAdmin", false)));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(reg)));
        return new String[] { owner, member };
    }

    @Test
    @DisplayName("Several saves in a row in one browser session all succeed (owner)")
    void ownerSavesRepeatedly() throws Exception {
        Browser b = loggedIn(family()[0], "OWNER");
        String body = json.writeValueAsString(Map.of("bankName", "B", "accountType", "Savings", "openingBalance", 100));
        for (int i = 1; i <= 3; i++) {
            MockHttpServletResponse r = b.send(post("/api/bankaccounts"), body);
            assertThat(r.getStatus()).as("save #%d", i).isEqualTo(200);
            assertThat(b.jar).as("XSRF-TOKEN still held after save #%d", i).containsKey("XSRF-TOKEN");
            b.send(get("/api/bankaccounts"), null);
        }
    }

    @Test
    @DisplayName("A member creates a goal, then adds funds to it, then records side income and updates the source")
    void memberFlows() throws Exception {
        Browser b = loggedIn(family()[1], "MEMBER");
        MockHttpServletResponse goal = b.send(post("/api/goals"),
                json.writeValueAsString(Map.of("name", "Phone", "targetAmount", 30000, "targetDate", "2027-03-01", "priority", "MEDIUM")));
        assertThat(goal.getStatus()).isEqualTo(200);
        String goalId = json.readTree(goal.getContentAsString()).get("id").asText();
        b.send(get("/api/goals"), null);
        assertThat(b.send(post("/api/goals/" + goalId + "/contribute"), "{\"amount\":2500}").getStatus()).isEqualTo(200);

        MockHttpServletResponse src = b.send(post("/api/incomesources"),
                json.writeValueAsString(Map.of("sourceName", "Tuition", "ownerName", "Member", "amount", 15000, "frequency", "Monthly")));
        assertThat(src.getStatus()).isEqualTo(200);
        JsonNode source = json.readTree(src.getContentAsString());
        assertThat(b.send(post("/api/expenses"), json.writeValueAsString(Map.of("amount", 15000, "category", "Side Income",
                "expenseDate", "2026-11-09", "type", "CREDIT", "madeAgainst", "INCOME_SOURCE",
                "linkedIncomeSource", Map.of("id", source.get("id").asText())))).getStatus()).isEqualTo(200);
        assertThat(b.send(put("/api/incomesources/" + source.get("id").asText()), json.writeValueAsString(Map.of(
                "sourceName", "Tuition", "ownerName", "Member", "amount", 15000, "frequency", "Monthly", "dateReceived", "2026-11-09"))).getStatus())
                .isEqualTo(200);
    }

    @Test
    @DisplayName("A write without the token is still refused, even mid-session")
    void stillProtected() throws Exception {
        Browser b = loggedIn(family()[0], "OWNER");
        b.jar.remove("XSRF-TOKEN");
        assertThat(b.send(post("/api/bankaccounts"), "{\"bankName\":\"X\",\"accountType\":\"Savings\",\"openingBalance\":1}").getStatus()).isEqualTo(403);
    }
}
