package com.finnest.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(service.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(service.login(request));
    }

    /**
     * Refreshes the JWT token for the currently authenticated user.
     * The existing valid token must be provided as a Bearer token in the Authorization header.
     * Spring Security's JwtAuthenticationFilter validates it before this method is invoked.
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(service.refresh(userDetails));
    }
}
