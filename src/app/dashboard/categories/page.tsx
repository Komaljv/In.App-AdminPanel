"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, Pencil, Trash2, Tag, X, Check, Share2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  getRoles,
  updateRole,
} from "@/lib/api";
import ConfirmDialog from "@/components/confirm-dialog/ConfirmDialog";
import ShareModal from "../documents/ShareModal";
import styles from "./page.module.css";

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Badge } from "@/components/ui/Badge/Badge";
import { Table, type Column } from "@/components/ui/Table/Table";
import { Card, CardHeader, CardBody } from "@/components/ui/Card/Card";

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

  // Share Modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareItemId, setShareItemId] = useState("");
  const [shareItemName, setShareItemName] = useState("");

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
    
    if (res.success && res.data) {
      const newCategory = res.data;
      
      // Update all roles that have restricted categories to include this new one
      try {
        const rolesRes = await getRoles(user.token);
        if (rolesRes.success && rolesRes.data) {
          const updatePromises = rolesRes.data.map(role => {
            const currentRestricted = role.restrictedCategories?.map((c: any) => c.id || c) || [];
            if (currentRestricted.length > 0) {
              return updateRole(
                role.id,
                { restrictedCategories: [...currentRestricted, newCategory.id] },
                user.token!
              );
            }
            return Promise.resolve();
          });
          await Promise.all(updatePromises);
        }
      } catch (err) {
        console.error("Failed to update roles with new category", err);
      }

      setCategories((prev) => [...prev, newCategory]);
      setNewName("");
      setShowCreateForm(false);
      showToast("Category created", "success");
    } else {
      showToast(res.error || "Failed to create category", "error");
    }
    setCreating(false);
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
    const res = await updateCategory(id,  { name: editName.trim() }, user.token);
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

  const toggleVisibility = async (cat: Category) => {
    if (!user?.token) return;
    const newStatus = cat.isVisible === false ? true : false;
    const res = await updateCategory(cat.id, { name: cat.name, isVisible: newStatus }, user.token);
    if (res.success) {
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isVisible: newStatus } : c))
      );
      showToast(`Category is now ${newStatus ? 'visible' : 'hidden'}`, "success");
    } else {
      showToast(res.error || "Failed to update visibility", "error");
    }
  };

  const openDelete = (cat: Category) => {
    setDeletingId(cat.id);
    setDeletingName(cat.name);
    setConfirmOpen(true);
  };

  const openShare = (cat: Category) => {
    setShareItemId(cat.id);
    setShareItemName(cat.name);
    setShareModalOpen(true);
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

  const columns = useMemo<Column<Category>[]>(() => [
    {
      key: "index",
      header: "#",
      width: "50px",
      render: (_, i) => <span style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
    },
    {
      key: "name",
      header: "Name",
      render: (cat) => editingId === cat.id ? (
        <Input
          id={`edit-category-${cat.id}`}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUpdate(cat.id);
            if (e.key === "Escape") cancelEdit();
          }}
          autoFocus
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={14} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{cat.name}</span>
        </div>
      )
    },
    {
      key: "creator",
      header: "Created By",
      render: (cat) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {cat.creator ? cat.creator.name || cat.creator.email : "—"}
        </span>
      )
    },
    {
      key: "createdAt",
      header: "Created",
      render: (cat) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : "—"}
        </span>
      )
    },
    {
      key: "visibility",
      header: "Visibility",
      render: (cat) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className={styles.switch}>
            <input 
              type="checkbox" 
              checked={cat.isVisible !== false} 
              onChange={() => toggleVisibility(cat)} 
            />
            <span className={styles.slider}></span>
          </label>
          <span style={{ fontSize: 'var(--text-sm)', color: cat.isVisible !== false ? 'var(--color-success)' : 'var(--text-muted)', fontWeight: 500 }}>
            {cat.isVisible !== false ? "Visible" : "Hidden"}
          </span>
        </div>
      )
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (cat) => editingId === cat.id ? (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button size="sm" variant="primary" onClick={() => handleUpdate(cat.id)} disabled={saving} loading={saving}>
            <Check size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelEdit}>
            <X size={14} />
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button size="sm" variant="ghost" onClick={() => openShare(cat)} title="Share">
            <Share2 size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => startEdit(cat)} title="Edit">
            <Pencil size={14} />
          </Button>
          <Button size="sm" variant="ghost" className="text-danger" onClick={() => openDelete(cat)} title="Delete">
            <Trash2 size={14} color="var(--color-danger-text)" />
          </Button>
        </div>
      )
    }
  ], [editingId, editName, saving]);

  return (
    <div className={styles.page} style={{ padding: 'var(--space-8) 36px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 className="text-page-title text-text-primary">Categories</h1>
          <p className="text-text-secondary text-sm" style={{ marginTop: 'var(--space-1)' }}>
            Manage document categories for your organization
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={() => setShowCreateForm(true)}
          id="create-category-btn"
        >
          New Category
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="mb-6" style={{ marginBottom: 'var(--space-6)', maxWidth: '600px' }}>
          <CardHeader
            title="New Category"
            action={
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateForm(false); setNewName(""); }}>
                <X size={16} />
              </Button>
            }
          />
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="form-group">
                <Input
                  id="new-category-input"
                  type="text"
                  placeholder="Category name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                  leftIcon={<Tag size={16} />}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                loading={creating}
                leftIcon={<Check size={16} />}
                id="confirm-create-category-btn"
              >
                Create
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowCreateForm(false); setNewName(""); }}
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
            id="categories-search"
            type="text"
            leftIcon={<Search size={15} />}
            placeholder="Search categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="neutral">
          {filtered.length} {filtered.length === 1 ? "category" : "categories"}
        </Badge>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage={search ? "No categories match your search" : "No categories yet. Create one above."}
      />

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

      {shareModalOpen && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          itemId={shareItemId}
          itemName={shareItemName}
          itemType="category"
        />
      )}
    </div>
  );
}
