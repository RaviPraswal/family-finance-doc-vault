package com.finnest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sprint 7 test helpers: register a family (owner + member) and call the API as one of them. */
final class Sprint7Support {
    private Sprint7Support() {}

    record Family(String ownerToken, String memberToken) {}

    static Family family(MockMvc mvc, ObjectMapper json, String label) throws Exception {
        String run = UUID.randomUUID().toString().substring(0, 8);
        String owner = "o-" + run + "@example.com", member = "m-" + run + "@example.com";
        Map<String, Object> req = Map.of("familyName", label + " " + run, "address", "x", "phone", "9000000000",
                "members", List.of(
                        Map.of("name", "Owner", "email", owner, "password", "Test@12345", "phone", "9000000000", "isAdmin", true),
                        Map.of("name", "Member", "email", member, "password", "Test@12345", "phone", "9000000001", "isAdmin", false)));
        String ownerToken = read(mvc, json, post("/api/auth/register"), null, req).get("token").asText();
        String memberToken = read(mvc, json, post("/api/auth/login"), null, Map.of("email", member, "password", "Test@12345")).get("token").asText();
        return new Family(ownerToken, memberToken);
    }

    static JsonNode read(MockMvc mvc, ObjectMapper json, MockHttpServletRequestBuilder req, String token, Object body) throws Exception {
        if (token != null) req.header("Authorization", "Bearer " + token);
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        return json.readTree(mvc.perform(req).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
}
