import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

// Sprint 3, S3-05: only an expired or invalid login (401) ends the session.
// A 403 means "not allowed to touch this record" and must not log the user out.
describe('apiClient error handling', () => {
  const logout = vi.fn();

  beforeEach(() => {
    logout.mockReset();
    useAuthStore.setState({ token: 'test-token', logout } as never);
  });

  const respond = (status: number, body = '') =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status })));

  it('logs out on 401', async () => {
    respond(401);
    await expect(apiClient('/api/loans')).rejects.toThrow(/log in again/);
    expect(logout).toHaveBeenCalledOnce();
  });

  it('keeps the session on 403 and shows a permission message', async () => {
    respond(403, 'Unauthorized');
    await expect(apiClient('/api/loans/1')).rejects.toThrow(/permission/i);
    expect(logout).not.toHaveBeenCalled();
  });
});
