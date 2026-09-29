"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search,  ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getAuditLogs, exportAuditLogs } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import styles from "./page.module.css";
import { Table, type Column } from "@/components/ui/Table/Table";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Badge } from "@/components/ui/Badge/Badge";

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

  const columns = useMemo<Column<AuditLog>[]>(() => [
    {
      key: "createdAt",
      header: "Timestamp",
      render: (log) => (
        <span className={styles.dateCell}>
          {new Date(log.createdAt).toLocaleString()}
        </span>
      )
    },
    {
      key: "user",
      header: "User",
      render: (log) => log.user ? (
        <div className={styles.userInfo}>
          <span className={styles.userName}>{log.user.name}</span>
          <span className={styles.userEmail}>{log.user.email}</span>
        </div>
      ) : (
        <span className={styles.systemUser}>System</span>
      )
    },
    {
      key: "action",
      header: "Action",
      render: (log) => {
        const variant = log.action.includes('DELETE') ? 'danger' : log.action.includes('CREATE') || log.action.includes('UPLOAD') ? 'success' : 'info';
        return <Badge variant={variant as any}>{log.action}</Badge>;
      }
    },
    {
      key: "details",
      header: "Details",
      render: (log) => <span className={styles.detailsCell}>{log.details || "—"}</span>
    },
    {
      key: "deviceInfo",
      header: "IP / Device",
      render: (log) => (
        <div className={styles.deviceInfo}>
          <span className={styles.ipAddress}>{log.ipAddress || "—"}</span>
          {log.userAgent && (
            <span className={styles.userAgent} title={log.userAgent}>
              {log.userAgent.length > 20 ? log.userAgent.substring(0, 20) + "..." : log.userAgent}
            </span>
          )}
        </div>
      )
    }
  ], []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Activity Logs</h1>
          <p className={styles.subtitle}>System-wide chronological audit trail</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          leftIcon={<Download size={16} />}
          loading={exporting}
        >
          Export CSV
        </Button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Input
            type="text"
            leftIcon={<Search size={15} />}
            placeholder="Search action, detail, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="neutral">
          {total} events total
        </Badge>
      </div>

      <Table
        columns={columns}
        data={filteredLogs}
        loading={loading}
        emptyMessage={search ? "No logs match your search" : "No activity logs recorded yet"}
      />

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="ghost"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            leftIcon={<ChevronLeft size={16} />}
          >
            Previous
          </Button>
          <span className={styles.pageInfo}>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            rightIcon={<ChevronRight size={16} />}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
