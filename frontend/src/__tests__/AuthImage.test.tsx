import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AuthImage from '../components/AuthImage';
import { useAuthStore } from '../store/authStore';

// Sprint 1, P0-8: thumbnails are protected, so the image must be fetched with the login token.
describe('AuthImage', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'test-token' });
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:thumb');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('sends the Authorization header and shows the image', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: () => Promise.resolve(new Blob(['png'])) });
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthImage src="/api/documents/1/thumbnail" alt="thumb" />);

    const img = await screen.findByRole('img', { name: 'thumb' });
    expect(img).toHaveAttribute('src', 'blob:thumb');
    expect(fetchMock).toHaveBeenCalledWith('/api/documents/1/thumbnail', {
      headers: { Authorization: 'Bearer test-token' },
    });
  });

  it('calls onError and shows nothing when the server refuses (another family / no access)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, blob: () => Promise.resolve(new Blob()) }));
    const onError = vi.fn();

    const { container } = render(<AuthImage src="/api/documents/2/thumbnail" onError={onError} />);

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(container.querySelector('img')).toBeNull();
  });
});
