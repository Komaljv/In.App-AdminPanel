"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, X, Check,
   Briefcase, Edit2, Trash2
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

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Badge } from "@/components/ui/Badge/Badge";
import { Table, type Column } from "@/components/ui/Table/Table";
import { Card, CardHeader, CardBody } from "@/components/ui/Card/Card";

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

  const columns = useMemo<Column<Department>[]>(() => [
    {
      key: "index",
      header: "#",
      width: "50px",
      render: (_, i) => <span style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
    },
    {
      key: "name",
      header: "Department Name",
      render: (dept) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={14} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{dept.name}</span>
        </div>
      )
    },
    {
      key: "createdAt",
      header: "Created At",
      render: (dept) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {dept.createdAt ? new Date(dept.createdAt).toLocaleDateString() : "—"}
        </span>
      )
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (dept) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button 
            variant="ghost" 
            size="sm" 
            title="Edit Department"
            onClick={() => startEdit(dept)}
          >
            <Edit2 size={14} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-danger"
            title="Delete Department"
            onClick={() => handleDelete(dept.id, dept.name)}
            disabled={deletingId === dept.id}
          >
            {deletingId === dept.id ? <span className="spinner" /> : <Trash2 size={14} color="var(--color-danger-text)" />}
          </Button>
        </div>
      )
    }
  ], [deletingId]);

  return (
    <div className={styles.page} style={{ padding: 'var(--space-8) 36px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 className="text-page-title text-text-primary">Departments</h1>
          <p className="text-text-secondary text-sm" style={{ marginTop: 'var(--space-1)' }}>
            Manage organizational departments
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={() => { setShowCreateForm(true); setEditingId(null); setCreateForm(EMPTY_FORM); }}
          id="create-department-btn"
        >
          New Department
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="mb-6" style={{ marginBottom: 'var(--space-6)', maxWidth: '600px' }}>
          <CardHeader
            title={editingId ? "Edit Department" : "New Department"}
            action={
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateForm(false); setCreateForm(EMPTY_FORM); setEditingId(null); }}>
                <X size={16} />
              </Button>
            }
          />
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-department-name">
                  Department Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <Input
                  id="new-department-name"
                  type="text"
                  placeholder="E.g. Human Resources"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={creating || !createForm.name.trim()}
                loading={creating}
                leftIcon={<Check size={16} />}
                id="confirm-create-department-btn"
              >
                {editingId ? "Save Changes" : "Create Department"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowCreateForm(false); setCreateForm(EMPTY_FORM); setEditingId(null); }}
              >
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '360px' }}>
          <Input
            id="departments-search"
            type="text"
            leftIcon={<Search size={15} />}
            placeholder="Search departments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="neutral">
          {filtered.length} {filtered.length === 1 ? "department" : "departments"}
        </Badge>
      </div>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage={search ? "No departments match your search" : "No departments yet. Create one above."}
        />
      </Card>

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
