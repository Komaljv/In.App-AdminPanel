"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Search, MoreHorizontal, Trash2, UserX, Shield, RefreshCw, BarChart2, Bell } from "lucide-react";
import InviteModal from "@/components/invite-modal/InviteModal";
import ChangeRoleModal from "@/components/change-role-modal/ChangeRoleModal";
import NotificationModal from "@/components/notification-modal/NotificationModal";
import ConfirmDialog from "@/components/confirm-dialog/ConfirmDialog";
import { useAuth } from "@/lib/auth-context";
import { getAdminUsers, deleteUser, deactivateUser, activateUser, type User } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import styles from "./page.module.css";

const STATUS_COLORS: Record<string, string> = {
  active: "badge-success",
  pending: "badge-warning",
  inactive: "badge-danger",
};

export default function UsersPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Role change state
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Notification state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationUser, setNotificationUser] = useState<User | null>(null);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMeta, setConfirmMeta] = useState({ title: "", message: "", confirmLabel: "Confirm", variant: "danger" as "danger" | "warning", icon: "delete" as "delete" | "deactivate" | "reactivate" });

  const openConfirm = (meta: typeof confirmMeta, action: () => void) => {
    setConfirmMeta(meta);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    confirmAction?.();
    setConfirmOpen(false);
  };

  const fetchUsers = useCallback(async () => {
    if (!authUser?.token) return;
    setLoading(true);
    setFetchError("");
    const res = await getAdminUsers(authUser.token, page, 50);
    setLoading(false);

    if (res.success && res.data) {
      // API returns a plain array (not paginated object)
      const list = Array.isArray(res.data) ? res.data : [];
      setUsers(list);
      setTotalPages(1);
    } else {
      const errMsg = res.error || "Failed to fetch users";
      setFetchError(errMsg);
      showToast(errMsg, "error");
    }
  }, [authUser?.token, page, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id: string, name: string) => {
    openConfirm(
      {
        title: "Delete User",
        message: `Permanently delete "${name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
        icon: "delete",
      },
      async () => {
        if (!authUser?.token) return;
        const res = await deleteUser(id, authUser.token);
        if (res.success) {
          showToast(`${name} deleted successfully`, "success");
          setUsers((prev) => prev.filter((u) => u.id !== id));
        } else {
          showToast(res.error || "Failed to delete user", "error");
        }
        setOpenMenu(null);
      }
    );
  };

  const handleDeactivate = async (id: string, name: string, isActive: boolean) => {
    const action = isActive ? "deactivate" : "reactivate";
    openConfirm(
      {
        title: isActive ? "Deactivate User" : "Reactivate User",
        message: `Are you sure you want to ${action} "${name}"?`,
        confirmLabel: isActive ? "Deactivate" : "Reactivate",
        variant: isActive ? "danger" : "warning",
        icon: isActive ? "deactivate" : "reactivate",
      },
      async () => {
        if (!authUser?.token) return;
        const res = isActive 
          ? await deactivateUser(id, authUser.token)
          : await activateUser(id, authUser.token);
          
        if (res.success) {
          showToast(`${name} ${action}d successfully`, "success");
          setUsers((prev) =>
            prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
          );
        } else {
          showToast(res.error || `Failed to ${action} user`, "error");
        }
        setOpenMenu(null);
      }
    );
  };

  const openRoleModal = (u: User) => {
    setSelectedUser(u);
    setIsRoleOpen(true);
    setOpenMenu(null);
  };

  const openNotificationModal = (u: User) => {
    setNotificationUser(u);
    setIsNotificationOpen(true);
    setOpenMenu(null);
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    
    let status = "active";
    if (u.isInvited) {
      status = "pending";
    } else if (u.isActive === false) {
      status = "inactive";
    }

    const matchStatus = statusFilter === "all" || status === statusFilter;
    
    return matchSearch && matchStatus;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.subtitle}>Manage organization members and roles</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsInviteOpen(true)}
          id="open-invite-modal-btn"
        >
          <UserPlus size={16} />
          Invite User
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            id="users-search"
            type="text"
            className={`form-input ${styles.searchInput}`}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          {["all", "active", "pending", "inactive"].map((s) => (
            <button
              key={s}
              className={`${styles.filterBtn} ${statusFilter === s ? styles.filterActive : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  <span className="spinner" /> Loading users...
                </td>
              </tr>
            ) : fetchError ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 28 }}>🔒</span>
                    <span style={{ color: "var(--accent-danger)", fontWeight: 600 }}>
                      {fetchError.includes("403") || fetchError.toLowerCase().includes("forbidden")
                        ? "Access Denied — Admin privileges required"
                        : fetchError}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Please log in as an Admin to view users.
                    </span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className={styles.tableRow}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.userAvatar}>
                        {u.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className={styles.userName}>{u.name}</p>
                        <p className={styles.userEmail}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info">{u.role?.name || "Member"}</span>
                  </td>
                  <td>
                    {u.isInvited ? (
                      <span className="badge badge-warning">pending</span>
                    ) : (
                      <span className={`badge ${u.isActive !== false ? "badge-success" : "badge-danger"}`}>
                        {u.isActive !== false ? "active" : "inactive"}
                      </span>
                    )}
                  </td>
                  <td className={styles.joinedCell}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td>
                    <div className={styles.menuWrapper}>
                      <button
                        className={styles.menuBtn}
                        onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenu === u.id && (
                        <div className={styles.dropdown}>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              router.push(`/dashboard/users/${u.id}`);
                              setOpenMenu(null);
                            }}
                          >
                            <BarChart2 size={14} style={{ marginRight: 8 }} />
                            View Analytics
                          </button>
                          {/* <button
                            className={styles.dropdownItem}
                            onClick={() => openNotificationModal(u)}
                          >
                            <Bell size={14} style={{ marginRight: 8 }} />
                            Send Notification
                          </button> */}
                          <button
                            className={styles.dropdownItem}
                            onClick={() => openRoleModal(u)}
                          >
                            <Shield size={14} style={{ marginRight: 8 }} />
                            Change Role
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => handleDeactivate(u.id, u.name, u.isActive !== false)}
                          >
                            <UserX size={14} style={{ marginRight: 8 }} />
                            {u.isActive !== false ? "Deactivate" : "Reactivate"}
                          </button>
                          <button
                            className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
                            onClick={() => handleDelete(u.id, u.name)}
                          >
                            <Trash2 size={14} style={{ marginRight: 8 }} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="btn btn-ghost"
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
            className="btn btn-ghost"
          >
            Next
          </button>
        </div>
      )}

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={fetchUsers}
      />

      <ChangeRoleModal
        isOpen={isRoleOpen}
        onClose={() => setIsRoleOpen(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        user={notificationUser}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        title={confirmMeta.title}
        message={confirmMeta.message}
        confirmLabel={confirmMeta.confirmLabel}
        variant={confirmMeta.variant}
        icon={confirmMeta.icon}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
