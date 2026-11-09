package com.finnest.auth;

import org.springframework.http.ResponseCookie;

/** Sprint 7 T7 (D-07): the browser session cookie. HttpOnly so page scripts can never read the token. */
public final class SessionCookies {
    public static final String NAME = "FINNEST_SESSION";

    private SessionCookies() {}

    public static String set(String token, long maxAgeMillis) {
        return base(token).maxAge(Math.max(0, maxAgeMillis / 1000)).build().toString();
    }

    public static String clear() {
        return base("").maxAge(0).build().toString();
    }

    private static ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(true).sameSite("Strict").path("/");
    }
}
