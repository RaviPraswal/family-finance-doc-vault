package com.finnest.auth;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService service;
    private final LoginAttemptService loginAttempts;
    @org.springframework.beans.factory.annotation.Autowired
    private JwtService jwtService;

    /** Sprint 7 T7: every response that issues a token also sets it as the HttpOnly session cookie. */
    private ResponseEntity<AuthResponse> withSession(AuthResponse response) {
        long ttl = jwtService.expiresAt(response.token()) - System.currentTimeMillis();
        return ResponseEntity.ok().header(org.springframework.http.HttpHeaders.SET_COOKIE, SessionCookies.set(response.token(), ttl)).body(response);
    }

    private static String tokenOf(String authorization, jakarta.servlet.http.HttpServletRequest request) {
        if (authorization != null && authorization.startsWith("Bearer ")) return authorization.substring(7);
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie c : request.getCookies()) if (SessionCookies.NAME.equals(c.getName())) return c.getValue();
        }
        return null;
    }

    public AuthController(AuthService service, LoginAttemptService loginAttempts) {
        this.service = service;
        this.loginAttempts = loginAttempts;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return withSession(service.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        loginAttempts.checkAllowed(request.email());
        try {
            AuthResponse response = service.login(request);
            loginAttempts.reset(request.email());
            return withSession(response);
        } catch (org.springframework.security.core.AuthenticationException e) {
            loginAttempts.recordFailure(request.email());
            throw e;
        }
    }

    /**
     * Refreshes the JWT token for the currently authenticated user.
     * The existing valid token must be provided as a Bearer token in the Authorization header.
     * Spring Security's JwtAuthenticationFilter validates it before this method is invoked.
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@AuthenticationPrincipal UserDetails userDetails,
                                                @RequestHeader(value = "Authorization", required = false) String authorization,
                                                jakarta.servlet.http.HttpServletRequest httpRequest) {
        return withSession(service.refresh(userDetails, tokenOf(authorization, httpRequest)));
    }

    /** Sprint 7 T7: who is signed in and when the session ends — the SPA no longer decodes the token itself. */
    @org.springframework.web.bind.annotation.GetMapping("/session")
    public Map<String, Object> session(@AuthenticationPrincipal com.finnest.user.User user,
                                       @RequestHeader(value = "Authorization", required = false) String authorization,
                                       jakarta.servlet.http.HttpServletRequest httpRequest) {
        String token = tokenOf(authorization, httpRequest);
        if (user == null || token == null) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Not signed in");
        }
        return Map.of("name", user.getName(), "email", user.getEmail(), "role", user.getRole(), "expiresAt", jwtService.expiresAt(token));
    }

    /** Sprint 7 T7: ends the browser session by clearing the cookie. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.ok().header(org.springframework.http.HttpHeaders.SET_COOKIE, SessionCookies.clear()).build();
    }
}
