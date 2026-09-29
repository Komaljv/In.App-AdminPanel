import { APP_CONFIG } from '@/config/app.config';
import type {
  ApiResponse,
  LoginResponse,
  User,
  Role,
  Invitation,
  DashboardStats,
  PaginatedResponse,
  Company,
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
  Company,
};

// Extra local-only types not in global types
export interface Category {
  id: string;
  name: string;
  companyId: string;
  createdAt: string;
  isVisible: boolean;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
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

let refreshPromise: Promise<string | null> | null = null;

async function call<T>(
  path: string,
  options: RequestInit,
  token?: string
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    };

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const json = await res.json().catch(() => ({}));
    // ---------------------------------------------------------
    // Handle Unauthorized / Token Expired with token refresh
    // ---------------------------------------------------------
    const isTokenExpired =
      res.status === 401 ||
      json?.error?.code === "AUTH_TOKEN_EXPIRED" ||
      json?.error?.message === "Token expired" ||
      json?.message === "Token expired" ||
      json?.error === "Token expired";

    if (
      isTokenExpired &&
      typeof window !== "undefined" &&
      !path.includes("/api/auth/refresh") &&
      !path.includes("/api/auth/login")
    ) {
      const stored = localStorage.getItem("crm_admin_auth");

      if (stored) {
        try {
          const authUser = JSON.parse(stored);

          if (authUser.refreshToken) {
            if (!refreshPromise) {
              refreshPromise = fetch(`${BASE_URL}/api/auth/refresh`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  refreshToken: authUser.refreshToken,
                }),
              })
                .then(async (refreshRes) => {
                  const refreshJson = await refreshRes
                    .json()
                    .catch(() => ({}));
                  
                  let actualData = refreshJson?.data;
                  if (typeof refreshJson?.data === 'string' && refreshJson?.message && typeof refreshJson?.message === 'object') {
                    actualData = refreshJson.message;
                  }

                  if (
                    refreshRes.ok &&
                    refreshJson?.success &&
                    actualData?.accessToken
                  ) {
                    const newAccessToken = actualData.accessToken;

                    const newRefreshToken =
                      actualData.refreshToken ||
                      authUser.refreshToken;

                    authUser.token = newAccessToken;
                    authUser.accessToken = newAccessToken;
                    authUser.refreshToken = newRefreshToken;

                    localStorage.setItem(
                      "crm_admin_auth",
                      JSON.stringify(authUser)
                    );

                    window.dispatchEvent(
                      new Event("auth-token-refreshed")
                    );

                    return newAccessToken;
                  }

                  console.error("Refresh failed. Response:", refreshJson);
                  localStorage.removeItem("crm_admin_auth");
                  window.location.href = "/login";

                  return null;
                })
                .catch(() => {
                  localStorage.removeItem("crm_admin_auth");
                  window.location.href = "/login";

                  return null;
                })
                .finally(() => {
                  refreshPromise = null;
                });
            }

            const newAccessToken = await refreshPromise;

            if (newAccessToken) {
              const retryHeaders = {
                ...headers,
                Authorization: `Bearer ${newAccessToken}`,
              };

              const retryRes = await fetch(`${BASE_URL}${path}`, {
                ...options,
                headers: retryHeaders,
              });

              const retryJson = await retryRes
                .json()
                .catch(() => ({}));

              if (!retryRes.ok) {
                return {
                  success: false,
                  error: getApiError(retryJson, retryRes.status),
                };
              }

              return normalizeApiResponse<T>(retryJson);
            }
          }
        } catch (e) {
          console.error("Token refresh error:", e);
        }
      }
    }

    // ---------------------------------------------------------
    // Normal API error
    // ---------------------------------------------------------
    if (!res.ok) {
      return {
        success: false,
        error: getApiError(json, res.status),
      };
    }

    // ---------------------------------------------------------
    // SUCCESS RESPONSE
    // ---------------------------------------------------------
    return normalizeApiResponse<T>(json);
  } catch (err: unknown) {
    console.error("API call error:", err);

    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Network error",
    };
  }
}

/**
 * Normalize API response.
 *
 * Supports both:
 *
 * Correct:
 * {
 *   success: true,
 *   data: {
 *     user,
 *     accessToken
 *   },
 *   message: "Login successful"
 * }
 *
 * And the current login response:
 * {
 *   success: true,
 *   data: "Login successful",
 *   message: {
 *     user,
 *     accessToken
 *   }
 * }
 */
function normalizeApiResponse<T>(json: any): ApiResponse<T> {
  // ---------------------------------------------------------
  // Fix inverted data/message fields
  // Many endpoints return the success message in `data` and the payload in `message`
  // ---------------------------------------------------------
  if (json && typeof json === 'object') {
    if (typeof json.data === 'string' && json.message !== undefined && typeof json.message !== 'string') {
      console.warn("API returned payload in `message` and string in `data`. Swapping them.");
      const actualData = json.message;
      const actualMessage = json.data;
      json.data = actualData;
      json.message = actualMessage;
    }
  }

  // ---------------------------------------------------------
  // Standard response extraction
  // ---------------------------------------------------------
  let data = json;

  if (json && typeof json === 'object') {
    if ('data' in json) {
      // If the json has a "data" property, we normally unwrap it,
      // UNLESS it's a paginated response containing 'total' or 'page' alongside 'data'
      if (Array.isArray(json.data) && ('total' in json || 'page' in json || 'limit' in json)) {
        data = json;
      } else {
        data = json.data;
      }
    }
    
    // Now check if the resulting data is still an object with a nested array
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (Array.isArray(data.data) && !('total' in data) && !('page' in data)) {
        data = data.data;
      } else if (Array.isArray(data.items)) {
        data = data.items;
      } else if (Array.isArray(data.results)) {
        data = data.results;
      } else {
        // Fallback: If the object only has one relevant key and it's an array, unwrap it
        const keys = Object.keys(data).filter(k => !['success', 'message', 'status', 'meta', 'page', 'total', 'limit'].includes(k));
        if (keys.length === 1 && Array.isArray(data[keys[0]])) {
          data = data[keys[0]];
        }
      }
    }
  }

  return {
    success: json?.success !== false,
    data: data as T,
    message:
      typeof json?.message === "string"
        ? json.message
        : undefined,
  };
}

/**
 * Safely extract API error message.
 */
function getApiError(json: any, status: number): string {
  if (Array.isArray(json?.message)) {
    return json.message.join(", ");
  }

  if (typeof json?.message === "string") {
    return json.message;
  }

  if (typeof json?.error === "string") {
    return json.error;
  }

  if (typeof json?.error?.message === "string") {
    return json.error.message;
  }

  // Map common HTTP status codes to user-friendly messages
  switch (status) {
    case 400:
      return "Invalid request. Please check your input and try again.";
    case 401:
      return "Authentication failed. Please check your credentials.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource could not be found.";
    case 408:
      return "The request timed out. Please try again.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 500:
      return "An internal server error occurred. Please try again later.";
    case 502:
      return "Bad gateway. The server is temporarily unavailable.";
    case 503:
      return "Service unavailable. Please try again later.";
    case 504:
      return "Gateway timeout. The server took too long to respond.";
    default:
      return "An unexpected error occurred. Please try again.";
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

/** GET /api/admin/audit-logs/export */
export async function exportAuditLogs(authToken: string): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/api/admin/audit-logs/export`, {
    method: 'GET',
    headers: authHeaders(authToken),
  });
  if (!response.ok) throw new Error('Failed to export audit logs');
  return response.blob();
}

/** GET /api/documents/search */
export async function searchDocuments(
  authToken: string,
  params: Record<string, any>
): Promise<ApiResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  return call(`/api/documents/search?${query.toString()}`, { method: 'GET' }, authToken);
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
  authToken: string,
  departmentId?: string,
  companyId?: string
): Promise<ApiResponse> {
  return call(
    '/api/admin/invite-user',
    { method: 'POST', body: JSON.stringify({ email, roleId, departmentId, companyId }) },
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
  data: {
    name?: string;
    isVisible?: boolean;
  },
  authToken: string
): Promise<ApiResponse<Category>> {
  return call<Category>(
    `/api/categories/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
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
  data: { name: string; fiscalCode?: string; email: string },
  authToken: string
): Promise<ApiResponse<Company>> {
  return call<Company>('/api/company', { method: 'POST', body: JSON.stringify(data) }, authToken);
}

/** POST /api/company/complete */
export async function completeCompanyRegistration(
  token: string,
  password: string,
  extra: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    country?: string;
    companyName?: string;
    fiscalCode?: string;
  }
): Promise<ApiResponse> {
  return call('/api/company/complete', {
    method: 'POST',
    body: JSON.stringify({ token, password, ...extra }),
  });
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

/** POST /api/admin/companies/:companyId/custom-plan */
export async function createCustomPlan(
  companyId: string,
  data: {
    name: string;
    price: number;
    maxUsers: number;
    storage?: number;
    features?: string[];
  },
  authToken: string
): Promise<ApiResponse> {
  return call(`/api/admin/companies/${companyId}/custom-plan`, { method: 'POST', body: JSON.stringify(data) }, authToken);
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
/** GET /api/documents/private/:token */
export async function getPrivateDocument(token: string, authToken: string): Promise<ApiResponse> {
  return call(`/api/documents/private/${token}`, { method: 'GET' }, authToken);
}

export async function downloadPrivateDocument(token: string, authToken: string): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/api/documents/private/${token}/download`, {
    method: 'GET',
    headers: authHeaders(authToken),
  });
  if (!response.ok) throw new Error('Failed to download document');
  return response.blob();
}

export async function getUploadedDocuments(authToken: string): Promise<ApiResponse> {
  return call('/api/documents/uploads', { method: 'GET' }, authToken);
}

/** GET /api/documents/trash */
export async function getTrashDocuments(authToken: string): Promise<ApiResponse> {
  return call('/api/documents/trash', { method: 'GET' }, authToken);
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

/** GET /api/documents/:id/versions */
export async function getDocumentVersions(id: string, authToken: string): Promise<ApiResponse> {
  return call(`/api/documents/${id}/versions`, { method: 'GET' }, authToken);
}

/** POST /api/documents/:id/versions/:versionId/restore */
export async function restoreDocumentVersion(
  id: string,
  versionId: string,
  authToken: string
): Promise<ApiResponse> {
  return call(`/api/documents/${id}/versions/${versionId}/restore`, { method: 'POST' }, authToken);
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

// ─── Roles Management ────────────────────────────────────────────────────────

export async function createRole(
  data: { name: string; permissions?: string[]; restrictedCategories?: string[] },
  authToken: string
): Promise<ApiResponse<Role>> {
  return call<Role>('/api/admin/roles', { method: 'POST', body: JSON.stringify(data) }, authToken);
}

export async function updateRole(
  id: string,
  data: { name?: string; permissions?: string[]; restrictedCategories?: string[] },
  authToken: string
): Promise<ApiResponse<Role>> {
  return call<Role>(`/api/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }, authToken);
}

export async function deleteRole(id: string, authToken: string): Promise<ApiResponse> {
  return call(`/api/admin/roles/${id}`, { method: 'DELETE' }, authToken);
}

// ─── Departments ─────────────────────────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  companyId: string;
  createdAt: string;
}

export async function getDepartments(authToken: string): Promise<ApiResponse<Department[]>> {
  return call<Department[]>('/api/admin/departments', { method: 'GET' }, authToken);
}

export async function createDepartment(name: string, authToken: string): Promise<ApiResponse<Department>> {
  return call<Department>('/api/admin/departments', { method: 'POST', body: JSON.stringify({ name }) }, authToken);
}

export async function updateDepartment(id: string, name: string, authToken: string): Promise<ApiResponse<Department>> {
  return call<Department>(`/api/admin/departments/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }, authToken);
}

export async function deleteDepartment(id: string, authToken: string): Promise<ApiResponse> {
  return call(`/api/admin/departments/${id}`, { method: 'DELETE' }, authToken);
}

// ─── Sharing ─────────────────────────────────────────────────────────────

export async function createPublicShareLink(
  id: string, 
  payload: { expiresAt?: string; type?: string }, 
  authToken: string
): Promise<ApiResponse<any>> {
  return call(`/api/documents/${id}/public-share`, { method: 'POST', body: JSON.stringify(payload) }, authToken);
}

export async function shareDocumentPrivate(
  id: string, 
  payload: { sharedWithUserId?: string; email?: string; accessType?: string; type?: string; notify?: boolean }, 
  authToken: string
): Promise<ApiResponse<any>> {
  return call(`/api/documents/${id}/share`, { method: 'POST', body: JSON.stringify(payload) }, authToken);
}

// ─── User Management ──────────────────────────────────────────────────────

export async function updateUser(
  id: string,
  payload: any,
  authToken: string
): Promise<ApiResponse> {
  return call(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, authToken);
}

export async function getCompanyUsers(
  authToken: string,
  page: number = 1,
  limit: number = 50,
  search?: string
): Promise<ApiResponse<User[]>> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) query.set("search", search);
  return call(`/api/users?${query}`, { method: 'GET' }, authToken);
}

// ─── Reports ────────────────────────────────────────────────────────────────

export interface ReportSummary {
  period: {
    from: string;
    to: string;
  };
  currency: string;
  cost: {
    total: string;
    document_count: number;
  };
  sales: {
    total: string;
    document_count: number;
  };
  profit: string;
  vat: {
    on_sales: string;
    on_cost: string;
    net_payable: string;
    on_cost_excluded_receipts: string;
    receipt_count: number;
  };
  bank: {
    paid: string;
    received: string;
    balance?: string;
  };
}

export async function getReportSummary(
  authToken: string,
  from?: string,
  to?: string,
  currency?: string
): Promise<ApiResponse<ReportSummary>> {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (currency) params.append('currency', currency);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return call<ReportSummary>(`/api/reports/summary${queryString}`, { method: 'GET' }, authToken);
}
