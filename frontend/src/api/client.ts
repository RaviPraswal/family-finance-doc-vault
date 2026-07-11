import { useAuthStore } from '../store/authStore';

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = useAuthStore.getState().token;
  
  const headers: HeadersInit = {
    ...options.headers,
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
    if (response.status === 401 || response.status === 403) {
      useAuthStore.getState().logout();
    }
    const errorBody = await response.text();
    throw new Error(errorBody || 'Network response was not ok');
  }

  // If it's a file download, we might want to return the blob directly, 
  // but for most APIs we return JSON. Let's assume JSON unless it's a specific download endpoint.
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  
  return response;
};
