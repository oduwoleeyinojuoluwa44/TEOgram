import type { EncryptedPayload } from './crypto';

const BASE_URL = 'https://whisperbox.koyeb.app';
let currentAccessToken: string | null = null;

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  public_key: string;
  wrapped_private_key?: string;
  pbkdf2_salt?: string;
}

export interface AuthRequest {
  username: string;
  password: string;
  display_name?: string;
  public_key?: string;
  wrapped_private_key?: string;
  pbkdf2_salt?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

export interface Conversation {
  user_id: string;
  display_name: string;
  username: string;
  last_message_at: string;
}

export interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  payload: EncryptedPayload;
  created_at: string;
}

export interface PublicKeyResponse {
  public_key: string;
}

export interface SearchUser {
  id: string;
  display_name: string;
  username: string;
}

function getAccessToken() {
  currentAccessToken = currentAccessToken ?? sessionStorage.getItem('access_token');
  return currentAccessToken;
}

export function storeSessionTokens(accessToken: string, refreshToken: string) {
  currentAccessToken = accessToken;
  sessionStorage.setItem('access_token', accessToken);
  sessionStorage.setItem('refresh_token', refreshToken);
}

export function clearSessionTokens() {
  currentAccessToken = null;
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let detail = 'Request failed';

    if (isJson) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: 'Unknown error' })) as { detail?: string };
      detail = errorData.detail || detail;
    } else {
      const errorText = await response.text().catch(() => '');
      if (errorText.trim()) {
        detail = errorText.trim();
      }
    }

    if (response.status === 401 && typeof window !== 'undefined') {
      clearSessionTokens();
      window.dispatchEvent(new CustomEvent('teogram:unauthorized'));
    }

    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (isJson) {
    return response.json() as Promise<T>;
  }

  const text = await response.text();
  return text as T;
}

// Authentication
export const auth = {
  register: (data: AuthRequest) => apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: AuthRequest) => apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => apiFetch<UserProfile>('/auth/me'),
  refresh: (refreshToken: string) => apiFetch<AuthResponse>('/auth/refresh', { 
    method: 'POST', 
    body: JSON.stringify({ refresh_token: refreshToken }) 
  }),
  logout: (refreshToken: string) => apiFetch<{ ok: boolean }>('/auth/logout', { 
    method: 'POST', 
    body: JSON.stringify({ refresh_token: refreshToken }) 
  }),
};

// Users
export const users = {
  search: (query: string) => apiFetch<SearchUser[]>(`/users/search?q=${encodeURIComponent(query)}`),
  getPublicKey: (userId: string) => apiFetch<PublicKeyResponse>(`/users/${userId}/public-key`),
};

// Conversations
export const conversations = {
  list: () => apiFetch<Conversation[]>('/conversations'),
  getMessages: (userId: string, limit = 50, before?: string) => {
    let url = `/conversations/${userId}/messages?limit=${limit}`;
    if (before) url += `&before=${encodeURIComponent(before)}`;
    return apiFetch<Message[]>(url);
  },
};

// Messages
export const messages = {
  send: (to: string, payload: EncryptedPayload) => apiFetch<Message>('/messages', {
    method: 'POST',
    body: JSON.stringify({ to, payload }),
  }),
};
