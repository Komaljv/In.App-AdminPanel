/**
 * Application-wide configuration & constants.
 * All values sourced from environment variables.
 */

export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? 'In.APP Admin',
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0',
  apiUrl: "http://localhost:3000",
  appUrl: "http://localhost:3001",
  authStorageKey: process.env.NEXT_PUBLIC_AUTH_STORAGE_KEY ?? 'crm_admin_auth',
} as const;

/** Route constants — avoid magic strings throughout the app */
export const ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  users: '/dashboard/users',
  companies: '/dashboard/companies',
  categories: '/dashboard/categories',
  invitations: '/dashboard/invitations',
  settings: '/dashboard/settings',
  acceptInvite: (token: string) => `/accept-invite/${token}`,
} as const;

/** API endpoint paths (relative to BASE_URL) */
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
  },
  users: {
    list: '/api/users',
    byId: (id: string) => `/api/users/${id}`,
    deactivate: (id: string) => `/api/users/${id}/deactivate`,
    changeRole: (id: string) => `/api/users/${id}/role`,
  },
  invitations: {
    list: '/api/invitations',
    send: '/api/invitations',
    resend: (id: string) => `/api/invitations/${id}/resend`,
    revoke: (id: string) => `/api/invitations/${id}`,
    accept: (token: string) => `/api/invitations/accept/${token}`,
  },
  roles: {
    list: '/api/roles',
  },
  categories: {
    list: '/api/categories',
    create: '/api/categories',
    update: (id: string) => `/api/categories/${id}`,
    delete: (id: string) => `/api/categories/${id}`,
  },
  companies: {
    list: '/api/company',
    create: '/api/company',
    byId: (id: string) => `/api/company/${id}`,
    update: (id: string) => `/api/company/${id}`,
    delete: (id: string) => `/api/company/${id}`,
  },
  dashboard: {
    stats: '/api/dashboard/stats',
    activity: '/api/dashboard/activity',
  },
} as const;

/** Pagination defaults */
export const PAGINATION = {
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
} as const;

/** Toast duration */
export const TOAST_DURATION_MS = 4000;
