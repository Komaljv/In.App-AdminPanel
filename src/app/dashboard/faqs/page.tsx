"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  HelpCircle,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Tag,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  reorderFaqs,
  type Faq,
  type CreateFaqInput,
} from "@/lib/api";
import ConfirmDialog from "@/components/confirm-dialog/ConfirmDialog";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Badge } from "@/components/ui/Badge/Badge";
import styles from "./page.module.css";

const PRESET_CATEGORIES = ["General", "Documents", "Subscription", "Billing", "Account", "Security"];

const EMPTY_FORM: CreateFaqInput = {
  question: "",
  answer: "",
  category: "General",
  order: 1,
  isActive: true,
  isGlobal: true,
};

export default function FaqsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Create / Edit state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFaqInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Expand / collapse card state
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});


  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteQuestion, setDeleteQuestion] = useState("");

  const fetchFaqs = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    const res = await getFaqs(user.token, { includeInactive: true });
    setLoading(false);
    if (res.success && res.data) {
      setFaqs(Array.isArray(res.data) ? res.data : []);
    } else {
      showToast(res.error || "Failed to load FAQs", "error");
    }
  }, [user?.token, showToast]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      order: (faqs.length > 0 ? Math.max(...faqs.map((f) => f.order || 0)) : 0) + 1,
    });
    setShowForm(true);
  };

  // Open Edit Form
  const handleOpenEdit = (faq: Faq) => {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "General",
      order: faq.order,
      isActive: faq.isActive,
      isGlobal: faq.companyId === null,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  // Save (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;
    if (!form.question.trim() || !form.answer.trim()) {
      showToast("Question and Answer are required", "info");
      return;
    }

    setSaving(true);
    if (editingId) {
      const res = await updateFaq(editingId, form, user.token);
      setSaving(false);
      if (res.success && res.data) {
        showToast("FAQ updated successfully", "success");
        setFaqs((prev) => prev.map((f) => (f.id === editingId ? res.data! : f)));
        handleCloseForm();
      } else {
        showToast(res.error || "Failed to update FAQ", "error");
      }
    } else {
      const res = await createFaq(form, user.token);
      setSaving(false);
      if (res.success && res.data) {
        showToast("FAQ created successfully", "success");
        setFaqs((prev) => [...prev, res.data!]);
        handleCloseForm();
      } else {
        showToast(res.error || "Failed to create FAQ", "error");
      }
    }
  };

  // Toggle Active/Inactive status directly
  const handleToggleActive = async (faq: Faq, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.token) return;
    const nextStatus = !faq.isActive;
    const res = await updateFaq(faq.id, { isActive: nextStatus }, user.token);
    if (res.success) {
      showToast(`FAQ marked as ${nextStatus ? "Active" : "Inactive"}`, "success");
      setFaqs((prev) =>
        prev.map((f) => (f.id === faq.id ? { ...f, isActive: nextStatus } : f))
      );
    } else {
      showToast(res.error || "Failed to update status", "error");
    }
  };

  // Reordering: move item up or down
  const handleMove = async (index: number, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.token) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredFaqs.length) return;

    const currentItem = filteredFaqs[index];
    const targetItem = filteredFaqs[targetIndex];

    const newOrderCurrent = targetItem.order;
    const newOrderTarget = currentItem.order === targetItem.order ? currentItem.order + 1 : currentItem.order;

    const items = [
      { id: currentItem.id, order: newOrderCurrent },
      { id: targetItem.id, order: newOrderTarget },
    ];

    const res = await reorderFaqs(items, user.token);
    if (res.success) {
      setFaqs((prev) =>
        prev
          .map((f) => {
            if (f.id === currentItem.id) return { ...f, order: newOrderCurrent };
            if (f.id === targetItem.id) return { ...f, order: newOrderTarget };
            return f;
          })
          .sort((a, b) => a.order - b.order)
      );
      showToast("Order updated", "success");
    } else {
      showToast(res.error || "Failed to update order", "error");
    }
  };

  // Delete FAQ
  const handleDeleteConfirm = async () => {
    if (!deleteId || !user?.token) return;
    const res = await deleteFaq(deleteId, user.token);
    if (res.success) {
      showToast("FAQ deleted successfully", "success");
      setFaqs((prev) => prev.filter((f) => f.id !== deleteId));
    } else {
      showToast(res.error || "Failed to delete FAQ", "error");
    }
    setDeleteId(null);
  };

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Categories list extracted from data + presets
  const allCategories = useMemo(() => {
    const set = new Set(PRESET_CATEGORIES);
    faqs.forEach((f) => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set);
  }, [faqs]);

  // Filtering
  const filteredFaqs = useMemo(() => {
    return faqs
      .filter((faq) => {
        const matchesCategory =
          selectedCategory === "ALL" ||
          (faq.category || "General").toLowerCase() === selectedCategory.toLowerCase();

        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query) ||
          (faq.category && faq.category.toLowerCase().includes(query));

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => a.order - b.order);
  }, [faqs, selectedCategory, search]);

  const activeCount = faqs.filter((f) => f.isActive).length;

  return (
    <div className={styles.page}>
      {/* ── Page Header ── */}
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <div className={styles.headerIcon}>
            <HelpCircle size={22} />
          </div>
          <div>
            <h1 className={styles.title}>FAQ Management</h1>
            <p className={styles.subtitle}>
              Manage questions & answers displayed in the mobile app support center.
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={handleOpenCreate}
          >
            Add FAQ
          </Button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div>
            <div className={styles.statLabel}>Total FAQs</div>
            <div className={styles.statValue}>{faqs.length}</div>
          </div>
          <Layers size={24} style={{ color: "var(--color-primary)" }} />
        </div>

        <div className={styles.statCard}>
          <div>
            <div className={styles.statLabel}>Active in Mobile</div>
            <div className={styles.statValue} style={{ color: "#16a34a" }}>
              {activeCount}
            </div>
          </div>
          <CheckCircle2 size={24} style={{ color: "#16a34a" }} />
        </div>

        <div className={styles.statCard}>
          <div>
            <div className={styles.statLabel}>Categories</div>
            <div className={styles.statValue}>{allCategories.length}</div>
          </div>
          <Tag size={24} style={{ color: "var(--color-text-secondary)" }} />
        </div>
      </div>

      {/* ── Create / Edit FAQ Form ── */}
      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <div className={styles.formTitle}>
              <Sparkles size={18} style={{ color: "var(--color-primary)" }} />
              <span>{editingId ? "Edit FAQ" : "Create New FAQ"}</span>
            </div>
            <Button variant="ghost" size="xs" onClick={handleCloseForm}>
              ✕
            </Button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Question *</label>
                <Input
                  placeholder="e.g. How do I attach a document?"
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  required
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Category</label>
                <Input
                  list="faq-categories"
                  placeholder="e.g. Documents, Subscription"
                  value={form.category || ""}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
                <datalist id="faq-categories">
                  {allCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className={styles.fieldGroup} style={{ marginBottom: "var(--space-4)" }}>
              <label className={styles.label}>Answer *</label>
              <textarea
                className={styles.textarea}
                placeholder="Click the + button and choose your category and folder..."
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                rows={3}
                required
              />
            </div>

            <div className={styles.toggleRow}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label className={styles.label}>Display Order:</label>
                <input
                  type="number"
                  min={1}
                  style={{
                    width: 70,
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border)",
                  }}
                  value={form.order || 1}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                />
              </div>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <span>Active (Visible on Mobile)</span>
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.isGlobal}
                  onChange={(e) => setForm({ ...form, isGlobal: e.target.checked })}
                />
                <span>Global FAQ (All Companies)</span>
              </label>
            </div>

            <div className={styles.formActions}>
              <Button variant="outline" size="sm" type="button" onClick={handleCloseForm}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" loading={saving}>
                {editingId ? "Save Changes" : "Create FAQ"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Toolbar: Search & Category Pills ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <Input
            placeholder="Search FAQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.categoryPills}>
          <button
            className={`${styles.pill} ${selectedCategory === "ALL" ? styles.activePill : ""}`}
            onClick={() => setSelectedCategory("ALL")}
          >
            All ({faqs.length})
          </button>
          {allCategories.map((cat) => {
            const count = faqs.filter(
              (f) => (f.category || "General").toLowerCase() === cat.toLowerCase()
            ).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                className={`${styles.pill} ${selectedCategory === cat ? styles.activePill : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── FAQ List / Cards ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className={styles.emptyState}>
          <HelpCircle size={44} className={styles.emptyIcon} />
          <h3>No FAQs Found</h3>
          <p style={{ marginTop: 6, fontSize: "14px" }}>
            {search || selectedCategory !== "ALL"
              ? "No questions match your current search or category filter."
              : "Get started by adding your first FAQ for the mobile app."}
          </p>
          <div style={{ marginTop: 16 }}>
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              Add First FAQ
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.faqList}>
          {filteredFaqs.map((faq, index) => {
            const isExpanded = Boolean(expandedIds[faq.id]);
            return (
              <div
                key={faq.id}
                className={`${styles.faqCard} ${!faq.isActive ? styles.faqInactive : ""}`}
              >
                <div className={styles.faqCardMain} onClick={() => toggleExpand(faq.id)}>
                  <div className={styles.faqContent}>
                    <div className={styles.faqMeta}>
                      <span className={styles.orderBadge}>#{faq.order}</span>
                      <Badge variant="neutral">{faq.category || "General"}</Badge>
                      <Badge variant={faq.isActive ? "success" : "info"} dot>
                        {faq.isActive ? "Active" : "Draft"}
                      </Badge>
                      {faq.companyId === null && (
                        <Badge variant="primary">Global</Badge>
                      )}
                    </div>
                    <div className={styles.faqQuestion}>{faq.question}</div>
                    {isExpanded && (
                      <div className={styles.faqAnswerPreview}>{faq.answer}</div>
                    )}
                  </div>

                  {/* Actions & Ordering */}
                  <div className={styles.faqControls}>
                    <button
                      className={styles.actionBtn}
                      title="Move Up"
                      disabled={index === 0}
                      onClick={(e) => handleMove(index, "up", e)}
                      style={{ opacity: index === 0 ? 0.4 : 1 }}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className={styles.actionBtn}
                      title="Move Down"
                      disabled={index === filteredFaqs.length - 1}
                      onClick={(e) => handleMove(index, "down", e)}
                      style={{ opacity: index === filteredFaqs.length - 1 ? 0.4 : 1 }}
                    >
                      <ArrowDown size={14} />
                    </button>

                    <button
                      className={styles.actionBtn}
                      title={faq.isActive ? "Deactivate (Hide on mobile)" : "Activate"}
                      onClick={(e) => handleToggleActive(faq, e)}
                    >
                      {faq.isActive ? (
                        <Eye size={15} style={{ color: "#16a34a" }} />
                      ) : (
                        <EyeOff size={15} style={{ color: "#ca8a04" }} />
                      )}
                    </button>

                    <button
                      className={styles.actionBtn}
                      title="Edit FAQ"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(faq);
                      }}
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                      title="Delete FAQ"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(faq.id);
                        setDeleteQuestion(faq.question);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>

                    <button
                      className={styles.actionBtn}
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        title="Delete FAQ"
        message={`Are you sure you want to delete this FAQ: "${deleteQuestion}"?`}
        confirmLabel="Delete"
        variant="danger"
        icon="delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
