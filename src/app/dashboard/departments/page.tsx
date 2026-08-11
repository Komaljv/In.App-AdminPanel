"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, X, Check,
  FileText, Briefcase, Edit2, Trash2
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type Department,
} from "@/lib/api";
import ConfirmDialog from "@/components/confirm-dialog/ConfirmDialog";
import styles from "../companies/page.module.css"; // Reuse companies styles

interface DepartmentForm {
  name: string;
}

const EMPTY_FORM: DepartmentForm = { name: "" };

export default function DepartmentsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<DepartmentForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const fetchDepartments = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    const res = await getDepartments(user.token);
    setLoading(false);
    if (res.success && res.data) {
      setDepartments(res.data);
    } else {
      showToast(res.error || "Failed to load departments", "error");
    }
  }, [user?.token, showToast]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleCreate = async () => {
    if (!createForm.name.trim() || !user?.token) return;
    setCreating(true);
    let res;
    if (editingId) {
      res = await updateDepartment(editingId, createForm.name.trim(), user.token);
    } else {
      res = await createDepartment(createForm.name.trim(), user.token);
    }
    setCreating(false);
    if (res.success && res.data) {
      await fetchDepartments();
      setCreateForm(EMPTY_FORM);
      setShowCreateForm(false);
      setEditingId(null);
      showToast(editingId ? "Department updated" : "Department created", "success");
    } else {
      showToast(res.error || (editingId ? "Failed to update" : "Failed to create"), "error");
    }
  };

  const startEdit = (dept: Department) => {
    setEditingId(dept.id);
    setCreateForm({ name: dept.name });
    setShowCreateForm(true);
  };

  const handleDelete = (id: string, name: string) => {
    const token = user?.token;
    if (!token) return;

    openConfirm(
      {
        title: "Delete Department",
        message: `Permanently delete "${name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
        icon: "delete",
      },
      async () => {
        setDeletingId(id);
        const res = await deleteDepartment(id, token);
        setDeletingId(null);
        
        if (res.success) {
          await fetchDepartments();
          showToast("Department deleted", "success");
        } else {
          showToast(res.error || "Failed to delete department", "error");
        }
      }
    );
  };

  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Departments</h1>
          <p className={styles.subtitle}>
            Manage organizational departments
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setShowCreateForm(true); setEditingId(null); setCreateForm(EMPTY_FORM); }}
          id="create-department-btn"
        >
          <Plus size={16} />
          New Department
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className={styles.createCard}>
          <div className={styles.createCardHeader}>
            <Briefcase size={18} className={styles.createIcon} />
            <span className={styles.createTitle}>{editingId ? "Edit Department" : "New Department"}</span>
          </div>
          <div className={styles.createFields}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <FileText size={13} /> Department Name <span className={styles.required}>*</span>
              </label>
              <input
                id="new-department-name"
                type="text"
                className="form-input"
                placeholder="E.g. Human Resources"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
          </div>
          <div className={styles.createActions}>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={creating || !createForm.name.trim()}
              id="confirm-create-department-btn"
            >
              {creating ? <span className="spinner" /> : <Check size={16} />}
              {editingId ? "Save Changes" : "Create Department"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setShowCreateForm(false); setCreateForm(EMPTY_FORM); setEditingId(null); }}
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
            id="departments-search"
            type="text"
            className={`form-input ${styles.searchInput}`}
            placeholder="Search departments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className={styles.countBadge}>
          {filtered.length} {filtered.length === 1 ? "department" : "departments"}
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Department Name</th>
              <th>Created At</th>
              <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>
                  <span className="spinner" /> Loading departments…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>
                  {search
                    ? "No departments match your search"
                    : "No departments yet. Create one above."}
                </td>
              </tr>
            ) : (
              filtered.map((dept, i) => (
                <tr key={dept.id} className={styles.tableRow}>
                  <td className={styles.indexCell}>{i + 1}</td>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.companyIcon}>
                        <Briefcase size={14} />
                      </span>
                      <span className={styles.companyName}>{dept.name}</span>
                    </div>
                  </td>
                  <td className={styles.dateCell}>
                    {dept.createdAt
                      ? new Date(dept.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className={styles.actionsCell} style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        title="Edit Department"
                        onClick={() => startEdit(dept)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        title="Delete Department"
                        onClick={() => handleDelete(dept.id, dept.name)}
                        disabled={deletingId === dept.id}
                      >
                        {deletingId === dept.id ? <span className="spinner" /> : <Trash2 size={14} />}
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
