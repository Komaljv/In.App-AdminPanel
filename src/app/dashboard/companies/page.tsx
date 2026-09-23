"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Search, Pencil, Trash2, Building2, X, Check,
  ChevronLeft, ChevronRight, FileText, Hash, Mail
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  createCustomPlan,
  type Company,
} from "@/lib/api";
import ConfirmDialog from "@/components/confirm-dialog/ConfirmDialog";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { isSystemAdmin } from "@/lib/role-utils";

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Badge } from "@/components/ui/Badge/Badge";
import { Table, type Column } from "@/components/ui/Table/Table";
import { Card, CardHeader, CardBody } from "@/components/ui/Card/Card";

interface CompanyForm {
  companyName: string;
  email: string;
  fiscalCode: string;
}

const EMPTY_FORM: CompanyForm = { companyName: "", email: "", fiscalCode: "" };

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function UsageCell({ usage }: { usage: Company['usage'] }) {
  if (!usage) return <span style={{ color: 'var(--text-muted)' }}>—</span>;

  const usersUsed = usage.users?.used ?? 0;
  const usersMax = usage.users?.max ?? 0;
  const usersPercentage = usage.users?.percentage ?? 0;

  const storageUsed = usage.storage?.usedStorageBytes ?? 0;
  const storageMax = usage.storage?.maxBytes ?? 0;
  const storagePercentage = usage.storage?.percentage ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
      {/* Users Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Users</span>
          <span>{usersUsed} / {usersMax === 0 ? '∞' : usersMax}</span>
        </div>
        <div style={{ height: '6px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            backgroundColor: usersPercentage > 90 ? 'var(--color-danger)' : usersPercentage > 75 ? 'var(--color-warning)' : 'var(--color-primary)', 
            width: `${Math.min(usersPercentage, 100)}%` 
          }} />
        </div>
      </div>

      {/* Storage Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Storage</span>
          <span>{formatBytes(storageUsed)} / {storageMax === 0 ? '∞' : formatBytes(storageMax)}</span>
        </div>
        <div style={{ height: '6px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            backgroundColor: storagePercentage > 90 ? 'var(--color-danger)' : storagePercentage > 75 ? 'var(--color-warning)' : 'var(--color-success)', 
            width: `${Math.min(storagePercentage, 100)}%` 
          }} />
        </div>
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Redirect non-admins
  useEffect(() => {
    if (user) {
      if (!isSystemAdmin(user)) {
        router.replace("/dashboard");
        showToast("Unauthorized access", "error");
      }
    }
  }, [user, router, showToast]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  // Create state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CompanyForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CompanyForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");



  const fetchCompanies = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    const res = await getCompanies(user.token, page, LIMIT);
    setLoading(false);
    if (res.success && res.data) {
      // Handle both paginated and plain array responses
      if (Array.isArray(res.data)) {
        setCompanies(res.data);
        setTotalPages(1);
        setTotal(res.data.length);
      } else {
        const paged = res.data as { items?: Company[]; data?: Company[]; total?: number; totalPages?: number };
        const items = paged.items ?? paged.data ?? [];
        setCompanies(items);
        setTotal(paged.total ?? items.length);
        setTotalPages(paged.totalPages ?? 1);
      }
    } else {
      showToast(res.error || "Failed to load companies", "error");
    }
  }, [user?.token, page, showToast]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleCreate = async () => {
    if (!createForm.companyName.trim() || !createForm.email.trim() || !user?.token) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createForm.email.trim())) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

    if (createForm.fiscalCode.trim()) {
      const vatClean = createForm.fiscalCode.trim().replace(/[\s\-]/g, "");
      if (!/^[a-zA-Z0-9]{5,20}$/.test(vatClean)) {
        showToast("Please enter a valid VAT number (5-20 alphanumeric characters).", "error");
        return;
      }
    }

    setCreating(true);
    const res = await createCompany(
      { name: createForm.companyName.trim(), email: createForm.email.trim(), fiscalCode: createForm.fiscalCode.trim() || undefined },
      user.token
    );
    setCreating(false);
    if (res.success && res.data) {
      await fetchCompanies();
      setCreateForm(EMPTY_FORM);
      setShowCreateForm(false);
      showToast(res.message || "Company created", "success");
    } else {
      showToast(res.error || "Failed to create company", "error");
    }
  };

  const startEdit = (company: Company) => {
    setEditingId(company.id);
    setEditForm({ companyName: company.name, email: "", fiscalCode: company.fiscalCode ?? "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.companyName.trim() || !user?.token) return;

    if (editForm.fiscalCode.trim()) {
      const vatClean = editForm.fiscalCode.trim().replace(/[\s\-]/g, "");
      if (!/^[a-zA-Z0-9]{5,20}$/.test(vatClean)) {
        showToast("Please enter a valid VAT number (5-20 alphanumeric characters).", "error");
        return;
      }
    }

    setSaving(true);
    const res = await updateCompany(
      id,
      { name: editForm.companyName.trim(), fiscalCode: editForm.fiscalCode.trim() || undefined },
      user.token
    );
    setSaving(false);
    if (res.success) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, name: editForm.companyName.trim(), fiscalCode: editForm.fiscalCode.trim() || undefined }
            : c
        )
      );
      cancelEdit();
      showToast("Company updated", "success");
    } else {
      showToast(res.error || "Failed to update company", "error");
    }
  };

  const openDelete = (company: Company) => {
    setDeletingId(company.id);
    setDeletingName(company.name);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId || !user?.token) return;
    const res = await deleteCompany(deletingId, user.token);
    setConfirmOpen(false);
    if (res.success) {
      setCompanies((prev) => prev.filter((c) => c.id !== deletingId));
      setTotal((t) => t - 1);
      showToast("Company deleted", "success");
    } else {
      showToast(res.error || "Failed to delete company", "error");
    }
  };

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.fiscalCode ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const columns = useMemo<Column<Company>[]>(() => [
    {
      key: "index",
      header: "#",
      width: "50px",
      render: (_, i) => <span style={{ color: 'var(--text-muted)' }}>{(page - 1) * LIMIT + i + 1}</span>
    },
    {
      key: "name",
      header: "Company Name",
      render: (company) => editingId === company.id ? (
        <Input
          id={`edit-company-name-${company.id}`}
          type="text"
          value={editForm.companyName}
          onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUpdate(company.id);
            if (e.key === "Escape") cancelEdit();
          }}
          autoFocus
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={14} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{company.name}</span>
        </div>
      )
    },
    {
      key: "fiscalCode",
      header: "VAT N°",
      render: (company) => editingId === company.id ? (
        <Input
          id={`edit-company-fiscal-${company.id}`}
          type="text"
          value={editForm.fiscalCode}
          placeholder="VAT N° (optional)"
          onChange={(e) => setEditForm((f) => ({ ...f, fiscalCode: e.target.value }))}
        />
      ) : (
        <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.9em' }}>
          {company.fiscalCode || <span style={{ opacity: 0.5 }}>—</span>}
        </span>
      )
    },
    {
      key: "usage",
      header: "Usage",
      render: (company) => <UsageCell usage={company.usage} />
    },
    {
      key: "createdAt",
      header: "Created",
      render: (company) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : "—"}
        </span>
      )
    },
    
  ], [page, LIMIT, editingId, editForm]);

  return (
    <div className={styles.page} style={{ padding: 'var(--space-8) 36px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 className="text-page-title text-text-primary">Companies</h1>
          <p className="text-text-secondary text-sm" style={{ marginTop: 'var(--space-1)' }}>
            Manage organizations and their fiscal information
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={() => setShowCreateForm(true)}
          id="create-company-btn"
        >
          New Company
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="mb-6" style={{ marginBottom: 'var(--space-6)', maxWidth: '800px' }}>
          <CardHeader
            title="New Company"
            action={
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateForm(false); setCreateForm(EMPTY_FORM); }}>
                <X size={16} />
              </Button>
            }
          />
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-company-name">
                  Company Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <Input
                  id="new-company-name"
                  type="text"
                  placeholder="Acme Corporation"
                  value={createForm.companyName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, companyName: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-company-email">
                  Email Master <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <Input
                  id="new-company-email"
                  type="email"
                  placeholder="admin@acme.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-company-fiscal">
                  VAT N° <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <Input
                  id="new-company-fiscal"
                  type="text"
                  placeholder="e.g. IT12345678901"
                  value={createForm.fiscalCode}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fiscalCode: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={creating || !createForm.companyName || !createForm.email.trim()}
                loading={creating}
                leftIcon={<Check size={16} />}
                id="confirm-create-company-btn"
              >
                Create Company
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowCreateForm(false); setCreateForm(EMPTY_FORM); }}
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
            id="companies-search"
            type="text"
            leftIcon={<Search size={15} />}
            placeholder="Search by name or fiscal code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="neutral">
          {total} {total === 1 ? "company" : "companies"}
        </Badge>
      </div>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage={search ? "No companies match your search" : "No companies yet. Create one above."}
        />
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
          <Button
            variant="ghost"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            leftIcon={<ChevronLeft size={16} />}
            id="companies-prev-page"
          >
            Previous
          </Button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            rightIcon={<ChevronRight size={16} />}
            id="companies-next-page"
          >
            Next
          </Button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Company"
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
