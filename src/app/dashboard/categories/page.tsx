"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, Tag, X, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
} from "@/lib/api";
import ConfirmDialog from "@/components/confirm-dialog/ConfirmDialog";
import styles from "./page.module.css";

export default function CategoriesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create state
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");

  const fetchCategories = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    const res = await getCategories(user.token);
    setLoading(false);
    if (res.success && res.data) {
      setCategories(Array.isArray(res.data) ? res.data : []);
    } else {
      showToast(res.error || "Failed to load categories", "error");
    }
  }, [user?.token, showToast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreate = async () => {
    if (!newName.trim() || !user?.token) return;
    setCreating(true);
    const res = await createCategory(newName.trim(), user.token);
    setCreating(false);
    if (res.success && res.data) {
      setCategories((prev) => [...prev, res.data!]);
      setNewName("");
      setShowCreateForm(false);
      showToast("Category created", "success");
    } else {
      showToast(res.error || "Failed to create category", "error");
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || !user?.token) return;
    setSaving(true);
    const res = await updateCategory(id, editName.trim(), user.token);
    setSaving(false);
    if (res.success) {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: editName.trim() } : c))
      );
      cancelEdit();
      showToast("Category updated", "success");
    } else {
      showToast(res.error || "Failed to update category", "error");
    }
  };

  const openDelete = (cat: Category) => {
    setDeletingId(cat.id);
    setDeletingName(cat.name);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId || !user?.token) return;
    const res = await deleteCategory(deletingId, user.token);
    setConfirmOpen(false);
    if (res.success) {
      setCategories((prev) => prev.filter((c) => c.id !== deletingId));
      showToast("Category deleted", "success");
    } else {
      showToast(res.error || "Failed to delete category", "error");
    }
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Categories</h1>
          <p className={styles.subtitle}>
            Manage document categories for your organization
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
          id="create-category-btn"
        >
          <Plus size={16} />
          New Category
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className={styles.createCard}>
          <Tag size={18} className={styles.createIcon} />
          <input
            id="new-category-input"
            type="text"
            className="form-input"
            placeholder="Category name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            id="confirm-create-category-btn"
          >
            {creating ? <span className="spinner" /> : <Check size={16} />}
            Create
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { setShowCreateForm(false); setNewName(""); }}
          >
            <X size={16} />
            Cancel
          </button>
        </div>
      )}

      {/* Search */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            id="categories-search"
            type="text"
            className={`form-input ${styles.searchInput}`}
            placeholder="Search categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className={styles.countBadge}>
          {filtered.length} {filtered.length === 1 ? "category" : "categories"}
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Created By</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>
                  <span className="spinner" /> Loading categories…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>
                  {search ? "No categories match your search" : "No categories yet. Create one above."}
                </td>
              </tr>
            ) : (
              filtered.map((cat, i) => (
                <tr key={cat.id} className={styles.tableRow}>
                  <td className={styles.indexCell}>{i + 1}</td>
                  <td>
                    {editingId === cat.id ? (
                      <div className={styles.inlineEdit}>
                        <input
                          id={`edit-category-${cat.id}`}
                          type="text"
                          className="form-input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(cat.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: "6px 14px", fontSize: 13 }}
                          onClick={() => handleUpdate(cat.id)}
                          disabled={saving}
                        >
                          {saving ? <span className="spinner" /> : <Check size={14} />}
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "6px 10px", fontSize: 13 }}
                          onClick={cancelEdit}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className={styles.nameCell}>
                        <span className={styles.categoryIcon}>
                          <Tag size={14} />
                        </span>
                        <span className={styles.categoryName}>{cat.name}</span>
                      </div>
                    )}
                  </td>
                  <td className={styles.creatorCell} style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                    {cat.creator ? cat.creator.name || cat.creator.email : "—"}
                  </td>
                  <td className={styles.dateCell}>
                    {cat.createdAt
                      ? new Date(cat.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    {editingId !== cat.id && (
                      <div className={styles.actions}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => startEdit(cat)}
                          title="Edit"
                          id={`edit-btn-${cat.id}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.actionDanger}`}
                          onClick={() => openDelete(cat)}
                          title="Delete"
                          id={`delete-btn-${cat.id}`}
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

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Category"
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
