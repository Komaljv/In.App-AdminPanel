"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Clock, ChevronLeft, ChevronRight, Filter, Download } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getAuditLogs, exportAuditLogs } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import styles from "./page.module.css";

interface AuditLog {
  id: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function ActivityPage() {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const LIMIT = 20;

  const handleExport = async () => {
    if (!authUser?.token) return;
    setExporting(true);
    try {
      const blob = await exportAuditLogs(authUser.token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit_logs.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("Export downloaded successfully", "success");
    } catch (err) {
      showToast("Failed to export logs", "error");
    } finally {
      setExporting(false);
    }
  };

  const fetchLogs = useCallback(async () => {
    if (!authUser?.token) return;
    setLoading(true);
    const res = await getAuditLogs(authUser.token, page, LIMIT);
    setLoading(false);
    
    if (res.success && res.data) {
      const logs = res.data as AuditLog[];
      setLogs(logs || []);
      setTotalPages(1);
      setTotal(logs.length || 0);
    } else {
      showToast(res.error || "Failed to load activity logs", "error");
    }
  }, [authUser?.token, page, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    const term = search.toLowerCase();
    const actionMatch = log.action?.toLowerCase().includes(term);
    const detailMatch = log.details?.toLowerCase().includes(term);
    const nameMatch = log.user?.name?.toLowerCase().includes(term);
    const emailMatch = log.user?.email?.toLowerCase().includes(term);
    return actionMatch || detailMatch || nameMatch || emailMatch;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Activity Logs</h1>
          <p className={styles.subtitle}>System-wide chronological audit trail</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? <span className="spinner" /> : <Download size={16} />}
          Export CSV
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={`form-input ${styles.searchInput}`}
            placeholder="Search action, detail, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className={styles.countBadge}>
          {total} events total
        </span>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Details</th>
              <th>IP / Device</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  <span className="spinner" /> Loading activity logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  {search ? "No logs match your search" : "No activity logs recorded yet"}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className={styles.tableRow}>
                  <td className={styles.dateCell}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    {log.user ? (
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{log.user.name}</span>
                        <span className={styles.userEmail}>{log.user.email}</span>
                      </div>
                    ) : (
                      <span className={styles.systemUser}>System</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${log.action.includes('DELETE') ? 'badge-danger' : log.action.includes('CREATE') || log.action.includes('UPLOAD') ? 'badge-success' : 'badge-info'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className={styles.detailsCell}>
                    {log.details || "—"}
                  </td>
                  <td>
                    <div className={styles.deviceInfo}>
                      <span className={styles.ipAddress}>{log.ipAddress || "—"}</span>
                      {log.userAgent && (
                        <span className={styles.userAgent} title={log.userAgent}>
                          {log.userAgent.length > 20 ? log.userAgent.substring(0, 20) + "..." : log.userAgent}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className="btn btn-ghost"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-ghost"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
