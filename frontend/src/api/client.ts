import { useAuthStore } from '../store/authStore';

const SAFE = ['GET', 'HEAD', 'OPTIONS'];

/** The XSRF-TOKEN cookie set by the server (readable on purpose; the session cookie itself is HttpOnly). */
const csrfToken = () => document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1];

/**
 * Sprint 7 T8: every request to the API goes through here. The session cookie is sent by the browser;
 * state-changing requests echo the CSRF token. No Authorization header and no token in page memory.
 */
export function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  const method = (init.method || 'GET').toUpperCase();
  const token = csrfToken();
  if (!SAFE.includes(method) && token) headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
  return fetch(url, { ...init, headers, credentials: 'same-origin' });
}

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };

  // If not sending FormData, default to application/json
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await authFetch(endpoint, { ...options, headers });

  if (!response.ok) {
    const errorBody = await response.text();
    // 401 = the login is missing or expired: end the session.
    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new Error('Session expired. Please log in again.');
    }
    // 403 = logged in, but not allowed to touch this record: keep the session.
    if (response.status === 403) {
      throw new Error("You don't have permission to do that.");
    }
    // For 4xx client errors (e.g. FK constraint violations), surface the backend message
    if (response.status >= 400 && response.status < 500) {
      throw new Error(errorBody || `Request failed (${response.status})`);
    }
    // For 5xx server errors
    throw new Error(errorBody || `Server error (${response.status}). Please try again.`);
  }

  // If it's a file download, we might want to return the blob directly, 
  // but for most APIs we return JSON. Let's assume JSON unless it's a specific download endpoint.
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  
  return response;
};
