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
import java.time.LocalDate;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Sprint 1 (P0) regression suite: one family must never see or change another family's data.
 * Each test registers two fresh families, A (victim) and B (attacker).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class FamilyIsolationTest {

    /** The signing key that was committed to the public repo before Sprint 1. */
    private static final String LEAKED_KEY = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    String tokenA, tokenB, emailA, tenantA, accountA;

    @BeforeEach
    void twoFamilies() throws Exception {
        String run = UUID.randomUUID().toString().substring(0, 8);
        emailA = "a-" + run + "@example.com";
        tokenA = register("Family A " + run, emailA);
        tokenB = register("Family B " + run, "b-" + run + "@example.com");
        tenantA = getJson("/api/family-members", tokenA).get(0).get("tenantId").asText();
        accountA = postJson("/api/bankaccounts", tokenA,
                Map.of("bankName", "A Bank", "accountNumber", "A-" + run, "openingBalance", 10000)).get("id").asText();
    }

    @Test
    @DisplayName("P0-2: an X-Tenant-ID header cannot switch B into A's family")
    void tenantHeaderIsIgnored() throws Exception {
        String loanA = postJson("/api/loans", tokenA, Map.of("lenderName", "A Lender", "outstandingAmount", 500000)).get("id").asText();

        String body = mvc.perform(auth(get("/api/loans"), tokenB).header("X-Tenant-ID", tenantA))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain(loanA);
    }

    @Test
    @DisplayName("P0-2/7: B cannot read, edit or delete A's records by ID")
    void cannotTouchOtherFamilysRecordsById() throws Exception {
        String loanA = postJson("/api/loans", tokenA, Map.of("lenderName", "A Lender", "outstandingAmount", 500000)).get("id").asText();

        mvc.perform(auth(put("/api/loans/" + loanA), tokenB).contentType(MediaType.APPLICATION_JSON)
                .content("{\"lenderName\":\"hacked\"}")).andExpect(status().is4xxClientError());
        mvc.perform(auth(delete("/api/loans/" + loanA), tokenB)).andExpect(status().is4xxClientError());

        assertThat(getJson("/api/loans", tokenA).toString()).contains(loanA).contains("A Lender").doesNotContain("hacked");
    }

    @Test
    @DisplayName("P0-7: B cannot change A's bank balance by linking A's account to an expense")
    void cannotMoveMoneyInOtherFamilysAccount() throws Exception {
        String before = balanceOfA();

        mvc.perform(auth(post("/api/expenses"), tokenB).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("amount", 5000, "type", "DEBIT", "category", "Food",
                        "expenseDate", LocalDate.now().toString(), "linkedAccount", Map.of("id", accountA)))))
                .andExpect(status().isNotFound());

        assertThat(balanceOfA()).isEqualTo(before);
    }

    @Test
    @DisplayName("P0-7: a loan cannot be linked to another family's bank account")
    void linkedAccountMustBeSameFamily() throws Exception {
        mvc.perform(auth(post("/api/loans"), tokenB).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("lenderName", "B Lender", "linkedAccount", Map.of("id", accountA)))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("P0-3/4: scheduled payments are saved, listed and processed only within the family")
    void scheduledPaymentsAreFamilyScoped() throws Exception {
        Map<String, Object> schedule = Map.of("scheduleType", "LOAN_EMI", "institutionName", "A Bank",
                "description", "Home loan", "installments", List.of(Map.of("amount", 1000, "dueDate", LocalDate.now().plusDays(5).toString())));

        // B cannot attach a schedule to A's account
        mvc.perform(auth(post("/api/ai/save-schedule?bankAccountId=" + accountA), tokenB)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(schedule)))
                .andExpect(status().isNotFound());

        // A can, and it lands under A only
        mvc.perform(auth(post("/api/ai/save-schedule?bankAccountId=" + accountA), tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(schedule)))
                .andExpect(status().isOk());
        JsonNode pendingA = getJson("/api/transactions/scheduled/pending", tokenA);
        assertThat(pendingA).hasSize(1);
        assertThat(getJson("/api/transactions/scheduled/pending", tokenB)).isEmpty();

        // B cannot pay A's EMI
        String paymentId = pendingA.get(0).get("id").asText();
        mvc.perform(auth(post("/api/transactions/process-scheduled/" + paymentId), tokenB)).andExpect(status().isNotFound());
        assertThat(getJson("/api/transactions/scheduled/pending", tokenA)).hasSize(1);
    }

    @Test
    @DisplayName("P0-4: a schedule with an unreadable date is rejected, not saved as today")
    void unreadableDateIsRejected() throws Exception {
        Map<String, Object> schedule = Map.of("scheduleType", "LOAN_EMI", "institutionName", "A Bank", "description", "x",
                "installments", List.of(Map.of("amount", 1000, "dueDate", "next Tuesday")));
        mvc.perform(auth(post("/api/ai/save-schedule?bankAccountId=" + accountA), tokenA)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(schedule)))
                .andExpect(status().isBadRequest());
        assertThat(getJson("/api/transactions/scheduled/pending", tokenA)).isEmpty();
    }

    @Test
    @DisplayName("P0-8: document thumbnails need the owning family's login")
    void thumbnailRequiresOwnership() throws Exception {
        String docId = upload(tokenA, new MockMultipartFile("file", "id.png", "image/png", tinyPng()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        docId = json.readTree(docId).get("id").asText();

        mvc.perform(auth(get("/api/documents/" + docId + "/thumbnail"), tokenA)).andExpect(status().isOk());
        mvc.perform(auth(get("/api/documents/" + docId + "/thumbnail"), tokenB)).andExpect(status().isNotFound());
        mvc.perform(get("/api/documents/" + docId + "/thumbnail")).andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("Uploads: only PDF/PNG/JPEG/WEBP are accepted, by content not by name")
    void rejectsDisallowedFileTypes() throws Exception {
        upload(tokenA, new MockMultipartFile("file", "notes.pdf", "application/pdf", "just text".getBytes()))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    @DisplayName("P0-1: a token signed with the old public key is refused")
    void forgedTokenWithLeakedKeyIsRejected() throws Exception {
        String forged = Jwts.builder().subject(emailA).issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 600_000))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(LEAKED_KEY))).compact();

        mvc.perform(auth(get("/api/loans"), forged)).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("P0-6: the default admin/admin login does not exist outside the dev profile")
    void noDefaultAdmin() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@finnest.com\",\"password\":\"admin\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("P0-10: server errors do not reveal internal messages")
    void errorsDoNotLeakInternals() throws Exception {
        String body = mvc.perform(auth(delete("/api/loans/not-a-uuid"), tokenA))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("Exception").doesNotContain("java.");
    }

    @Test
    @DisplayName("Commitments: B cannot see, edit, or link A's records")
    void commitmentsAreFamilyScoped() throws Exception {
        String loanA = postJson("/api/loans", tokenA, Map.of("lenderName", "A Lender", "outstandingAmount", 500000, "emiAmount", 16581)).get("id").asText();
        String rentA = postJson("/api/commitments", tokenA, Map.of("name", "Rent", "group", "MUST_PAY", "amount", 15000, "frequency", "MONTHLY")).get("id").asText();

        assertThat(getJson("/api/commitments", tokenB).toString()).doesNotContain(rentA);
        mvc.perform(auth(put("/api/commitments/" + rentA), tokenB).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"hacked\",\"group\":\"MUST_PAY\",\"amount\":1,\"frequency\":\"MONTHLY\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(auth(post("/api/commitments"), tokenB).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("name", "EMI", "group", "MUST_PAY", "frequency", "MONTHLY", "linkedLoan", Map.of("id", loanA)))))
                .andExpect(status().isNotFound());

        // A's own plan includes the rent
        assertThat(getJson("/api/commitments/plan", tokenA).get("mustPay").decimalValue()).isEqualByComparingTo("15000");
    }

    // ---------- helpers ----------

    private String register(String family, String email) throws Exception {
        Map<String, Object> req = Map.of("familyName", family, "address", "Test", "phone", "9000000000",
                "members", List.of(Map.of("name", "Owner", "email", email, "password", "Test@12345", "phone", "9000000000", "isAdmin", true)));
        String res = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(req)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(res).get("token").asText();
    }

    private String balanceOfA() throws Exception {
        for (JsonNode a : getJson("/api/bankaccounts", tokenA)) {
            if (a.get("id").asText().equals(accountA)) return a.get("currentBalance").asText();
        }
        throw new AssertionError("Account A missing");
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder req, String token) {
        return req.header("Authorization", "Bearer " + token);
    }

    private JsonNode getJson(String url, String token) throws Exception {
        return json.readTree(mvc.perform(auth(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(url), token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private JsonNode postJson(String url, String token, Object body) throws Exception {
        return json.readTree(mvc.perform(auth(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(url), token)
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private org.springframework.test.web.servlet.ResultActions upload(String token, MockMultipartFile file) throws Exception {
        return mvc.perform(auth(multipart("/api/documents").file(file).param("category", "Identity"), token));
    }

    private static byte[] tinyPng() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", out);
        return out.toByteArray();
    }
}
