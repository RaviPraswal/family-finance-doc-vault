package com.finnest;

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

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sprint 7 T7 (SPEC P0-3, D-07): the browser session lives in an HttpOnly cookie; cookie-authenticated writes need a CSRF token. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint7CookieAuthTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String email;

    private MockHttpServletResponse login() throws Exception {
        String run = UUID.randomUUID().toString().substring(0, 8);
        email = "c-" + run + "@example.com";
        Map<String, Object> reg = Map.of("familyName", "Cookie " + run, "address", "x", "phone", "9000000000",
                "members", List.of(Map.of("name", "Owner", "email", email, "password", "Test@12345", "phone", "9000000000", "isAdmin", true)));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(reg))).andExpect(status().isOk());
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", "Test@12345")))).andExpect(status().isOk()).andReturn().getResponse();
    }

    private static String setCookie(MockHttpServletResponse r, String name) {
        return r.getHeaders("Set-Cookie").stream().filter(h -> h.startsWith(name + "=")).findFirst().orElseThrow(() -> new AssertionError("no " + name + " cookie"));
    }

    private static Cookie session(MockHttpServletResponse r) {
        String h = setCookie(r, "FINNEST_SESSION");
        return new Cookie("FINNEST_SESSION", h.substring("FINNEST_SESSION=".length(), h.indexOf(';')));
    }

    @Test
    @DisplayName("T7: login sets FINNEST_SESSION as HttpOnly, Secure, SameSite=Strict")
    void loginSetsHardenedCookie() throws Exception {
        String h = setCookie(login(), "FINNEST_SESSION");
        assertThat(h).contains("HttpOnly").contains("Secure").contains("SameSite=Strict").contains("Path=/");
    }

    @Test
    @DisplayName("T7: the cookie alone authenticates reads; /api/auth/session says who is signed in and until when")
    void cookieAuthenticatesReads() throws Exception {
        Cookie c = session(login());
        mvc.perform(get("/api/bankaccounts").cookie(c)).andExpect(status().isOk());
        var s = json.readTree(mvc.perform(get("/api/auth/session").cookie(c)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(s.get("email").asText()).isEqualTo(email);
        assertThat(s.get("role").asText()).isEqualTo("OWNER");
        assertThat(s.get("expiresAt").asLong()).isGreaterThan(System.currentTimeMillis());
        mvc.perform(get("/api/auth/session")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("T7: a cookie-authenticated write without the CSRF token is refused; with it, it succeeds")
    void cookieWritesNeedCsrf() throws Exception {
        Cookie c = session(login());
        String body = json.writeValueAsString(Map.of("bankName", "Csrf Bank", "accountType", "Savings", "openingBalance", 1));
        mvc.perform(post("/api/bankaccounts").cookie(c).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());

        MockHttpServletResponse first = mvc.perform(get("/api/auth/session").cookie(c)).andReturn().getResponse();
        String h = setCookie(first, "XSRF-TOKEN");
        assertThat(h).doesNotContain("HttpOnly"); // the page must be able to read it and echo it back
        String token = h.substring("XSRF-TOKEN=".length(), h.indexOf(';'));
        mvc.perform(post("/api/bankaccounts").cookie(c, new Cookie("XSRF-TOKEN", token)).header("X-XSRF-TOKEN", token)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("T7: logout clears the session cookie")
    void logoutClearsCookie() throws Exception {
        Cookie c = session(login());
        MockHttpServletResponse out = mvc.perform(post("/api/auth/logout").cookie(c)).andExpect(status().isOk()).andReturn().getResponse();
        assertThat(setCookie(out, "FINNEST_SESSION")).contains("Max-Age=0");
    }

    @Test
    @DisplayName("T7: API clients using the Bearer header keep working without CSRF")
    void bearerClientsUnaffected() throws Exception {
        String token = json.readTree(login().getContentAsString()).get("token").asText();
        mvc.perform(post("/api/bankaccounts").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("bankName", "Api Bank", "accountType", "Savings", "openingBalance", 1)))).andExpect(status().isOk());
    }
}
