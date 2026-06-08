"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, Folder as FolderIcon, X, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getCategories,
  getFoldersByCategory,
  createFolder,
  updateFolder,
  deleteFolder,
  type Category,
} from "@/lib/api";
import ConfirmDialog from "@/components/confirm-dialog/ConfirmDialog";
import styles from "./page.module.css";

export interface Folder {
  id: string;
  name: string;
  categoryId: string;
  createdAt: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function FoldersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const [folders, setFolders] = useState<Folder[]>([]);
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
    const res = await getCategories(user.token);
    if (res.success && res.data) {
      const fetchedCategories = Array.isArray(res.data) ? res.data : [];
      setCategories(fetchedCategories);
      if (fetchedCategories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(fetchedCategories[0].id);
      }
    } else {
      showToast(res.error || "Failed to load categories", "error");
    }
  }, [user?.token, showToast, selectedCategoryId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const fetchFolders = useCallback(async () => {
    if (!user?.token || !selectedCategoryId) {
      setFolders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await getFoldersByCategory(selectedCategoryId, user.token);
    setLoading(false);
    if (res.success && res.data) {
      setFolders(Array.isArray(res.data) ? res.data : []);
    } else {
      showToast(res.error || "Failed to load folders", "error");
    }
  }, [user?.token, selectedCategoryId, showToast]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleCreate = async () => {
    if (!newName.trim() || !user?.token || !selectedCategoryId) return;
    setCreating(true);
    const res = await createFolder(newName.trim(), selectedCategoryId, user.token);
    setCreating(false);
    if (res.success && res.data) {
      setFolders((prev) => [...prev, res.data as Folder]);
      setNewName("");
      setShowCreateForm(false);
      showToast("Folder created", "success");
    } else {
      showToast(res.error || "Failed to create folder", "error");
    }
  };

  const startEdit = (folder: Folder) => {
    setEditingId(folder.id);
    setEditName(folder.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || !user?.token) return;
    setSaving(true);
    const res = await updateFolder(id, editName.trim(), user.token);
    setSaving(false);
    if (res.success) {
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name: editName.trim() } : f))
      );
      cancelEdit();
      showToast("Folder updated", "success");
    } else {
      showToast(res.error || "Failed to update folder", "error");
    }
  };

  const openDelete = (folder: Folder) => {
    setDeletingId(folder.id);
    setDeletingName(folder.name);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId || !user?.token) return;
    const res = await deleteFolder(deletingId, user.token);
    setConfirmOpen(false);
    if (res.success) {
      setFolders((prev) => prev.filter((f) => f.id !== deletingId));
      showToast("Folder deleted", "success");
    } else {
      showToast(res.error || "Failed to delete folder", "error");
    }
  };

  const filtered = folders.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Folders</h1>
          <p className={styles.subtitle}>
            Manage document folders within categories
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
          id="create-folder-btn"
          disabled={!selectedCategoryId}
        >
          <Plus size={16} />
          New Folder
        </button>
      </div>

      {/* Toolbar: Category Selector & Search */}
      <div className={styles.toolbar}>
        <select
          className={styles.categorySelect}
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
        >
          <option value="" disabled>Select a category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            id="folders-search"
            type="text"
            className={`form-input ${styles.searchInput}`}
            placeholder="Search folders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className={styles.countBadge}>
          {filtered.length} {filtered.length === 1 ? "folder" : "folders"}
        </span>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className={styles.createCard}>
          <FolderIcon size={18} className={styles.createIcon} />
          <input
            id="new-folder-input"
            type="text"
            className="form-input"
            placeholder="Folder name…"
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
            id="confirm-create-folder-btn"
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
            {!selectedCategoryId ? (
               <tr>
               <td colSpan={4} className={styles.emptyRow}>
                 Select a category to view its folders.
               </td>
             </tr>
            ) : loading ? (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>
                  <span className="spinner" /> Loading folders…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>
                  {search ? "No folders match your search" : "No folders yet. Create one above."}
                </td>
              </tr>
            ) : (
              filtered.map((folder, i) => (
                <tr key={folder.id} className={styles.tableRow}>
                  <td className={styles.indexCell}>{i + 1}</td>
                  <td>
                    {editingId === folder.id ? (
                      <div className={styles.inlineEdit}>
                        <input
                          id={`edit-folder-${folder.id}`}
                          type="text"
                          className="form-input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(folder.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: "6px 14px", fontSize: 13 }}
                          onClick={() => handleUpdate(folder.id)}
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
                          <FolderIcon size={14} />
                        </span>
                        <span className={styles.categoryName}>{folder.name}</span>
                      </div>
                    )}
                  </td>
                  <td className={styles.creatorCell} style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
                    {folder.creator ? folder.creator.name || folder.creator.email : "—"}
                  </td>
                  <td className={styles.dateCell}>
                    {folder.createdAt
                      ? new Date(folder.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    {editingId !== folder.id && (
                      <div className={styles.actions}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => startEdit(folder)}
                          title="Edit"
                          id={`edit-btn-${folder.id}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.actionDanger}`}
                          onClick={() => openDelete(folder)}
                          title="Delete"
                          id={`delete-btn-${folder.id}`}
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
        title="Delete Folder"
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
