"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, Pencil, Trash2, Shield, X, Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getCategories,
  type Role,
  type Category
} from "@/lib/api";
import ConfirmDialog from "@/components/confirm-dialog/ConfirmDialog";
import styles from "../users/page.module.css";

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Badge } from "@/components/ui/Badge/Badge";
import { Table, type Column } from "@/components/ui/Table/Table";
import { Card, CardHeader, CardBody } from "@/components/ui/Card/Card";

const PERMISSION_GROUPS = [
  { name: "Role Management", perms: ["CREATE_ROLE", "READ_ROLE", "UPDATE_ROLE", "DELETE_ROLE"] },
  { name: "Document Management", perms: ["CREATE_DOCUMENT", "READ_DOCUMENT", "UPDATE_DOCUMENT", "DELETE_DOCUMENT"] },
  { name: "Category Management", perms: ["CREATE_CATEGORY", "READ_CATEGORY", "UPDATE_CATEGORY", "DELETE_CATEGORY"] },
  { name: "User Management", perms: ["CREATE_USER", "READ_USER", "UPDATE_USER", "DELETE_USER"] },
  { name: "Folder Management", perms: ["CREATE_FOLDER", "READ_FOLDER", "UPDATE_FOLDER", "DELETE_FOLDER"] },
  { name: "Other Actions", perms: ["TEST_NOTIFICATION", "CREATE_PUBLIC_SHARE"] },
];

interface RoleForm {
  name: string;
  permissions: string[];
  restrictedCategories: string[];
}

const EMPTY_FORM: RoleForm = { name: "", permissions: [], restrictedCategories: [] };

export default function RolesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create/Edit state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<RoleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  const fetchData = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    const [rolesRes, categoriesRes] = await Promise.all([
      getRoles(user.token),
      getCategories(user.token)
    ]);
    setLoading(false);
    
    if (rolesRes.success && rolesRes.data) {
      setRoles(rolesRes.data);
    } else {
      showToast(rolesRes.error || "Failed to load roles", "error");
    }

    if (categoriesRes.success && categoriesRes.data) {
      const userCategories = categoriesRes.data.filter(
        (cat) => cat.creator?.id === user.id
      );
      setCategories(userCategories);
    }
  }, [user?.token, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!formState.name.trim() || !user?.token) return;
    setSaving(true);
    
    let res;
    if (editingId) {
      res = await updateRole(editingId, formState, user.token);
    } else {
      res = await createRole(formState, user.token);
    }
    
    setSaving(false);
    if (res.success && res.data) {
      await fetchData();
      setFormState(EMPTY_FORM);
      setShowForm(false);
      setEditingId(null);
      showToast(editingId ? "Role updated" : "Role created", "success");
    } else {
      showToast(res.error || "Failed to save role", "error");
    }
  };

  const startEdit = (role: Role) => {
    setEditingId(role.id);
    setFormState({
      name: role.name,
      permissions: role.permissions || [],
      restrictedCategories: role.restrictedCategories?.map((c: any) => c.id || c) || []
    });
    setShowForm(true);
  };

  const openDelete = (role: Role) => {
    setDeletingId(role.id);
    setDeletingName(role.name);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId || !user?.token) return;
    const res = await deleteRole(deletingId, user.token);
    setConfirmOpen(false);
    if (res.success) {
      setRoles((prev) => prev.filter((r) => r.id !== deletingId));
      showToast("Role deleted", "success");
    } else {
      showToast(res.error || "Failed to delete role", "error");
    }
  };

  const togglePermission = (perm: string) => {
    setFormState(prev => {
      const perms = prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm];
      return { ...prev, permissions: perms };
    });
  };

  const toggleCategory = (catId: string) => {
    setFormState(prev => {
      const cats = prev.restrictedCategories.includes(catId)
        ? prev.restrictedCategories.filter(c => c !== catId)
        : [...prev.restrictedCategories, catId];
      return { ...prev, restrictedCategories: cats };
    });
  };

  const filtered = roles.filter((r) => {
    return r.name.toLowerCase().includes(search.toLowerCase());
  });

  const columns = useMemo<Column<Role>[]>(() => [
    {
      key: "index",
      header: "#",
      width: "50px",
      render: (_, i) => <span style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
    },
    {
      key: "name",
      header: "Role Name",
      render: (role) => (
        <div className={styles.userCell}>
          <div className={styles.userAvatar}>
            <Shield size={16} />
          </div>
          <span className={styles.userName}>{role.name}</span>
        </div>
      )
    },
    {
      key: "type",
      header: "Type",
      render: (role) => (
        <Badge variant={role.isDefault ? "warning" : "neutral"}>
          {role.isDefault ? "System Default" : "Custom"}
        </Badge>
      )
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (role) => (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {role.permissions?.length || 0} granted
        </span>
      )
    },
    {
      key: "categories",
      header: "Category Restrictions",
      render: (role) => (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {role.restrictedCategories && role.restrictedCategories.length > 0 
            ? `${role.restrictedCategories.length} categories` 
            : "None (All Access)"}
        </span>
      )
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (role) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startEdit(role)}
            title="Edit role"
          >
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            onClick={() => openDelete(role)}
            title="Delete role"
          >
            <Trash2 size={14} color="var(--color-danger-text)" />
          </Button>
        </div>
      )
    }
  ], []);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Roles & Permissions</h1>
          <p className={styles.subtitle}>
            Manage custom roles and access control
          </p>
        </div>
        {!showForm && (
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => {
              setEditingId(null);
              setFormState(EMPTY_FORM);
              setShowForm(true);
            }}
            id="create-role-btn"
          >
            New Role
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="mb-6" style={{ marginBottom: 'var(--space-6)' }}>
          <CardHeader
            title={editingId ? "Edit Role" : "New Role"}
            action={
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setFormState(EMPTY_FORM); setEditingId(null); }}>
                <X size={16} />
              </Button>
            }
          />
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="role-name">
                  Role Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <Input
                  id="role-name"
                  type="text"
                  placeholder="E.g. HR Manager"
                  value={formState.name}
                  onChange={(e) => setFormState((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Permissions
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '12px' }}>
                  {PERMISSION_GROUPS.map(group => (
                    <div key={group.name} style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(0,0,0,0.03)' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {group.name}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {group.perms.map(perm => (
                          <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <div className={styles.switch} style={{ transform: 'scale(0.85)', transformOrigin: 'left center', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={formState.permissions.includes(perm)}
                                onChange={() => togglePermission(perm)}
                              />
                              <span className={styles.slider}></span>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                              {perm.replace(/_/g, ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Allowed Categories (Optional)
                </label>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                  Select the specific categories users with this role are allowed to access. If left empty, they will not be granted access to any extra categories.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
                  {categories.map(cat => (
                    <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '12px', background: 'rgba(255,255,255,0.4)', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.03)' }}>
                      <div className={styles.switch} style={{ transform: 'scale(0.85)', transformOrigin: 'left center', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={formState.restrictedCategories.includes(cat.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleCategory(cat.id);
                          }}
                        />
                        <span className={styles.slider}></span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                        {cat.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || !formState.name.trim()}
                loading={saving}
                leftIcon={<Check size={16} />}
                id="confirm-save-role-btn"
              >
                Save Role
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowForm(false); setFormState(EMPTY_FORM); setEditingId(null); }}
              >
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {!showForm && (
        <>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.searchWrapper}>
              <Input
                id="roles-search"
                type="text"
                leftIcon={<Search size={15} />}
                placeholder="Search roles…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Badge variant="neutral">
              {filtered.length} {filtered.length === 1 ? "role" : "roles"}
            </Badge>
          </div>

          {/* Table */}
          <Table
            columns={columns}
            data={filtered}
            loading={loading}
            emptyMessage={search ? "No roles match your search" : "No roles yet."}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Role"
        message={`Permanently delete "${deletingName}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        icon="delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
