import { useAuthStore } from '../store/authStore';

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = useAuthStore.getState().token;
  
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not sending FormData, default to application/json
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    // Only logout on actual authentication/authorization failures
    if (response.status === 401 || response.status === 403) {
      useAuthStore.getState().logout();
      throw new Error('Session expired. Please log in again.');
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
