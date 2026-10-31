package com.finnest.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    /** Longest a login session may be kept alive by refreshing (default 30 days). */
    @Value("${jwt.refresh-expiration:2592000000}")
    private long maxSessionMillis;

    /** Fails startup when JWT_SECRET is missing or too short, instead of silently using a weak key. */
    @jakarta.annotation.PostConstruct
    void validateSecret() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("JWT_SECRET is not set. Generate one with: openssl rand -base64 48");
        }
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secretKey);
        } catch (RuntimeException e) {
            throw new IllegalStateException("JWT_SECRET must be Base64 encoded (openssl rand -base64 48)", e);
        }
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must decode to at least 32 bytes (openssl rand -base64 48)");
        }
        if (secretKey.startsWith("404E635266556A586E32")) {
            throw new IllegalStateException("JWT_SECRET is the public sample key that was committed to GitHub. Generate a new one.");
        }
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(userDetails, java.time.Instant.now());
    }

    /** A token for a session that began at {@code sessionStart}; refreshing keeps the original start. */
    public String generateToken(UserDetails userDetails, java.time.Instant sessionStart) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("sessionStart", sessionStart.getEpochSecond());
        if (userDetails instanceof com.finnest.user.User) {
            com.finnest.user.User user = (com.finnest.user.User) userDetails;
            extraClaims.put("id", user.getId().toString());
            extraClaims.put("role", user.getRole());
            extraClaims.put("name", user.getName());
        }
        return generateToken(extraClaims, userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails, jwtExpiration);
    }

    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails, long expiration) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey())
                .compact();
    }

    /** When the login session behind this token began; tokens issued before Sprint 3 fall back to their issue time. */
    public java.time.Instant sessionStart(String token) {
        Claims claims = extractAllClaims(token);
        Object start = claims.get("sessionStart");
        if (start instanceof Number n) {
            return java.time.Instant.ofEpochSecond(n.longValue());
        }
        return claims.getIssuedAt().toInstant();
    }

    public boolean isSessionTooOld(java.time.Instant sessionStart) {
        return sessionStart.plusMillis(maxSessionMillis).isBefore(java.time.Instant.now());
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
