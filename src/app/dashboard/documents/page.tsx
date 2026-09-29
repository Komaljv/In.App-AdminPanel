"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Filter, FileText, Download, History, Share2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { searchDocuments } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import styles from "./page.module.css";
import DocumentVersionsModal from "./DocumentVersionsModal";
import ShareModal from "./ShareModal";

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Badge } from "@/components/ui/Badge/Badge";
import { Table, type Column } from "@/components/ui/Table/Table";
import { Card } from "@/components/ui/Card/Card";

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
  const [shareTarget, setShareTarget] = useState<{ id: string; name: string } | null>(null);

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
      if (Array.isArray(res.data)) {
        setDocuments(res.data);
        setTotalPages(1);
        setTotal(res.data.length);
      } else {
        const paged = res.data as { data?: DocumentItem[]; meta?: any };
        setDocuments(paged.data || []);
        setTotalPages(paged.meta?.totalPages || 1);
        setTotal(paged.meta?.total || 0);
      }
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

  const columns = useMemo<Column<DocumentItem>[]>(() => [
    {
      key: "fileName",
      header: "File Name",
      render: (doc) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{doc.fileName}</span>
        </div>
      )
    },
    {
      key: "category",
      header: "Category",
      render: (doc) => doc.category ? (
        <Badge variant="primary">{doc.category.name}</Badge>
      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    {
      key: "mimeType",
      header: "Type",
      render: (doc) => <span style={{ color: 'var(--text-secondary)' }}>{doc.mimeType}</span>
    },
    {
      key: "size",
      header: "Size",
      render: (doc) => <span style={{ color: 'var(--text-secondary)' }}>{(doc.fileSize / 1024).toFixed(2)} KB</span>
    },
    {
      key: "createdAt",
      header: "Created At",
      render: (doc) => <span style={{ color: 'var(--text-secondary)' }}>{new Date(doc.createdAt).toLocaleString()}</span>
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (doc) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <Button 
            size="sm" 
            variant="ghost" 
            leftIcon={<Share2 size={14} />} 
            onClick={() => setShareTarget({ id: doc.id, name: doc.fileName })} 
            title="Share Document"
          >
            Share
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            leftIcon={<History size={14} />} 
            onClick={() => setSelectedDocument({ id: doc.id, name: doc.fileName })} 
            title="View version history"
          >
            Versions
          </Button>
        </div>
      )
    }
  ], []);

  return (
    <div className={styles.page} style={{ padding: 'var(--space-8) 36px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 className="text-page-title text-text-primary">Documents</h1>
          <p className="text-text-secondary text-sm" style={{ marginTop: 'var(--space-1)' }}>Global view of all system documents</p>
        </div>
        <Button
          variant="outline"
          leftIcon={<Download size={16} />}
          onClick={handleExport}
          disabled={documents.length === 0}
        >
          Export CSV
        </Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '360px' }}>
          <Input
            type="text"
            leftIcon={<Search size={15} />}
            placeholder="Search documents by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ position: 'relative', width: '200px' }}>
          <Input
            type="text"
            leftIcon={<Filter size={15} />}
            placeholder="Category ID filter"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          />
        </div>
        <Badge variant="neutral">
          {total} documents total
        </Badge>
      </div>

      <Table
        columns={columns}
        data={documents}
        loading={loading}
        emptyMessage="No documents found"
      />

      <DocumentVersionsModal
        isOpen={!!selectedDocument}
        documentId={selectedDocument?.id || ""}
        fileName={selectedDocument?.name || ""}
        onClose={() => setSelectedDocument(null)}
        onRestoreSuccess={fetchDocuments}
      />
      
      <ShareModal
        isOpen={!!shareTarget}
        onClose={() => setShareTarget(null)}
        itemId={shareTarget?.id || ""}
        itemName={shareTarget?.name || ""}
        itemType="file"
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
