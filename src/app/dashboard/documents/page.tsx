"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Filter, FileText, Download, History } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { searchDocuments } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import styles from "./page.module.css";
import DocumentVersionsModal from "./DocumentVersionsModal";

interface DocumentItem {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  category?: {
    id: string;
    name: string;
  };
}

function DocumentsPageContent() {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const searchParams = useSearchParams();
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") || "");
  const LIMIT = 20;

  const [selectedDocument, setSelectedDocument] = useState<{ id: string; name: string } | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!authUser?.token) return;
    setLoading(true);
    const params = {
      page,
      limit: LIMIT,
      q: search || undefined,
      categoryId: categoryId || undefined,
    };
    const res = await searchDocuments(authUser.token, params);
    setLoading(false);
    
    if (res.success && res.data) {
      const paged = res.data as { data?: DocumentItem[]; meta?: any };
      setDocuments(paged.data || []);
      setTotalPages(paged.meta?.totalPages || 1);
      setTotal(paged.meta?.total || 0);
    } else {
      showToast(res.error || "Failed to load documents", "error");
    }
  }, [authUser?.token, page, search, categoryId, showToast]);

  useEffect(() => {
    // simple debounce for search
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchDocuments]);

  // Handle client-side CSV export
  const handleExport = () => {
    if (documents.length === 0) return;
    
    const headers = ["ID", "File Name", "MIME Type", "Size (bytes)", "Category", "Created At"];
    const rows = documents.map(doc => [
      doc.id,
      doc.fileName,
      doc.mimeType,
      doc.fileSize,
      doc.category?.name || "N/A",
      new Date(doc.createdAt).toISOString()
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "documents_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Documents</h1>
          <p className={styles.subtitle}>Global view of all system documents</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={handleExport}
          disabled={documents.length === 0}
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={`form-input ${styles.searchInput}`}
            placeholder="Search documents by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.searchWrapper} style={{ maxWidth: '200px' }}>
          <input
            type="text"
            className={`form-input`}
            placeholder="Category ID filter"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
        </div>
        <span className={styles.countBadge}>
          {total} documents total
        </span>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>File Name</th>
              <th>Category</th>
              <th>Type</th>
              <th>Size</th>
              <th>Created At</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  <span className="spinner" /> Loading documents...
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  No documents found
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className={styles.tableRow}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} className={styles.createIcon} />
                      <span className={styles.userName}>{doc.fileName}</span>
                    </div>
                  </td>
                  <td>
                    {doc.category ? (
                      <span className="badge badge-info">{doc.category.name}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span className={styles.userEmail}>{doc.mimeType}</span>
                  </td>
                  <td>
                    {(doc.fileSize / 1024).toFixed(2)} KB
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(doc.createdAt).toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setSelectedDocument({ id: doc.id, name: doc.fileName })}
                      title="View version history"
                    >
                      <History size={14} />
                      Versions
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DocumentVersionsModal
        isOpen={!!selectedDocument}
        documentId={selectedDocument?.id || ""}
        fileName={selectedDocument?.name || ""}
        onClose={() => setSelectedDocument(null)}
        onRestoreSuccess={fetchDocuments}
      />
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <DocumentsPageContent />
    </Suspense>
  );
}
