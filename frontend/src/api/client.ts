// API Client for AICTE ICMS

const BASE_URL = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('aicte_icms_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('aicte_icms_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('aicte_icms_token');
  localStorage.removeItem('aicte_icms_user');
}

export function getStoredUser(): any | null {
  const u = localStorage.getItem('aicte_icms_user');
  try {
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: any) {
  localStorage.setItem('aicte_icms_user', JSON.stringify(user));
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Remove Content-Type for FormData uploads so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeAuthToken();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Session expired or unauthorized');
  }

  if (!response.ok) {
    let errMsg = `Request failed (${response.status})`;
    try {
      const errData = await response.json();
      errMsg = errData.detail || errData.message || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  // If response is a file download or blob
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('text/csv') || contentType.includes('spreadsheetml'))) {
    return (await response.blob()) as unknown as T;
  }

  return response.json();
}
