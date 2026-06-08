import { APP_CONFIG } from '@/config/app.config';
import type {
  ApiResponse,
  LoginResponse,
  User,
  Role,
  Invitation,
  DashboardStats,
  PaginatedResponse,
} from '@/types';

// Re-export all types so existing code importing from '@/lib/api' keeps working
export type {
  ApiResponse,
  LoginResponse,
  User,
  Role,
  Invitation,
  DashboardStats,
  PaginatedResponse,
};

// Extra local-only types not in global types
export interface Category {
  id: string;
  name: string;
  companyId: string;
  createdAt: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Company {
  id: string;
  name: string;
  fiscalCode?: string;
  createdAt?: string;
}

const BASE_URL = APP_CONFIG.apiUrl ? `${APP_CONFIG.apiUrl}` : '/';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function call<T>(
  path: string,
  options: RequestInit,
  token?: string
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error:
          json?.message ||
          json?.error ||
          (Array.isArray(json?.message) ? json.message.join(', ') : undefined) ||
          `Error ${res.status}`,
      };
    }

    return {
      success: true,
      data: json?.data ?? json,
      message: json?.message,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export { call as apiCall };

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** POST /api/auth/login */
export async function login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
  return call<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/** POST /api/auth/register */
export async function register(
  name: string,
  email: string,
  password: string
): Promise<ApiResponse> {
  return call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

/** POST /api/auth/forgot-password */
export async function forgotPassword(email: string): Promise<ApiResponse> {
  return call('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** POST /api/auth/reset-password */
export async function resetPassword(
  email: string,
  token: string,
  password: string
): Promise<ApiResponse> {
  return call('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, token, password }),
  });
}

/** GET /api/auth/invite-details/:token */
export async function getInviteDetails(token: string): Promise<ApiResponse> {
  return call(`/api/auth/invite-details/${token}`, { method: 'GET' });
}

/** POST /api/auth/accept-invite */
export async function acceptInvite(
  token: string,
  password: string,
  extra?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    country?: string;
    companyName?: string;
    fiscalCode?: string;
  }
): Promise<ApiResponse> {
  return call('/api/auth/accept-invite', {
    method: 'POST',
    body: JSON.stringify({ token, password, ...extra }),
  });
}

/** POST /api/auth/refresh */
export async function refreshToken(refreshToken: string): Promise<ApiResponse> {
  return call('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

/** GET /api/admin/dashboard */
export async function getDashboardStats(authToken: string): Promise<ApiResponse<DashboardStats>> {
  return call<DashboardStats>('/api/admin/dashboard', { method: 'GET' }, authToken);
}

/** GET /api/admin/analytics */
export async function getAnalytics(authToken: string): Promise<ApiResponse> {
  return call('/api/admin/analytics', { method: 'GET' }, authToken);
}

/** GET /api/admin/recent-activity */
export async function getRecentActivity(authToken: string): Promise<ApiResponse> {
  return call('/api/admin/recent-activity', { method: 'GET' }, authToken);
}

/** GET /api/admin/audit-logs */
export async function getAuditLogs(
  authToken: string,
  page = 1,
  limit = 20
): Promise<ApiResponse> {
  return call(`/api/admin/audit-logs?page=${page}&limit=${limit}`, { method: 'GET' }, authToken);
}

/** POST /api/admin/users/:id/impersonate */
export async function impersonateUser(
  userId: string,
  authToken: string
): Promise<ApiResponse> {
  return call(`/api/admin/users/${userId}/impersonate`, { method: 'POST' }, authToken);
}

/** POST /api/admin/invite-user */
export async function inviteUser(
  email: string,
  roleId: string,
  authToken: string
): Promise<ApiResponse> {
  return call(
    '/api/admin/invite-user',
    { method: 'POST', body: JSON.stringify({ email, roleId }) },
    authToken
  );
}

/** GET /api/admin/users */
export async function getAdminUsers(
  authToken: string,
  page = 1,
  limit = 50
): Promise<ApiResponse<User[]>> {
  return call<User[]>(`/api/admin/users?page=${page}&limit=${limit}`, { method: 'GET' }, authToken);
}

/** GET /api/admin/users/:id/analytics */
export async function getUserAnalytics(id: string, authToken: string): Promise<ApiResponse<any>> {
  return call<any>(`/api/admin/users/${id}/analytics`, { method: 'GET' }, authToken);
}

/** PATCH /api/admin/users/:id/deactivate */
export async function deactivateUser(id: string, authToken: string): Promise<ApiResponse> {
  return call(`/api/admin/users/${id}/deactivate`, { method: 'PATCH' }, authToken);
}

/** PATCH /api/admin/users/:id/activate */
export async function activateUser(id: string, authToken: string): Promise<ApiResponse> {
  return call(`/api/admin/users/${id}/activate`, { method: 'PATCH' }, authToken);
}

/** DELETE /api/admin/users/:id */
export async function deleteUser(id: string, authToken: string): Promise<ApiResponse> {
  return call(`/api/admin/users/${id}`, { method: 'DELETE' }, authToken);
}

/** PATCH /api/admin/users/:id/role */
export async function updateUserRole(
  id: string,
  roleId: string,
  authToken: string
): Promise<ApiResponse> {
  return call(
    `/api/admin/users/${id}/role`,
    { method: 'PATCH', body: JSON.stringify({ roleId }) },
    authToken
  );
}

/** GET /api/admin/roles */
export async function getRoles(authToken: string): Promise<ApiResponse<Role[]>> {
  return call<Role[]>('/api/admin/roles', { method: 'GET' }, authToken);
}

/** POST /api/admin/test-notification */
export async function sendTestNotification(
  userId: string,
  title: string,
  body: string,
  authToken: string
): Promise<ApiResponse> {
  return call(
    `/api/admin/test-notification`,
    { method: 'POST', body: JSON.stringify({ userId, title, body }) },
    authToken
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────

/** GET /api/users/me */
export async function getMe(authToken: string): Promise<ApiResponse<User>> {
  return call<User>('/api/users/me', { method: 'GET' }, authToken);
}

/** PUT /api/users/profile (multipart/form-data) */
export async function updateProfile(
  authToken: string,
  data: { name?: string; phoneNumber?: string; country?: string; password?: string; file?: File }
): Promise<ApiResponse> {
  const form = new FormData();
  if (data.name) form.append('name', data.name);
  if (data.phoneNumber) form.append('phoneNumber', data.phoneNumber);
  if (data.country) form.append('country', data.country);
  if (data.password) form.append('password', data.password);
  if (data.file) form.append('file', data.file);
  return call('/api/users/profile', { method: 'PUT', body: form }, authToken);
}

// ─── Categories ───────────────────────────────────────────────────────────────

/** GET /api/categories */
export async function getCategories(authToken: string): Promise<ApiResponse<Category[]>> {
  return call<Category[]>('/api/categories', { method: 'GET' }, authToken);
}

/** POST /api/categories */
export async function createCategory(
  name: string,
  authToken: string
): Promise<ApiResponse<Category>> {
  return call<Category>(
    '/api/categories',
    { method: 'POST', body: JSON.stringify({ name }) },
    authToken
  );
}

/** PUT /api/categories/:id */
export async function updateCategory(
  id: string,
  name: string,
  authToken: string
): Promise<ApiResponse> {
  return call(
    `/api/categories/${id}`,
    { method: 'PUT', body: JSON.stringify({ name }) },
    authToken
  );
}

/** DELETE /api/categories/:id */
export async function deleteCategory(id: string, authToken: string): Promise<ApiResponse> {
  return call(`/api/categories/${id}`, { method: 'DELETE' }, authToken);
}

// ─── Companies ────────────────────────────────────────────────────────────────

/** GET /api/company */
export async function getCompanies(
  authToken: string,
  page = 1,
  limit = 10
): Promise<ApiResponse<PaginatedResponse<Company>>> {
  return call<PaginatedResponse<Company>>(
    `/api/company?page=${page}&limit=${limit}`,
    { method: 'GET' },
    authToken
  );
}

/** GET /api/company/:id */
export async function getCompany(id: string, authToken: string): Promise<ApiResponse<Company>> {
  return call<Company>(`/api/company/${id}`, { method: 'GET' }, authToken);
}

/** POST /api/company */
export async function createCompany(
  data: { name: string; fiscalCode?: string },
  authToken: string
): Promise<ApiResponse<Company>> {
  return call<Company>('/api/company', { method: 'POST', body: JSON.stringify(data) }, authToken);
}

/** PUT /api/company/:id */
export async function updateCompany(
  id: string,
  data: { name?: string; fiscalCode?: string },
  authToken: string
): Promise<ApiResponse> {
  return call(`/api/company/${id}`, { method: 'PUT', body: JSON.stringify(data) }, authToken);
}

/** DELETE /api/company/:id */
export async function deleteCompany(id: string, authToken: string): Promise<ApiResponse> {
  return call(`/api/company/${id}`, { method: 'DELETE' }, authToken);
}

// ─── Documents ────────────────────────────────────────────────────────────────

/** GET /api/documents */
export async function getDocuments(
  authToken: string,
  params?: { page?: number; limit?: number; folderId?: string; categoryId?: string }
): Promise<ApiResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.folderId) q.set('folderId', params.folderId);
  if (params?.categoryId) q.set('categoryId', params.categoryId);
  return call(`/api/documents?${q}`, { method: 'GET' }, authToken);
}

/** GET /api/documents/uploads */
export async function getUploadedDocuments(authToken: string): Promise<ApiResponse> {
  return call('/api/documents/uploads', { method: 'GET' }, authToken);
}

/** GET /api/documents/trash */
export async function getTrashDocuments(authToken: string): Promise<ApiResponse> {
  return call('/api/documents/trash', { method: 'GET' }, authToken);
}

/** GET /api/documents/search */
export async function searchDocuments(
  q: string,
  authToken: string,
  page = 1,
  limit = 10
): Promise<ApiResponse> {
  return call(
    `/api/documents/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
    { method: 'GET' },
    authToken
  );
}

/** GET /api/documents/timeline */
export async function getDocumentTimeline(authToken: string): Promise<ApiResponse> {
  return call('/api/documents/timeline', { method: 'GET' }, authToken);
}

/** POST /api/documents/upload (multipart) */
export async function uploadDocument(
  authToken: string,
  data: { file: File; categoryId: string; folderId?: string; fileName?: string; parentId?: string }
): Promise<ApiResponse> {
  const form = new FormData();
  form.append('file', data.file);
  form.append('categoryId', data.categoryId);
  if (data.folderId) form.append('folderId', data.folderId);
  if (data.fileName) form.append('fileName', data.fileName);
  if (data.parentId) form.append('parentId', data.parentId);
  return call('/api/documents/upload', { method: 'POST', body: form }, authToken);
}

/** DELETE /api/documents/:id */
export async function deleteDocument(id: string, authToken: string): Promise<ApiResponse> {
  return call(`/api/documents/${id}`, { method: 'DELETE' }, authToken);
}

// ─── Folders ──────────────────────────────────────────────────────────────────

/** POST /api/folders */
export async function createFolder(
  name: string,
  categoryId: string,
  authToken: string
): Promise<ApiResponse> {
  return call(
    '/api/folders',
    { method: 'POST', body: JSON.stringify({ name, categoryId }) },
    authToken
  );
}

/** GET /api/folders/category/:categoryId */
export async function getFoldersByCategory(
  categoryId: string,
  authToken: string
): Promise<ApiResponse> {
  return call(`/api/folders/category/${categoryId}`, { method: 'GET' }, authToken);
}

/** GET /api/folders/:id */
export async function getFolder(id: string, authToken: string): Promise<ApiResponse> {
  return call(`/api/folders/${id}`, { method: 'GET' }, authToken);
}

/** PATCH /api/folders/:id */
export async function updateFolder(
  id: string,
  name: string,
  authToken: string
): Promise<ApiResponse> {
  return call(`/api/folders/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }, authToken);
}

/** DELETE /api/folders/:id */
export async function deleteFolder(id: string, authToken: string): Promise<ApiResponse> {
  return call(`/api/folders/${id}`, { method: 'DELETE' }, authToken);
}

// ─── Messaging ────────────────────────────────────────────────────────────────

/** GET /api/conversations */
export async function getConversations(authToken: string): Promise<ApiResponse> {
  return call('/api/conversations', { method: 'GET' }, authToken);
}

/** POST /api/conversations */
export async function createConversation(
  participantIds: string[],
  authToken: string
): Promise<ApiResponse> {
  return call(
    '/api/conversations',
    { method: 'POST', body: JSON.stringify({ participantIds }) },
    authToken
  );
}

/** GET /api/conversations/:conversationId/messages */
export async function getMessages(
  conversationId: string,
  authToken: string
): Promise<ApiResponse> {
  return call(`/api/conversations/${conversationId}/messages`, { method: 'GET' }, authToken);
}

/** POST /api/conversations/:conversationId/messages */
export async function sendMessage(
  conversationId: string,
  content: string,
  authToken: string
): Promise<ApiResponse> {
  return call(
    `/api/conversations/${conversationId}/messages`,
    { method: 'POST', body: JSON.stringify({ content }) },
    authToken
  );
}
