import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

// How many seconds before expiry to show the warning modal
const WARN_BEFORE_SECONDS = 120; // 2 minutes
// Countdown duration shown in the modal (must be <= WARN_BEFORE_SECONDS)
const COUNTDOWN_SECONDS = 120;

/**
 * Reads the `exp` field from the JWT payload (seconds since epoch).
 * Returns null if token is missing or malformed.
 */
function getTokenExpiry(token: string | null): number | null {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    return payload.exp ? payload.exp * 1000 : null; // convert to ms
  } catch {
    return null;
  }
}

export function SessionExpiryModal() {
  const { token, setToken, logout } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [extending, setExtending] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
  };

  const handleExtend = useCallback(async () => {
    setExtending(true);
    try {
      const data = await apiClient('/api/auth/refresh', { method: 'POST' });
      setToken(data.token);
      setShowModal(false);
      clearTimers();
    } catch {
      // If refresh fails (token already expired), force logout
      logout();
    } finally {
      setExtending(false);
    }
  }, [setToken, logout]);

  const handleLogout = useCallback(() => {
    clearTimers();
    setShowModal(false);
    logout();
  }, [logout]);

  // Re-schedule warning every time the token changes (login / refresh)
  useEffect(() => {
    clearTimers();
    setShowModal(false);

    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    const now = Date.now();
    const msUntilExpiry = expiry - now;
    const msUntilWarn = msUntilExpiry - WARN_BEFORE_SECONDS * 1000;

    if (msUntilWarn <= 0) {
      // Token already in warning window or expired
      if (msUntilExpiry > 0) {
        setCountdown(Math.floor(msUntilExpiry / 1000));
        setShowModal(true);
      } else {
        logout();
      }
      return;
    }

    // Schedule the warning modal to appear
    warnTimerRef.current = setTimeout(() => {
      setCountdown(COUNTDOWN_SECONDS);
      setShowModal(true);
    }, msUntilWarn);

    return () => clearTimers();
  }, [token, logout]);

  // Countdown tick when modal is visible
  useEffect(() => {
    if (!showModal) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          // Auto-logout when countdown hits zero
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showModal, logout]);

  if (!showModal) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const urgency = countdown <= 30; // Turn red in last 30 seconds

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Top progress bar — shrinks as countdown reduces */}
        <div className="h-1 w-full bg-muted">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${urgency ? 'bg-red-500' : 'bg-amber-400'}`}
            style={{ width: `${(countdown / COUNTDOWN_SECONDS) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${urgency ? 'bg-red-500/15' : 'bg-amber-400/15'}`}>
            <svg
              className={`w-7 h-7 ${urgency ? 'text-red-400' : 'text-amber-400'}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-foreground text-center mb-1">
            Session Expiring Soon
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-5 leading-relaxed">
            Your session will expire in{' '}
            <span className={`font-bold tabular-nums ${urgency ? 'text-red-400' : 'text-amber-400'}`}>
              {minutes > 0 ? `${minutes}m ` : ''}{String(seconds).padStart(2, '0')}s
            </span>
            . Would you like to stay logged in?
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
            >
              Log Out
            </button>
            <button
              onClick={handleExtend}
              disabled={extending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {extending ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Extending...
                </>
              ) : (
                'Extend Session'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
