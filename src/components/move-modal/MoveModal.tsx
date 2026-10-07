import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getCategories,
  getFoldersByCategory,
  updateFolder,
  updateDocument,
  type Category,
} from "@/lib/api";
import type { Folder } from "@/app/dashboard/folders/page";

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  itemType: "folder" | "document";
  currentCategoryId?: string;
  currentFolderId?: string;
  onSuccess: () => void;
}

export default function MoveModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  itemType,
  currentCategoryId,
  currentFolderId,
  onSuccess,
}: MoveModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("root");
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user?.token) {
      setLoading(true);
      setSelectedCategoryId(currentCategoryId || "");
      setSelectedFolderId(currentFolderId || "root");
      
      getCategories(user.token).then((res) => {
        if (res.success && res.data) {
          setCategories(Array.isArray(res.data) ? res.data : []);
        }
        setLoading(false);
      });
    }
  }, [isOpen, user?.token, currentCategoryId, currentFolderId]);

  useEffect(() => {
    if (itemType === "document" && selectedCategoryId && user?.token) {
      getFoldersByCategory(selectedCategoryId, user.token).then((res) => {
        if (res.success && res.data) {
          setFolders(Array.isArray(res.data) ? res.data : []);
        } else {
          setFolders([]);
        }
      });
    } else {
      setFolders([]);
    }
  }, [selectedCategoryId, itemType, user?.token]);

  const handleSave = async () => {
    if (!user?.token || !selectedCategoryId) return;
    setSaving(true);

    try {
      let res;
      if (itemType === "folder") {
        res = await updateFolder(itemId, { categoryId: selectedCategoryId }, user.token);
      } else {
        res = await updateDocument(
          itemId,
          {
            categoryId: selectedCategoryId,
            folderId: selectedFolderId === "root" ? null : selectedFolderId,
          },
          user.token
        );
      }

      if (res?.success) {
        showToast(`${itemType === "folder" ? "Folder" : "Document"} moved successfully`, "success");
        onSuccess();
        onClose();
      } else {
        showToast(res?.error || "Failed to move item", "error");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          background: "var(--color-bg)",
          borderRadius: "var(--radius-lg)",
          width: "90%",
          maxWidth: "400px",
          boxShadow: "var(--shadow-xl)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)" }}>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-semibold)", color: "var(--text-primary)" }}>
            Move {itemType === "folder" ? "Folder" : "Document"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {/* Body */}
        <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
            Move <strong>{itemName}</strong> to a new location.
          </p>

          {loading ? (
            <div style={{ textAlign: "center", padding: "var(--space-4)" }}>Loading categories...</div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <label style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)" }}>Category</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSelectedFolderId("root");
                  }}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--text-sm)",
                    background: "var(--color-bg)",
                    outline: "none",
                    width: "100%",
                  }}
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {itemType === "document" && selectedCategoryId && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <label style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)" }}>Folder</label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--text-sm)",
                      background: "var(--color-bg)",
                      outline: "none",
                      width: "100%",
                    }}
                  >
                    <option value="root">— Category Root —</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={<Check size={16} />}
            onClick={handleSave}
            disabled={saving || !selectedCategoryId}
            loading={saving}
          >
            Move
          </Button>
        </div>
      </div>
    </div>
  );
}
