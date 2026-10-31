package com.finnest.auth;

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

    public AuthController(AuthService service, LoginAttemptService loginAttempts) {
        this.service = service;
        this.loginAttempts = loginAttempts;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(service.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        loginAttempts.checkAllowed(request.email());
        try {
            AuthResponse response = service.login(request);
            loginAttempts.reset(request.email());
            return ResponseEntity.ok(response);
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
                                                @RequestHeader(value = "Authorization", required = false) String authorization) {
        String token = authorization != null && authorization.startsWith("Bearer ") ? authorization.substring(7) : null;
        return ResponseEntity.ok(service.refresh(userDetails, token));
    }
}
