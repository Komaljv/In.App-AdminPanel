"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Pencil, Trash2, Building2, X, Check,
  ChevronLeft, ChevronRight, FileText, Hash,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  type Company,
} from "@/lib/api";
import ConfirmDialog from "@/components/confirm-dialog/ConfirmDialog";
import styles from "./page.module.css";

interface CompanyForm {
  name: string;
  fiscalCode: string;
}

const EMPTY_FORM: CompanyForm = { name: "", fiscalCode: "" };

export default function CompaniesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

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
    if (!createForm.name.trim() || !user?.token) return;
    setCreating(true);
    const res = await createCompany(
      { name: createForm.name.trim(), fiscalCode: createForm.fiscalCode.trim() || undefined },
      user.token
    );
    setCreating(false);
    if (res.success && res.data) {
      await fetchCompanies();
      setCreateForm(EMPTY_FORM);
      setShowCreateForm(false);
      showToast("Company created", "success");
    } else {
      showToast(res.error || "Failed to create company", "error");
    }
  };

  const startEdit = (company: Company) => {
    setEditingId(company.id);
    setEditForm({ name: company.name, fiscalCode: company.fiscalCode ?? "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.name.trim() || !user?.token) return;
    setSaving(true);
    const res = await updateCompany(
      id,
      { name: editForm.name.trim(), fiscalCode: editForm.fiscalCode.trim() || undefined },
      user.token
    );
    setSaving(false);
    if (res.success) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, name: editForm.name.trim(), fiscalCode: editForm.fiscalCode.trim() || undefined }
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

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Companies</h1>
          <p className={styles.subtitle}>
            Manage organizations and their fiscal information
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
          id="create-company-btn"
        >
          <Plus size={16} />
          New Company
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className={styles.createCard}>
          <div className={styles.createCardHeader}>
            <Building2 size={18} className={styles.createIcon} />
            <span className={styles.createTitle}>New Company</span>
          </div>
          <div className={styles.createFields}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <FileText size={13} /> Company Name <span className={styles.required}>*</span>
              </label>
              <input
                id="new-company-name"
                type="text"
                className="form-input"
                placeholder="Acme Corporation"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <Hash size={13} /> Fiscal Code <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="new-company-fiscal"
                type="text"
                className="form-input"
                placeholder="e.g. IT12345678901"
                value={createForm.fiscalCode}
                onChange={(e) => setCreateForm((f) => ({ ...f, fiscalCode: e.target.value }))}
              />
            </div>
          </div>
          <div className={styles.createActions}>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={creating || !createForm.name.trim()}
              id="confirm-create-company-btn"
            >
              {creating ? <span className="spinner" /> : <Check size={16} />}
              Create Company
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setShowCreateForm(false); setCreateForm(EMPTY_FORM); }}
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
            id="companies-search"
            type="text"
            className={`form-input ${styles.searchInput}`}
            placeholder="Search by name or fiscal code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className={styles.countBadge}>
          {total} {total === 1 ? "company" : "companies"}
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Company Name</th>
              <th>Fiscal Code</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  <span className="spinner" /> Loading companies…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  {search
                    ? "No companies match your search"
                    : "No companies yet. Create one above."}
                </td>
              </tr>
            ) : (
              filtered.map((company, i) => (
                <tr key={company.id} className={styles.tableRow}>
                  <td className={styles.indexCell}>
                    {(page - 1) * LIMIT + i + 1}
                  </td>
                  <td>
                    {editingId === company.id ? (
                      <input
                        id={`edit-company-name-${company.id}`}
                        type="text"
                        className="form-input"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate(company.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                      />
                    ) : (
                      <div className={styles.nameCell}>
                        <span className={styles.companyIcon}>
                          <Building2 size={14} />
                        </span>
                        <span className={styles.companyName}>{company.name}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    {editingId === company.id ? (
                      <input
                        id={`edit-company-fiscal-${company.id}`}
                        type="text"
                        className="form-input"
                        value={editForm.fiscalCode}
                        placeholder="Fiscal code (optional)"
                        onChange={(e) => setEditForm((f) => ({ ...f, fiscalCode: e.target.value }))}
                      />
                    ) : (
                      <span className={styles.fiscalCode}>
                        {company.fiscalCode || <span className={styles.na}>—</span>}
                      </span>
                    )}
                  </td>
                  <td className={styles.dateCell}>
                    {company.createdAt
                      ? new Date(company.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    {editingId === company.id ? (
                      <div className={styles.actions}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: "6px 14px", fontSize: 13 }}
                          onClick={() => handleUpdate(company.id)}
                          disabled={saving}
                          id={`save-company-${company.id}`}
                        >
                          {saving ? <span className="spinner" /> : <Check size={14} />}
                          Save
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "6px 10px" }}
                          onClick={cancelEdit}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className={styles.actions}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => startEdit(company)}
                          title="Edit company"
                          id={`edit-company-btn-${company.id}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.actionDanger}`}
                          onClick={() => openDelete(company)}
                          title="Delete company"
                          id={`delete-company-btn-${company.id}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className="btn btn-ghost"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            id="companies-prev-page"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-ghost"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            id="companies-next-page"
          >
            Next
            <ChevronRight size={16} />
          </button>
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
