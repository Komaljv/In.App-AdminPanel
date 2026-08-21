"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Pencil, Trash2, Shield, X, Check,
  FileText, ShieldCheck, Tag
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
import styles from "../companies/page.module.css"; // Reuse companies styles

const AVAILABLE_PERMISSIONS = [
  "CREATE_ROLE", "READ_ROLE", "UPDATE_ROLE", "DELETE_ROLE",
  "CREATE_DOCUMENT", "READ_DOCUMENT", "UPDATE_DOCUMENT", "DELETE_DOCUMENT",
  "CREATE_CATEGORY", "READ_CATEGORY", "UPDATE_CATEGORY", "DELETE_CATEGORY",
  "CREATE_USER", "READ_USER", "UPDATE_USER", "DELETE_USER",
  "TEST_NOTIFICATION",
  "CREATE_FOLDER", "READ_FOLDER", "UPDATE_FOLDER", "DELETE_FOLDER",
  
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
      setCategories(categoriesRes.data);
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
    console.log("Toggling category:", catId);
    setFormState(prev => {
      const cats = prev.restrictedCategories.includes(catId)
        ? prev.restrictedCategories.filter(c => c !== catId)
        : [...prev.restrictedCategories, catId];
      console.log("New restricted categories:", cats);
      return { ...prev, restrictedCategories: cats };
    });
  };

  const filtered = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

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
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingId(null);
            setFormState(EMPTY_FORM);
            setShowForm(true);
          }}
          id="create-role-btn"
        >
          <Plus size={16} />
          New Role
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className={styles.createCard} style={{ maxWidth: '800px' }}>
          <div className={styles.createCardHeader}>
            <Shield size={18} className={styles.createIcon} />
            <span className={styles.createTitle}>{editingId ? "Edit Role" : "New Role"}</span>
          </div>
          <div className={styles.createFields} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <FileText size={13} /> Role Name <span className={styles.required}>*</span>
              </label>
              <input
                id="role-name"
                type="text"
                className="form-input"
                placeholder="E.g. HR Manager"
                value={formState.name}
                onChange={(e) => setFormState((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <ShieldCheck size={13} /> Permissions
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginTop: '10px' }}>
                {AVAILABLE_PERMISSIONS.map(perm => (
                  <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={formState.permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                    />
                    {perm.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <Tag size={13} /> Restrict Access to Specific Categories (Optional)
              </label>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                If left empty, users with this role will have access to all categories (subject to global permissions).
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {categories.map(cat => (
                  <label key={cat.id} htmlFor={`cat-${cat.id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', padding: '6px 12px', background: 'var(--color-bg-secondary)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                    <input
                      id={`cat-${cat.id}`}
                      type="checkbox"
                      checked={formState.restrictedCategories.includes(cat.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleCategory(cat.id);
                      }}
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.createActions}>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !formState.name.trim()}
              id="confirm-save-role-btn"
            >
              {saving ? <span className="spinner" /> : <Check size={16} />}
              Save Role
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setShowForm(false); setFormState(EMPTY_FORM); setEditingId(null); }}
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            id="roles-search"
            type="text"
            className={`form-input ${styles.searchInput}`}
            placeholder="Search roles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className={styles.countBadge}>
          {filtered.length} {filtered.length === 1 ? "role" : "roles"}
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Role Name</th>
              <th>Type</th>
              <th>Permissions</th>
              <th>Category Restrictions</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  <span className="spinner" /> Loading roles…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  {search
                    ? "No roles match your search"
                    : "No roles yet."}
                </td>
              </tr>
            ) : (
              filtered.map((role, i) => (
                <tr key={role.id} className={styles.tableRow}>
                  <td className={styles.indexCell}>{i + 1}</td>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.companyIcon}>
                        <Shield size={14} />
                      </span>
                      <span className={styles.companyName}>{role.name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', padding: '2px 8px', background: role.isDefault ? '#FFB80022' : '#ffffff22', color: role.isDefault ? '#FFB800' : '#fff', borderRadius: '4px' }}>
                      {role.isDefault ? "System Default" : "Custom"}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: '#aaa' }}>
                    {role.permissions?.length || 0} granted
                  </td>
                  <td style={{ fontSize: '13px', color: '#aaa' }}>
                    {role.restrictedCategories && role.restrictedCategories.length > 0 
                      ? `${role.restrictedCategories.length} categories` 
                      : "None (All Access)"}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => startEdit(role)}
                        title="Edit role"
                        disabled={role.isDefault} // Optional: prevent editing defaults
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.actionDanger}`}
                        onClick={() => openDelete(role)}
                        title="Delete role"
                        disabled={role.isDefault} // Optional: prevent deleting defaults
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
