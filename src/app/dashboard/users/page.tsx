"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Search, MoreHorizontal, Trash2, UserX, Shield, BarChart2 } from "lucide-react";
import InviteModal from "@/components/invite-modal/InviteModal";
import ChangeRoleModal from "@/components/change-role-modal/ChangeRoleModal";
import NotificationModal from "@/components/notification-modal/NotificationModal";
import ConfirmDialog from "@/components/confirm-dialog/ConfirmDialog";
import { useAuth } from "@/lib/auth-context";
import { getAdminUsers, deleteUser, deactivateUser, activateUser, getCompanies, updateUser, type User, type Company } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { isAdminUser, isSystemAdmin } from "@/lib/role-utils";
import styles from "./page.module.css";

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Badge, statusVariant } from "@/components/ui/Badge/Badge";
import { Table, type Column } from "@/components/ui/Table/Table";
import { Card, CardHeader, CardBody } from "@/components/ui/Card/Card";

export default function UsersPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
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
      const list = Array.isArray(res.data) ? res.data : [];
      setUsers(list);
      setTotalPages(1);
    } else {
      const errMsg = res.error || "Failed to fetch users";
      setFetchError(errMsg);
      showToast(errMsg, "error");
    }
  }, [authUser?.token, page, showToast]);

  const handleTogglePublicShare = async (user: User) => {
    if (!authUser?.token) return;
    try {
      const newStatus = !user.canCreatePublicShares;
      const res = await updateUser(user.id, { canCreatePublicShares: newStatus }, authUser.token);
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, canCreatePublicShares: newStatus } : u));
        showToast("User updated successfully", "success");
      } else {
        showToast(res.error || "Failed to update user", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    }
  };

  const handleTogglePrivateShare = async (user: User) => {
    if (!authUser?.token) return;
    try {
      const newStatus = !user.canShareDocuments;
      const res = await updateUser(user.id, { canShareDocuments: newStatus }, authUser.token);
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, canShareDocuments: newStatus } : u));
        showToast("User updated successfully", "success");
      } else {
        showToast(res.error || "Failed to update user", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (isAdminUser(authUser) && authUser?.token) {
      getCompanies(authUser.token, 1, 100).then(res => {
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data as any).items || (res.data as any).data || [];
          setCompanies(list);
        }
      });
    }
  }, [authUser]);

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

  const columns = useMemo<Column<User>[]>(() => {
    const cols: Column<User>[] = [
      {
        key: "user",
        header: "User",
        render: (u) => (
          <div className={styles.userCell}>
            <div className={styles.userAvatar}>
              {u.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <p className={styles.userName}>{u.name}</p>
              <p className={styles.userEmail}>{u.email}</p>
            </div>
          </div>
        )
      }
    ];

    if (isSystemAdmin(authUser)) {
      cols.push({
        key: "company",
        header: "Company",
        render: (u) => (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {companies.find(c => c.id === u.companyId)?.name || "—"}
          </span>
        )
      });
    }

    cols.push(
      {
        key: "role",
        header: "Role",
        render: (u) => <Badge variant="info">{u.role?.name || "Member"}</Badge>
      },
      {
        key: "status",
        header: "Status",
        render: (u) => {
          if (u.isInvited) return <Badge variant="warning">pending</Badge>;
          return <Badge variant={u.isActive !== false ? "success" : "danger"}>
            {u.isActive !== false ? "active" : "inactive"}
          </Badge>;
        }
      },
      {
        key: "joined",
        header: "Joined",
        render: (u) => <span className={styles.joinedCell}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</span>
      },
      {
        key: "publicShare",
        header: "Public Share",
        render: (u) => (
          <label className={styles.switch}>
            <input 
              type="checkbox" 
              checked={u.canCreatePublicShares || false} 
              onChange={() => handleTogglePublicShare(u)} 
            />
            <span className={styles.slider}></span>
          </label>
        )
      },
      {
        key: "privateShare",
        header: "Private Share",
        render: (u) => (
          <label className={styles.switch}>
            <input 
              type="checkbox" 
              checked={u.canShareDocuments !== false} 
              onChange={() => handleTogglePrivateShare(u)} 
            />
            <span className={styles.slider}></span>
          </label>
        )
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (u) => (
          <div className="relative" style={{position: "relative"}}>
            <button
              className="btn btn-ghost" style={{padding: "4px"}}
              onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
            >
              <MoreHorizontal size={16} />
            </button>
            {openMenu === u.id && (
              <div className="menu" style={{position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 'var(--z-dropdown)'}}>
                <button
                  className="menu-item"
                  onClick={() => {
                    router.push(`/dashboard/users/${u.id}`);
                    setOpenMenu(null);
                  }}
                >
                  <BarChart2 size={14} style={{ marginRight: 8 }} />
                  View Analytics
                </button>
                <button
                  className="menu-item"
                  onClick={() => openRoleModal(u)}
                >
                  <Shield size={14} style={{ marginRight: 8 }} />
                  Change Role
                </button>
                <button
                  className="menu-item"
                  onClick={() => handleDeactivate(u.id, u.name, u.isActive !== false)}
                >
                  <UserX size={14} style={{ marginRight: 8 }} />
                  {u.isActive !== false ? "Deactivate" : "Reactivate"}
                </button>
                <button
                  className="menu-item menu-item-danger"
                  onClick={() => handleDelete(u.id, u.name)}
                >
                  <Trash2 size={14} style={{ marginRight: 8 }} />
                  Delete
                </button>
              </div>
            )}
          </div>
        )
      }
    );

    return cols;
  }, [authUser, companies, openMenu]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.subtitle}>Manage organization members and roles</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<UserPlus size={16} />}
          onClick={() => setIsInviteOpen(true)}
          id="open-invite-modal-btn"
        >
          Invite User
        </Button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Input
            id="users-search"
            type="text"
            leftIcon={<Search size={15} />}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          {["all", "active", "pending", "inactive"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Card padding="none">
        {fetchError ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 28 }}>🔒</span>
              <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>
                {fetchError.includes("403") || fetchError.toLowerCase().includes("forbidden")
                  ? "Access Denied — Admin privileges required"
                  : fetchError}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Please log in as an Admin to view users.
              </span>
            </div>
          </div>
        ) : (
          <Table 
            columns={columns} 
            data={filtered} 
            loading={loading}
            emptyMessage="No users found"
          />
        )}
      </Card>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button 
            variant="ghost"
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
          <Button 
            variant="ghost"
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
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
