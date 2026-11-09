import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, authFetch } from '../api/client';
import { useAuthStore, loadSession, endSession } from '../store/authStore';

// Sprint 7 T8 (SPEC P0-3, D-07): the browser keeps no token; the HttpOnly cookie carries the session,
// writes echo the XSRF-TOKEN cookie, and the user comes from /api/auth/session.
const ok = (body: unknown = {}) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('cookie session in the browser', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'XSRF-TOKEN=abc123; path=/';
    useAuthStore.setState({ user: null, expiresAt: null, status: 'unknown' } as never);
  });

  it('sends no Authorization header and includes cookies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok([]));
    vi.stubGlobal('fetch', fetchMock);
    await apiClient('/api/loans');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.credentials).toBe('same-origin');
  });

  it('echoes the XSRF token on writes, not on reads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok());
    vi.stubGlobal('fetch', fetchMock);
    await apiClient('/api/loans', { method: 'POST', body: '{}' });
    await authFetch('/api/documents/1/thumbnail');
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('abc123');
    expect((fetchMock.mock.calls[1][1].headers as Record<string, string>)['X-XSRF-TOKEN']).toBeUndefined();
  });

  it('loads the signed-in user from /api/auth/session and never stores a token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ name: 'Test', email: 't@example.com', role: 'OWNER', expiresAt: 1893456000000 })));
    await loadSession();
    expect(useAuthStore.getState()).toMatchObject({ status: 'in', user: { email: 't@example.com', role: 'OWNER' }, expiresAt: 1893456000000 });
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('treats a 401 from /api/auth/session as signed out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    await loadSession();
    expect(useAuthStore.getState()).toMatchObject({ status: 'out', user: null });
  });

  it('logging out tells the server to clear the cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    useAuthStore.setState({ user: { id: '1', name: 'T', email: 't', role: 'OWNER' }, status: 'in' } as never);
    await endSession();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/logout');
    expect(useAuthStore.getState()).toMatchObject({ status: 'out', user: null });
  });
});
