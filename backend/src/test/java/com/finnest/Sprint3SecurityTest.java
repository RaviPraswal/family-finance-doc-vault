package com.finnest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sprint 3, batch A: the security stories S3-01 to S3-08. Two fresh families per test: A (victim), B (attacker). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint3SecurityTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Value("${jwt.secret}") String secret;

    String run, emailA, tokenA, tokenB;

    @BeforeEach
    void twoFamilies() throws Exception {
        run = UUID.randomUUID().toString().substring(0, 8);
        emailA = "a-" + run + "@example.com";
        tokenA = register("Family A " + run, emailA);
        tokenB = register("Family B " + run, "b-" + run + "@example.com");
    }

    // ---------- S3-01 ----------

    @Test
    @DisplayName("S3-01: B cannot delete A's budget")
    void budgetDeleteIsFamilyScoped() throws Exception {
        String month = YearMonth.now().toString();
        String budgetA = postJson("/api/budgets", tokenA, Map.of("category", "Groceries", "amount", 8000, "month", month)).get("id").asText();

        mvc.perform(auth(delete("/api/budgets/" + budgetA), tokenB)).andExpect(status().isNotFound());

        assertThat(getJson("/api/budgets/summary?month=" + month, tokenA).toString()).contains(budgetA);
    }

    // ---------- S3-02 ----------

    @Test
    @DisplayName("S3-02: B cannot read the almirah location or custody log of A's document")
    void physicalVaultReadsAreFamilyScoped() throws Exception {
        String docA = uploadPng(tokenA);
        postJson("/api/physical-documents/" + docA + "/assign", tokenA, Map.of("almirahId", "Main Almirah", "shelf", "Shelf 1", "originalPresent", true));

        mvc.perform(auth(get("/api/physical-documents/" + docA), tokenB)).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/physical-documents/" + docA + "/logs"), tokenB)).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/physical-documents/" + docA), tokenA)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("S3-02: a member cannot open the owner's document details")
    void memberCannotReadOwnersDocument() throws Exception {
        String docA = uploadPng(tokenA);
        String memberToken = addMemberAndLogin(tokenA);

        mvc.perform(auth(get("/api/documents/" + docA), memberToken)).andExpect(status().isForbidden());
        mvc.perform(auth(get("/api/documents/" + docA), tokenA)).andExpect(status().isOk());
    }

    // ---------- S3-03 ----------

    @Test
    @DisplayName("S3-03: an id in a create request cannot overwrite another family's record")
    void createIgnoresClientId() throws Exception {
        String loanA = postJson("/api/loans", tokenA, Map.of("lenderName", "A Lender", "outstandingAmount", 500000)).get("id").asText();

        JsonNode created = postJson("/api/loans", tokenB, Map.of("id", loanA, "lenderName", "hacked", "outstandingAmount", 1));

        assertThat(created.get("id").asText()).isNotEqualTo(loanA);
        assertThat(getJson("/api/loans", tokenA).toString()).contains("A Lender").doesNotContain("hacked");
    }

    @Test
    @DisplayName("S3-03: the creator is the logged-in user, not a userId in the request")
    void createIgnoresClientUserId() throws Exception {
        String ownerB = getJson("/api/family-members", tokenB).get(0).get("id").asText();
        String someoneElse = UUID.randomUUID().toString();

        JsonNode created = postJson("/api/loans", tokenB, Map.of("lenderName", "B Lender", "userId", someoneElse));

        assertThat(created.get("userId").asText()).isEqualTo(ownerB);
    }

    // ---------- S3-04 ----------

    @Test
    @DisplayName("S3-04: roles other than OWNER and MEMBER are refused")
    void unknownRoleIsRefused() throws Exception {
        String memberToken = addMemberAndLogin(tokenA);
        String memberId = memberIdOf(tokenA, "m-" + run + "@example.com");

        mvc.perform(auth(put("/api/family-members/" + memberId + "/role?role=SUPERUSER"), tokenA)).andExpect(status().isBadRequest());
        assertThat(memberToken).isNotBlank();
    }

    @Test
    @DisplayName("S3-04: the last owner cannot be demoted")
    void lastOwnerCannotBeDemoted() throws Exception {
        String ownerId = memberIdOf(tokenA, emailA);

        mvc.perform(auth(put("/api/family-members/" + ownerId + "/role?role=MEMBER"), tokenA)).andExpect(status().isBadRequest());
        assertThat(getJson("/api/family-members", tokenA).get(0).get("role").asText()).isEqualTo("OWNER");
    }

    // ---------- S3-05 ----------

    @Test
    @DisplayName("S3-05: refresh without a token is 401, not a server error")
    void refreshWithoutTokenIs401() throws Exception {
        mvc.perform(post("/api/auth/refresh")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S3-05: a session older than 30 days cannot be refreshed")
    void sessionCannotBeExtendedForever() throws Exception {
        String old = signedToken(emailA, Instant.now().minus(Duration.ofDays(31)));

        mvc.perform(auth(post("/api/auth/refresh"), old)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("S3-05: a refreshed token keeps the original session start")
    void refreshKeepsSessionStart() throws Exception {
        Instant start = Instant.now().minus(Duration.ofDays(2));
        String fresh = postJson("/api/auth/refresh", signedToken(emailA, start), Map.of()).get("token").asText();

        Object claim = Jwts.parser().verifyWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret))).build()
                .parseSignedClaims(fresh).getPayload().get("sessionStart");
        assertThat(((Number) claim).longValue()).isEqualTo(start.getEpochSecond());
    }

    // ---------- S3-06 ----------

    @Test
    @DisplayName("S3-06: after 5 failed logins the account is locked for 15 minutes, even with the right password")
    void loginIsRateLimited() throws Exception {
        for (int i = 0; i < 5; i++) {
            login(emailA, "wrong-password").andExpect(status().isUnauthorized());
        }
        login(emailA, "Test@12345").andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("S3-06: a successful login clears earlier failures")
    void successfulLoginResetsCounter() throws Exception {
        for (int i = 0; i < 4; i++) {
            login(emailA, "wrong-password").andExpect(status().isUnauthorized());
        }
        login(emailA, "Test@12345").andExpect(status().isOk());
        for (int i = 0; i < 4; i++) {
            login(emailA, "wrong-password").andExpect(status().isUnauthorized());
        }
        login(emailA, "Test@12345").andExpect(status().isOk());
    }

    // ---------- S3-07 ----------

    @Test
    @DisplayName("S3-07: notifications do not allow requests from any website")
    void notificationsHaveNoWildcardCors() throws Exception {
        mvc.perform(auth(get("/api/notifications"), tokenA).header("Origin", "https://evil.example"))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    // ---------- S3-08 ----------

    @Test
    @DisplayName("S3-08: bank account and card numbers are returned masked to the last 4 digits")
    void numbersAreMasked() throws Exception {
        postJson("/api/bankaccounts", tokenA, Map.of("bankName", "A Bank", "accountNumber", "123456789012", "openingBalance", 0));
        postJson("/api/creditcards", tokenA, Map.of("cardName", "A Card", "cardNumber", "4111111111111111", "creditLimit", 50000));

        assertThat(getJson("/api/bankaccounts", tokenA).get(0).get("accountNumber").asText()).isEqualTo("****9012");
        assertThat(getJson("/api/creditcards", tokenA).get(0).get("cardNumber").asText()).isEqualTo("****1111");
    }

    @Test
    @DisplayName("S3-08: saving an account with the masked number keeps the real number")
    void maskedNumberDoesNotOverwrite() throws Exception {
        String id = postJson("/api/bankaccounts", tokenA, Map.of("bankName", "A Bank", "accountNumber", "123456789012", "openingBalance", 0)).get("id").asText();

        putJson("/api/bankaccounts/" + id, tokenA, Map.of("bankName", "Renamed", "accountNumber", "****9012", "openingBalance", 0));
        putJson("/api/bankaccounts/" + id, tokenA, Map.of("bankName", "Renamed", "accountNumber", "999988887777", "openingBalance", 0));

        assertThat(getJson("/api/bankaccounts", tokenA).get(0).get("accountNumber").asText()).isEqualTo("****7777");
    }

    // ---------- helpers ----------

    private String register(String family, String email) throws Exception {
        Map<String, Object> req = Map.of("familyName", family, "address", "Test", "phone", "9000000000",
                "members", List.of(Map.of("name", "Owner", "email", email, "password", "Test@12345", "phone", "9000000000", "isAdmin", true)));
        String res = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(req)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(res).get("token").asText();
    }

    private org.springframework.test.web.servlet.ResultActions login(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", password))));
    }

    private String addMemberAndLogin(String ownerToken) throws Exception {
        String email = "m-" + run + "@example.com";
        postJson("/api/family-members", ownerToken, Map.of("name", "Member", "email", email, "phone", "9000000001", "password", "Test@12345"));
        return json.readTree(login(email, "Test@12345").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    private String memberIdOf(String token, String email) throws Exception {
        for (JsonNode m : getJson("/api/family-members", token)) {
            if (email.equals(m.get("email").asText())) return m.get("id").asText();
        }
        throw new AssertionError("member missing: " + email);
    }

    private String signedToken(String email, Instant sessionStart) {
        return Jwts.builder().subject(email).claim("sessionStart", sessionStart.getEpochSecond())
                .issuedAt(new Date()).expiration(new Date(System.currentTimeMillis() + 600_000))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret))).compact();
    }

    private String uploadPng(String token) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", out);
        String res = mvc.perform(auth(multipart("/api/documents").file(new MockMultipartFile("file", "id.png", "image/png", out.toByteArray()))
                .param("category", "Identity"), token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(res).get("id").asText();
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder req, String token) {
        return req.header("Authorization", "Bearer " + token);
    }

    private JsonNode getJson(String url, String token) throws Exception {
        return json.readTree(mvc.perform(auth(get(url), token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private JsonNode postJson(String url, String token, Object body) throws Exception {
        return json.readTree(mvc.perform(auth(post(url), token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private void putJson(String url, String token, Object body) throws Exception {
        mvc.perform(auth(put(url), token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isOk());
    }
}
