package com.finnest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sprint 3, batch C: S3-15 to S3-17. The AI model is replaced by a mock that records what it was sent. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class Sprint3FixesTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @MockBean ChatModel chatModel;

    String token, accountId;

    @BeforeEach
    void family() throws Exception {
        String run = UUID.randomUUID().toString().substring(0, 8);
        Map<String, Object> req = Map.of("familyName", "Fixes " + run, "address", "x", "phone", "9000000000",
                "members", List.of(Map.of("name", "Owner", "email", "f-" + run + "@example.com", "password", "Test@12345", "phone", "9000000000", "isAdmin", true)));
        token = json.readTree(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(req)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
        accountId = postJson("/api/bankaccounts", Map.of("bankName", "SBI", "accountNumber", "X1", "openingBalance", 100000)).get("id").asText();
        when(chatModel.call(any(Prompt.class))).thenReturn(new ChatResponse(List.of(new Generation(
                "{\"scheduleType\":\"LOAN_EMI\",\"institutionName\":\"SBI\",\"description\":\"Home loan\",\"installments\":[{\"amount\":16581,\"dueDate\":\"2026-12-05\"}]}"))));
    }

    // ---------- S3-15 ----------

    @Test
    @DisplayName("S3-15: the schedule parser sends the PDF's text to the AI and asks for the app's type names")
    void parserSendsTheDocument() throws Exception {
        MockMultipartFile pdf = new MockMultipartFile("file", "emi.pdf", "application/pdf", pdfSaying("EMI 16581 due 05-12-2026"));

        mvc.perform(auth(multipart("/api/ai/parse-schedule").file(pdf))).andExpect(status().isOk());

        ArgumentCaptor<Prompt> sent = ArgumentCaptor.forClass(Prompt.class);
        verify(chatModel, atLeastOnce()).call(sent.capture());
        String everything = sent.getAllValues().stream().flatMap(p -> p.getInstructions().stream())
                .map(Message::getContent).collect(Collectors.joining("\n"));
        assertThat(everything).contains("EMI 16581 due 05-12-2026");
        assertThat(everything).contains("SIP_INVESTMENT").doesNotContain("MUTUAL_FUND_SIP");
    }

    // ---------- S3-16 ----------

    @Test
    @DisplayName("S3-16: a new version after a deletion gets the next unused number")
    void versionNumbersAreNeverReused() throws Exception {
        String doc = uploadPng();
        addVersion(doc);
        addVersion(doc);
        deleteVersion(doc, 2);
        addVersion(doc);

        List<Integer> numbers = versionNumbers(doc);
        assertThat(numbers).containsExactlyInAnyOrder(1, 3, 4);
    }

    @Test
    @DisplayName("S3-16: deleting the latest version leaves the document pointing at the previous one")
    void deletingLatestVersionKeepsDocumentDownloadable() throws Exception {
        String doc = uploadPng();
        addVersion(doc);
        deleteVersion(doc, 2);

        mvc.perform(auth(get("/api/documents/" + doc + "/download"))).andExpect(status().isOk());
    }

    // ---------- S3-17 ----------

    @Test
    @DisplayName("S3-17: a cancelled payment cannot be paid")
    void cancelledPaymentCannotBePaid() throws Exception {
        String loanId = postJson("/api/loans", Map.of("lenderName", "SBI", "outstandingAmount", 50000, "interestRate", 10, "emiAmount", 3000)).get("id").asText();
        mvc.perform(auth(post("/api/ai/save-schedule?bankAccountId=" + accountId + "&referenceId=" + loanId)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("scheduleType", "LOAN_EMI", "institutionName", "SBI", "description", "x",
                        "installments", List.of(Map.of("amount", 3000, "dueDate", LocalDate.now().toString())))))).andExpect(status().isOk());
        String paymentId = getJson("/api/transactions/scheduled/pending").get(0).get("id").asText();
        jdbc.update("update scheduled_payments set status = 'CANCELLED' where id = ?", UUID.fromString(paymentId));

        mvc.perform(auth(post("/api/transactions/process-scheduled/" + paymentId))).andExpect(status().isBadRequest());
        assertThat(getJson("/api/expenses")).isEmpty();
    }

    @Test
    @DisplayName("S3-17: an original that is already checked out cannot be checked out again")
    void cannotCheckOutTwice() throws Exception {
        String doc = uploadPng();
        postJson("/api/physical-documents/" + doc + "/assign", Map.of("almirahId", "Main Almirah", "originalPresent", true));
        postJson("/api/physical-documents/" + doc + "/check-out", Map.of("borrowerName", "Bank", "notes", "loan"));

        mvc.perform(auth(post("/api/physical-documents/" + doc + "/check-out")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"borrowerName\":\"Someone\"}")).andExpect(status().isBadRequest());
    }

    // ---------- helpers ----------

    private static byte[] pdfSaying(String text) throws Exception {
        try (PDDocument pdf = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            pdf.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(pdf, page)) {
                content.beginText();
                content.setFont(PDType1Font.HELVETICA, 12);
                content.newLineAtOffset(50, 700);
                content.showText(text);
                content.endText();
            }
            pdf.save(out);
            return out.toByteArray();
        }
    }

    private String uploadPng() throws Exception {
        String res = mvc.perform(auth(multipart("/api/documents").file(png("id.png")).param("category", "Identity")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(res).get("id").asText();
    }

    private void addVersion(String doc) throws Exception {
        mvc.perform(auth(multipart("/api/documents/" + doc + "/versions").file(png("v.png")))).andExpect(status().isOk());
    }

    private void deleteVersion(String doc, int number) throws Exception {
        for (JsonNode v : getJson("/api/documents/" + doc + "/versions")) {
            if (v.get("versionNumber").asInt() == number) {
                mvc.perform(auth(delete("/api/documents/" + doc + "/versions/" + v.get("id").asText()))).andExpect(status().is2xxSuccessful());
                return;
            }
        }
        throw new AssertionError("version missing: " + number);
    }

    private List<Integer> versionNumbers(String doc) throws Exception {
        List<Integer> numbers = new ArrayList<>();
        for (JsonNode v : getJson("/api/documents/" + doc + "/versions")) numbers.add(v.get("versionNumber").asInt());
        return numbers;
    }

    private static MockMultipartFile png(String name) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", out);
        return new MockMultipartFile("file", name, "image/png", out.toByteArray());
    }

    private MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder req) {
        return req.header("Authorization", "Bearer " + token);
    }

    private JsonNode getJson(String url) throws Exception {
        return json.readTree(mvc.perform(auth(get(url))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private JsonNode postJson(String url, Object body) throws Exception {
        return json.readTree(mvc.perform(auth(post(url)).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
}
