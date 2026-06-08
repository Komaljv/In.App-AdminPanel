"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Folder,
  FileText,
  MessageSquare,
  Share2,
  Database,
  Clock,
  Grid,
  Layers,
  Search,
  ChevronDown,
  CheckCircle,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getUserAnalytics, impersonateUser } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import styles from "./page.module.css";

interface AnalyticsData {
  profile: {
    id: string;
    companyId: string;
    name: string;
    email: string;
    createdAt: string;
    isActive: boolean;
    isInvited: boolean;
    phone: string | null;
    country: string | null;
    profileImage: string | null;
    role: {
      id: string;
      name: string;
      isDefault: boolean;
    };
    company: {
      id: string;
      name: string;
      fiscalCode: string | null;
      createdAt: string;
    };
  };
  stats: {
    totalDocumentsUploaded: number;
    totalDocumentsSize: number;
    totalCategoriesCreated: number;
    totalCompanyFolders: number;
    totalMessagesSent: number;
    totalShares: number;
  };
  categoryStats: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
    totalSize: number;
  }>;
  folderStats: Array<{
    folderId: string | null;
    folderName: string;
    count: number;
    totalSize: number;
  }>;
  uploadedDocuments: Array<{
    id: string;
    fileName: string;
    fileKey: string;
    fileUrl: string | null;
    mimeType: string;
    fileSize: number;
    createdAt: string;
    category: {
      id: string;
      name: string;
    };
    folder: {
      id: string;
      name: string;
    } | null;
  }>;
  loginHistory: Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
  }>;
}

export default function UserAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user: authUser, login } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);


  const fetchAnalytics = useCallback(async () => {
    if (!authUser?.token || !id) return;
    setLoading(true);
    setError("");

    const res = await getUserAnalytics(id, authUser.token);
    setLoading(false);

    if (res.success && res.data) {
      setData(res.data);
    } else {
      const errMsg = res.error || "Failed to fetch user analytics";
      setError(errMsg);
      showToast(errMsg, "error");
    }
  }, [authUser?.token, id, showToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const handleExportCSV = () => {
    if (!data) return;
    
    // Create CSV content
    let csv = "Section,Metric,Value\n";
    csv += `Profile,Name,${data.profile.name}\n`;
    csv += `Profile,Email,${data.profile.email}\n`;
    csv += `Profile,Role,${data.profile.role?.name}\n`;
    csv += `Stats,Total Uploads,${data.stats.totalDocumentsUploaded}\n`;
    csv += `Stats,Total Size,${formatBytes(data.stats.totalDocumentsSize)}\n`;
    csv += `Stats,Folders Created,${data.stats.totalCompanyFolders}\n`;
    csv += `Stats,Categories Created,${data.stats.totalCategoriesCreated}\n`;
    csv += `Stats,Messages Sent,${data.stats.totalMessagesSent}\n`;
    csv += `Stats,Links Shared,${data.stats.totalShares}\n`;

    csv += "\nUploaded Documents\nFilename,Category,Folder,Size,Date\n";
    data.uploadedDocuments.forEach(doc => {
      csv += `"${doc.fileName}","${doc.category.name}","${doc.folder?.name || ''}","${formatBytes(doc.fileSize)}","${new Date(doc.createdAt).toLocaleDateString()}"\n`;
    });

    csv += "\nLogin History\nDate,IP Address,Device/Browser\n";
    data.loginHistory.forEach(log => {
      csv += `"${new Date(log.createdAt).toLocaleString()}","${log.ipAddress || ''}","${log.userAgent || ''}"\n`;
    });

    // Download file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${data.profile.name.replace(/\s+/g, '_')}_analysis.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImpersonate = async () => {
    if (!authUser?.token || !id) return;
    try {
      const res = await impersonateUser(id, authUser.token);
      if (res.success && res.data) {
        const payload = res.data as { user: any; accessToken: string; refreshToken: string };
        const userData = {
          id: payload.user.id,
          companyId: payload.user.companyId,
          name: payload.user.name,
          email: payload.user.email,
          roleId: payload.user.roleId,
          role: payload.user.role?.name || "USER"
        };
        showToast(`Now logged in as ${profile.name}`, "success");
        login(payload.accessToken, userData);
        router.push("/dashboard");
      } else {
        showToast(res.error || "Failed to login as user", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to login as user", "error");
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loaderWrapper}>
          <span className="spinner" />
          <p>Loading user analysis data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.backHeader}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className={styles.title}>Error Loading Analytics</h1>
            <p className={styles.subtitle}>{error || "User data is unavailable."}</p>
          </div>
        </div>
      </div>
    );
  }

  const { profile, stats, categoryStats, folderStats, uploadedDocuments, loginHistory } = data;

  const filteredDocs = (uploadedDocuments || []).filter((doc) =>
    doc.fileName.toLowerCase().includes(docSearch.toLowerCase())
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.backHeader}>
        <button className={styles.backBtn} onClick={() => router.back()} title="Back to Users">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className={styles.title}>{profile.name}'s Analysis</h1>
          <p className={styles.subtitle}>Detailed activity & document usage overview</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "var(--space-3)" }}>
          <button className="btn btn-outline" onClick={handleImpersonate}>
            <LogIn size={16} style={{ marginRight: 6 }} />
            Login As User
          </button>
          <button className="btn btn-ghost" onClick={handleExportCSV}>
            <Database size={16} style={{ marginRight: 6 }} />
            Export CSV
          </button>
        </div>
      </div>

      <div className={styles.topGrid}>
        {/* Profile Card */}
        <div className={`${styles.card} ${styles.profileCard}`}>
          <div className={styles.profileCard}>
            <div className={styles.profileAvatar}>
              {profile.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <h2 className={styles.profileName}>{profile.name}</h2>
            <p className={styles.profileEmail}>{profile.email}</p>

            <div className={styles.profileMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Role</span>
                <span className="badge badge-info">{profile.role?.name || "Member"}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status</span>
                {profile.isInvited ? (
                  <span className="badge badge-warning">Pending</span>
                ) : (
                  <span className={`badge ${profile.isActive ? "badge-success" : "badge-danger"}`}>
                    {profile.isActive ? "Active" : "Inactive"}
                  </span>
                )}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Company</span>
                <span className={styles.metaValue}>{profile.company?.name || "—"}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Joined</span>
                <span className={styles.metaValue}>
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
              {profile.phone && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Phone</span>
                  <span className={styles.metaValue}>{profile.phone}</span>
                </div>
              )}
              {profile.country && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Country</span>
                  <span className={styles.metaValue}>{profile.country}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statBox}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Uploaded Files</span>
              <FileText size={16} />
            </div>
            <div className={styles.statVal}>{stats.totalDocumentsUploaded}</div>
          </div>

          <div className={styles.statBox}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Storage Used</span>
              <Database size={16} />
            </div>
            <div className={styles.statVal}>{formatBytes(stats.totalDocumentsSize)}</div>
          </div>

          <div className={styles.statBox}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Folders Created</span>
              <Folder size={16} />
            </div>
            <div className={styles.statVal}>{stats.totalCompanyFolders}</div>
          </div>

          <div className={styles.statBox}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Categories Created</span>
              <Layers size={16} />
            </div>
            <div className={styles.statVal}>{stats.totalCategoriesCreated}</div>
          </div>

          <div className={styles.statBox}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Messages Sent</span>
              <MessageSquare size={16} />
            </div>
            <div className={styles.statVal}>{stats.totalMessagesSent}</div>
          </div>

          <div className={styles.statBox}>
            <div className={styles.statHeader}>
              <span className={styles.statTitle}>Shared Links</span>
              <Share2 size={16} />
            </div>
            <div className={styles.statVal}>{stats.totalShares}</div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className={styles.detailsGrid}>
        {/* Left Column: Folders & Categories */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* Folders Breakdown */}
          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
              <Folder size={18} />
              Folder Activity
            </h3>
            {folderStats.length === 0 ? (
              <p className={styles.noData}>No folders uploaded to yet.</p>
            ) : (
              <div className={styles.list}>
                {folderStats.map((f, idx) => {
                  const folderKey = f.folderId || "root";
                  const isExpanded = expandedFolder === folderKey;
                  const folderFiles = (uploadedDocuments || []).filter(
                    (doc) => (doc.folder?.id || null) === f.folderId
                  );
                  return (
                    <div key={idx} className={styles.listItemWrapper}>
                      <div
                        className={styles.listItem}
                        onClick={() => setExpandedFolder(isExpanded ? null : folderKey)}
                        style={{ cursor: "pointer", border: "none", background: "none" }}
                      >
                        <div>
                          <p className={styles.listItemText}>{f.folderName}</p>
                          <p className={styles.listItemSub}>{formatBytes(f.totalSize)} uploaded</p>
                        </div>
                        <span className={styles.listItemBadge}>{f.count} files</span>
                      </div>
                      {isExpanded && (
                        <div className={styles.nestedFileList}>
                          {folderFiles.length === 0 ? (
                            <p className={styles.noData} style={{ padding: "var(--space-2) 0" }}>No files in this folder.</p>
                          ) : (
                            folderFiles.map((doc) => (
                              <div key={doc.id} className={styles.nestedFileItem}>
                                {doc.fileUrl ? (
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.nestedFileLink}>
                                    {doc.fileName}
                                  </a>
                                ) : (
                                  <span>{doc.fileName}</span>
                                )}
                                <span className={styles.nestedFileSize}>{formatBytes(doc.fileSize)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
              <Grid size={18} />
              Category Breakdown
            </h3>
            {categoryStats.length === 0 ? (
              <p className={styles.noData}>No categorized uploads found.</p>
            ) : (
              <div className={styles.list}>
                {categoryStats.map((c, idx) => {
                  const isExpanded = expandedCategory === c.categoryId;
                  const categoryFiles = (uploadedDocuments || []).filter(
                    (doc) => doc.category.id === c.categoryId
                  );
                  return (
                    <div key={idx} className={styles.listItemWrapper}>
                      <div
                        className={styles.listItem}
                        onClick={() => setExpandedCategory(isExpanded ? null : c.categoryId)}
                        style={{ cursor: "pointer", border: "none", background: "none" }}
                      >
                        <div>
                          <p className={styles.listItemText}>{c.categoryName}</p>
                          <p className={styles.listItemSub}>{formatBytes(c.totalSize)} uploaded</p>
                        </div>
                        <span className={styles.listItemBadge}>{c.count} files</span>
                      </div>
                      {isExpanded && (
                        <div className={styles.nestedFileList}>
                          {categoryFiles.length === 0 ? (
                            <p className={styles.noData} style={{ padding: "var(--space-2) 0" }}>No files in this category.</p>
                          ) : (
                            categoryFiles.map((doc) => (
                              <div key={doc.id} className={styles.nestedFileItem}>
                                {doc.fileUrl ? (
                                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.nestedFileLink}>
                                    {doc.fileName}
                                  </a>
                                ) : (
                                  <span>{doc.fileName}</span>
                                )}
                                <span className={styles.nestedFileSize}>{formatBytes(doc.fileSize)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upload History / Timeline */}
        <div className={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
              <Clock size={18} />
              Uploaded Documents ({filteredDocs.length})
            </h3>
            <input
              type="text"
              placeholder="Search documents..."
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              className="form-input"
              style={{ fontSize: "var(--text-xs)", padding: "4px var(--space-3)", width: "180px", height: "32px" }}
            />
          </div>
          {filteredDocs.length === 0 ? (
            <p className={styles.noData}>No documents match search.</p>
          ) : (
            <div className={styles.timeline} style={{ maxHeight: "500px", overflowY: "auto", paddingRight: "var(--space-2)" }}>
              {filteredDocs.map((doc) => (
                <div key={doc.id} className={styles.timelineItem}>
                  <div className={styles.timelineLine}></div>
                  <div className={styles.timelineIcon}>
                    <FileText size={16} />
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineMeta}>
                      <span className={styles.timelineFile} title={doc.fileName}>
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
                            {doc.fileName.length > 25 ? doc.fileName.substring(0, 25) + "..." : doc.fileName}
                          </a>
                        ) : (
                          doc.fileName.length > 25 ? doc.fileName.substring(0, 25) + "..." : doc.fileName
                        )}
                      </span>
                      <span className={styles.timelineDate}>
                        {new Date(doc.createdAt).toLocaleDateString()} at{" "}
                        {new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={styles.listItemSub}>Size: {formatBytes(doc.fileSize)}</div>
                    <div className={styles.timelineTags}>
                      <span className={styles.timelineTag}>{doc.category.name}</span>
                      {doc.folder && (
                        <span className={styles.timelineTag}>{doc.folder.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Width Bottom: Login History */}
      <div className={styles.card} style={{ marginTop: "var(--space-6)" }}>
        <h3 className={styles.sectionTitle}>
          <Clock size={18} />
          Recent Login History
        </h3>
        {(!loginHistory || loginHistory.length === 0) ? (
          <p className={styles.noData}>No recent logins recorded.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>IP Address</th>
                <th>Device / Browser</th>
              </tr>
            </thead>
            <tbody>
              {loginHistory.map((log) => (
                <tr key={log.id}>
                  <td className={styles.dateCell}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.ipAddress || "—"}</td>
                  <td>
                    <span className={styles.listItemSub} title={log.userAgent || ""}>
                      {(log.userAgent && log.userAgent.length > 60) ? log.userAgent.substring(0, 60) + "..." : (log.userAgent || "—")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
