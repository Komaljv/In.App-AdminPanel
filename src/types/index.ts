/**
 * Global shared types for the In.APP Admin Panel.
 * Import from "@/types" throughout the project.
 */

// ─── Utility Types ────────────────────────────────────────────────────────────

/** Standard API envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    companyId: string;
    name: string;
    email: string;
    roleId: string;
    role: { id: string; name: string; isDefault: boolean };
    createdAt: string;
  };
  accessToken: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  roleId: string;
  createdAt: string;
  isActive?: boolean;
  isInvited?: boolean;
  role?: Role;
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  isDefault: boolean;
}

// ─── Invitations ──────────────────────────────────────────────────────────────

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  email: string;
  roleId: string;
  role?: Role;
  companyId: string;
  status: InvitationStatus;
  token: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface InvitePayload {
  email: string;
  roleId: string;
}

export interface AcceptInvitePayload {
  token: string;
  name: string;
  password: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalUsers?: number;
  totalCompanies?: number;
  totalDocuments?: number;
  totalCategories?: number;
  pendingInvites?: number;
  recentActivity?: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  createdAt: string;
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  fiscalCode?: string;
  createdAt?: string;
}

// ─── UI Component Props ───────────────────────────────────────────────────────

/** Semantic color variants used across UI components */
export type ColorVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'ghost'
  | 'outline';

/** Size scale used across UI components */
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg';

/** Toast notification type */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
