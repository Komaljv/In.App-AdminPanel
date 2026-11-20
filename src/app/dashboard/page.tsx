"use client";

import { useEffect, useState } from "react";
import { Users, CheckCircle, TrendingUp, Building2, Folder, Tag, FileText } from "lucide-react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getDashboardStats,
  getRecentActivity,
  getUserAnalytics,
  getCategories,
  getFolders,
  searchDocuments,
  type DashboardStats,
} from "@/lib/api";
import { isAdminUser, isSystemAdmin } from "@/lib/role-utils";

interface ActivityItem {
  email?: string;
  name?: string;
  action?: string;
  type?: string;
  createdAt?: string;
  status?: string;
}

interface UserCategorySummary {
  id: string;
  name: string;
  documentCount: number;
}

export default function DashboardPage() {
  const { user, impersonatorAdmin, isImpersonating } = useAuth();
  const router = useRouter();
  const isAdmin = isAdminUser(user);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // User-scoped metrics
  const [userDocCount, setUserDocCount] = useState<number | string>("—");
  const [userCategoryCount, setUserCategoryCount] = useState<number | string>("—");
  const [userFolderCount, setUserFolderCount] = useState<number | string>("—");
  const [userCategories, setUserCategories] = useState<UserCategorySummary[]>([]);

  useEffect(() => {
    if (!user?.token) return;

    const fetchData = async () => {
      setLoadingStats(true);

      if (isAdmin) {
        // Admin View: System-wide metrics
        const [statsRes, activityRes] = await Promise.all([
          getDashboardStats(user.token),
          getRecentActivity(user.token),
        ]);

        if (statsRes.success && statsRes.data) setStats(statsRes.data);
        if (activityRes.success) {
          const raw = activityRes.data;
          if (Array.isArray(raw)) setActivity(raw);
          else if (raw && typeof raw === "object") {
            const arr =
              (raw as Record<string, unknown[]>).items ||
              (raw as Record<string, unknown[]>).activity ||
              (raw as Record<string, unknown[]>).data ||
              [];
            setActivity(arr as ActivityItem[]);
          }
        }
      } else {
        // Regular User / Switched User View: User-only metrics
        try {
          let loadedFromAnalytics = false;

          // If viewing as user via Admin impersonation, use dedicated user analytics
          if (impersonatorAdmin?.token) {
            const analyticsRes = await getUserAnalytics(user.id, impersonatorAdmin.token);
            if (analyticsRes.success && analyticsRes.data) {
              const data = analyticsRes.data as any;
              setUserDocCount(data.stats?.totalDocumentsUploaded ?? 0);
              setUserCategoryCount(data.stats?.totalCategoriesCreated ?? 0);
              setUserFolderCount(data.stats?.totalCompanyFolders ?? 0);

              if (Array.isArray(data.categoryStats)) {
                setUserCategories(
                  data.categoryStats.map((c: any) => ({
                    id: c.categoryId,
                    name: c.categoryName,
                    documentCount: c.count || 0,
                  }))
                );
              }

              if (Array.isArray(data.loginHistory) && data.loginHistory.length > 0) {
                setActivity(
                  data.loginHistory.slice(0, 8).map((log: any) => ({
                    name: user.name,
                    email: user.email,
                    action: `Signed in from ${log.ipAddress || "web session"}`,
                    createdAt: log.createdAt,
                    status: "active",
                  }))
                );
              } else if (Array.isArray(data.uploadedDocuments)) {
                setActivity(
                  data.uploadedDocuments.slice(0, 8).map((doc: any) => ({
                    name: user.name,
                    email: user.email,
                    action: `Uploaded "${doc.fileName}"`,
                    createdAt: doc.createdAt,
                    status: "active",
                  }))
                );
              }
              loadedFromAnalytics = true;
            }
          }

          if (!loadedFromAnalytics) {
            // Direct user query fallback: fetch user's documents, categories, folders
            const [docsRes, catsRes, foldersRes] = await Promise.all([
              searchDocuments(user.token, { page: 1, limit: 1 }),
              getCategories(user.token),
              getFolders(user.token),
            ]);

            if (docsRes.success && docsRes.data) {
              const total = (docsRes.data as any).total ?? (docsRes.data as any).items?.length ?? 0;
              setUserDocCount(total);
            }
            if (catsRes.success && catsRes.data) {
              const cats = Array.isArray(catsRes.data) ? catsRes.data : [];
              setUserCategoryCount(cats.length);
              setUserCategories(
                cats.map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  documentCount: c.documentsCount || c._count?.documents || 0,
                }))
              );
            }
            if (foldersRes.success && foldersRes.data) {
              const flds = Array.isArray(foldersRes.data) ? foldersRes.data : [];
              setUserFolderCount(flds.length);
            }
          }
        } catch (err) {
          console.error("Error loading user dashboard stats:", err);
        }
      }

      setLoadingStats(false);
    };

    fetchData();
  }, [user?.token, isAdmin, impersonatorAdmin?.token, user?.id, user?.name, user?.email]);

  // Dynamic stat cards: Admins see system-wide users/companies; regular users see only their own data
  const statCards = isAdmin
    ? [
        {
          label: "Total Users",
          value: stats?.totalUsers ?? "—",
          icon: Users,
          color: "#111827",
        },
        ...(isSystemAdmin(user)
          ? [
              {
                label: "Total Companies",
                value: stats?.totalCompanies ?? "—",
                icon: Building2,
                color: "#6366f1",
              },
            ]
          : []),
        {
          label: "Total Documents",
          value: (stats as Record<string, unknown>)?.totalDocuments ?? "—",
          icon: CheckCircle,
          color: "#10b981",
        },
        {
          label: "Total Categories",
          value: (stats as Record<string, unknown>)?.totalCategories ?? "—",
          icon: TrendingUp,
          color: "#3b82f6",
        },
      ]
    : [
        {
          label: "My Documents",
          value: userDocCount,
          icon: CheckCircle,
          color: "#10b981",
        },
        {
          label: "My Categories",
          value: userCategoryCount,
          icon: Tag,
          color: "#3b82f6",
        },
        {
          label: "My Folders",
          value: userFolderCount,
          icon: Folder,
          color: "#6366f1",
        },
      ];

  const categorySummariesList = isAdmin
    ? (stats as any)?.categorySummaries || []
    : userCategories;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {isAdmin ? "Dashboard" : "My Workspace"}
          </h1>
          <p className={styles.subtitle}>
            Welcome back, <strong>{user?.name || user?.email}</strong>!
            {!isAdmin && (
              <span style={{ marginLeft: "8px", fontSize: "0.85rem", opacity: 0.8 }}>
                (Viewing personal documents, categories & folders)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {statCards.map(({ label, value, icon: Icon, color, isPending }: any) => (
          <div
            key={label}
            className={`${styles.statCard} ${isPending ? styles.pendingCard : ""}`}
          >
            <div className={styles.statTop}>
              <h3 className={styles.statLabel}>{label}</h3>
              <div className={styles.statIcon} style={{ color }}>
                <Icon size={22} strokeWidth={2.5} />
              </div>
            </div>
            <p className={styles.statValue}>
              {loadingStats ? (
                <span className={styles.shimmer}>——</span>
              ) : (
                String(value)
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Category Summaries */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {isAdmin ? "Category Summaries" : "My Category Summaries"}
          </h2>
        </div>
        <div className={styles.statsGrid}>
          {loadingStats ? (
            <div className={styles.emptyState}>Loading...</div>
          ) : categorySummariesList.length === 0 ? (
            <div className={styles.emptyState}>No categories found</div>
          ) : (
            categorySummariesList.map((cat: any) => (
              <div
                key={cat.id}
                className={styles.statCard}
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/dashboard/documents?categoryId=${cat.id}`)}
              >
                <div className={styles.statTop}>
                  <h3 className={styles.statLabel} style={{ fontWeight: 700, color: "inherit" }}>
                    {cat.name}
                  </h3>
                </div>
                <p className={styles.statValue}>
                  {cat.documentCount}{" "}
                  <span
                    style={{
                      fontSize: "1rem",
                      color: "var(--color-text-secondary)",
                      fontWeight: 500,
                      marginLeft: "4px",
                    }}
                  >
                    documents
                  </span>
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {isAdmin ? "Recent Activity" : "My Recent Activity"}
          </h2>
        </div>

        <div className={styles.activityCard}>
          {loadingStats ? (
            <div className={styles.emptyState}>
              <span className="spinner" />
            </div>
          ) : activity.length === 0 ? (
            <div className={styles.emptyState}>No recent activity</div>
          ) : (
            activity.slice(0, 8).map((item, i) => {
              const displayName = item.name || item.email || user?.name || "User";
              const action = item.action || item.type || "Activity";
              const statusClass =
                item.status === "active" || item.status === "accepted"
                  ? "badge-success"
                  : item.status === "pending"
                  ? "badge-warning"
                  : "badge-muted";

              return (
                <div key={i} className={styles.activityRow}>
                  <div className={styles.activityAvatar}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.activityInfo}>
                    <p className={styles.activityUser}>{displayName}</p>
                    <p className={styles.activityAction}>{action}</p>
                  </div>
                  <div className={styles.activityMeta}>
                    {item.status && (
                      <span className={`badge ${statusClass}`}>{item.status}</span>
                    )}
                    {item.createdAt && (
                      <span className={styles.activityTime}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
