"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { Plus, Search, Pencil, Trash2, Folder as FolderIcon, X, Check, Share2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
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
import ShareModal from "../documents/ShareModal";
import MoveModal from "@/components/move-modal/MoveModal";
import styles from "./page.module.css";

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Badge } from "@/components/ui/Badge/Badge";
import { Table, type Column } from "@/components/ui/Table/Table";
import { Card, CardHeader, CardBody } from "@/components/ui/Card/Card";

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

function FoldersPageContent() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const searchParams = useSearchParams();
  const initialCategoryId = searchParams.get("categoryId");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId || "");

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

  // Share Modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareItemId, setShareItemId] = useState("");
  const [shareItemName, setShareItemName] = useState("");

  // Move Modal
  const [moveTarget, setMoveTarget] = useState<{ id: string; name: string; categoryId: string } | null>(null);

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
    const res = await updateFolder(id, { name: editName.trim() }, user.token);
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

  const openShare = (folder: Folder) => {
    setShareItemId(folder.id);
    setShareItemName(folder.name);
    setShareModalOpen(true);
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

  const columns = useMemo<Column<Folder>[]>(() => [
    {
      key: "index",
      header: "#",
      width: "50px",
      render: (_, i) => <span style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
    },
    {
      key: "name",
      header: "Name",
      render: (folder) => editingId === folder.id ? (
        <Input
          id={`edit-folder-${folder.id}`}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleUpdate(folder.id);
            if (e.key === "Escape") cancelEdit();
          }}
          autoFocus
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderIcon size={14} style={{ color: 'var(--color-primary)' }} />
          <a 
            href={`/dashboard/documents?categoryId=${folder.categoryId}&folderId=${folder.id}`} 
            style={{ fontWeight: 'var(--font-weight-semibold)', color: 'inherit', textDecoration: 'none' }}
            className="hover-underline"
          >
            {folder.name}
          </a>
        </div>
      )
    },
    {
      key: "creator",
      header: "Created By",
      render: (folder) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {folder.creator ? folder.creator.name || folder.creator.email : "—"}
        </span>
      )
    },
    {
      key: "createdAt",
      header: "Created",
      render: (folder) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {folder.createdAt ? new Date(folder.createdAt).toLocaleDateString() : "—"}
        </span>
      )
    },
    {
      key: "stats",
      header: "Contents",
      render: (folder: any) => {
        const docs = folder.documentCount ?? folder._count?.documents ?? folder.documents?.length;
        return (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {docs !== undefined ? (
              <Badge variant="primary">{docs} Docs</Badge>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>—</span>
            )}
          </div>
        );
      }
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (folder) => editingId === folder.id ? (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button size="sm" variant="primary" onClick={() => handleUpdate(folder.id)} disabled={saving} loading={saving}>
            <Check size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelEdit}>
            <X size={14} />
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button size="sm" variant="ghost" onClick={() => openShare(folder)} title="Share">
            <Share2 size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMoveTarget({ id: folder.id, name: folder.name, categoryId: folder.categoryId })} title="Move">
            <FolderIcon size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => startEdit(folder)} title="Edit">
            <Pencil size={14} />
          </Button>
          <Button size="sm" variant="ghost" className="text-danger" onClick={() => openDelete(folder)} title="Delete">
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
          <h1 className="text-page-title text-text-primary">Folders</h1>
          <p className="text-text-secondary text-sm" style={{ marginTop: 'var(--space-1)' }}>
            Manage document folders within categories
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={() => setShowCreateForm(true)}
          id="create-folder-btn"
          disabled={!selectedCategoryId}
        >
          New Folder
        </Button>
      </div>

      {/* Toolbar: Category Selector & Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-primary)',
            background: 'var(--color-bg)',
            outline: 'none',
            minWidth: '200px'
          }}
        >
          <option value="" disabled>Select a category</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '360px' }}>
          <Input
            id="folders-search"
            type="text"
            leftIcon={<Search size={15} />}
            placeholder="Search folders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="neutral">
          {filtered.length} {filtered.length === 1 ? "folder" : "folders"}
        </Badge>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="mb-6" style={{ marginBottom: 'var(--space-6)', maxWidth: '600px' }}>
          <CardHeader
            title="New Folder"
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
                  id="new-folder-input"
                  type="text"
                  placeholder="Folder name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                  leftIcon={<FolderIcon size={16} />}
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
                id="confirm-create-folder-btn"
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

      {/* Table */}
      {!selectedCategoryId ? (
        <Card padding="none">
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
            Select a category to view its folders.
          </div>
        </Card>
      ) : (
        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage={search ? "No folders match your search" : "No folders yet. Create one above."}
        />
      )}

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

      {shareModalOpen && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          itemId={shareItemId}
          itemName={shareItemName}
          itemType="folder"
        />
      )}

      {moveTarget && (
        <MoveModal
          isOpen={!!moveTarget}
          onClose={() => setMoveTarget(null)}
          itemId={moveTarget.id}
          itemName={moveTarget.name}
          itemType="folder"
          currentCategoryId={moveTarget.categoryId}
          onSuccess={fetchFolders}
        />
      )}
    </div>
  );
}

export default function FoldersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading folders...</div>}>
      <FoldersPageContent />
    </Suspense>
  );
}
