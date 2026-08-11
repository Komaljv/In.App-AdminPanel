"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Clock, Download, RefreshCw } from "lucide-react";
import { getDocumentVersions, restoreDocumentVersion } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import styles from "./document-versions-modal.module.css";

interface VersionItem {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  createdBy: string;
  createdAt: string;
}

interface DocumentVersionsModalProps {
  isOpen: boolean;
  documentId: string;
  fileName: string;
  onClose: () => void;
  onRestoreSuccess: () => void;
}

export default function DocumentVersionsModal({
  isOpen,
  documentId,
  fileName,
  onClose,
  onRestoreSuccess,
}: DocumentVersionsModalProps) {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();

  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!authUser?.token || !documentId) return;
    setLoading(true);
    const res = await getDocumentVersions(documentId, authUser.token);
    setLoading(false);

    if (res.success && res.data) {
      // Assuming backend returns an array of versions, sorted by newest first
      // or we sort them here by versionNumber descending.
      const versionsData = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
      const sorted = [...versionsData].sort((a, b) => b.version - a.version);
      setVersions(sorted);
    } else {
      showToast(res.error || "Failed to load document versions", "error");
    }
  }, [authUser?.token, documentId, showToast]);

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    } else {
      setVersions([]);
    }
  }, [isOpen, fetchVersions]);

  const handleRestore = async (versionId: string) => {
    if (!authUser?.token) return;
    
    if (!confirm("Are you sure you want to restore this version? This will become the active version.")) {
      return;
    }

    setRestoringId(versionId);
    const res = await restoreDocumentVersion(documentId, versionId, authUser.token);
    setRestoringId(null);

    if (res.success) {
      showToast("Document version restored successfully", "success");
      onRestoreSuccess();
      onClose();
    } else {
      showToast(res.error || "Failed to restore version", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Version History: {fileName}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.emptyState}>
              <span className="spinner" /> Loading versions...
            </div>
          ) : versions.length === 0 ? (
            <div className={styles.emptyState}>No versions found for this document.</div>
          ) : (
            <div className={styles.list}>
              {versions.map((version, index) => {
                const isCurrent = index === 0; // Assuming highest version is first and is active
                return (
                  <div
                    key={version.id}
                    className={`${styles.versionItem} ${isCurrent ? styles.current : ""}`}
                  >
                    <div className={styles.versionInfo}>
                      <div className={styles.versionLabel}>
                        <Clock size={14} /> Version {version.version}
                        {isCurrent && <span className={styles.currentBadge}>Current</span>}
                      </div>
                      <div className={styles.versionMeta}>
                        {(version.fileSize / 1024).toFixed(2)} KB • {new Date(version.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {!isCurrent && (
                        <button
                          className="btn btn-outline"
                          onClick={() => handleRestore(version.id)}
                          disabled={restoringId !== null}
                          title="Restore this version"
                        >
                          {restoringId === version.id ? (
                            <span className="spinner" style={{ width: 14, height: 14 }} />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                          Restore
                        </button>
                      )}
                      {version.fileUrl && (
                        <a
                          href={version.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline"
                          title="Download this version"
                        >
                          <Download size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
