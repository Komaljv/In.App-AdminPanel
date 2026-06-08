"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, CheckCircle, Clock, TrendingUp, Building2 } from "lucide-react";
import styles from "./page.module.css";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  getDashboardStats,
  getRecentActivity,
  type DashboardStats,
} from "@/lib/api";

interface ActivityItem {
  email?: string;
  name?: string;
  action?: string;
  type?: string;
  createdAt?: string;
  status?: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!user?.token) return;

    const fetchData = async () => {
      setLoadingStats(true);
      const [statsRes, activityRes] = await Promise.all([
        getDashboardStats(user.token),
        getRecentActivity(user.token),
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (activityRes.success) {
        const raw = activityRes.data;
        // Handle various response shapes
        if (Array.isArray(raw)) setActivity(raw);
        else if (raw && typeof raw === "object") {
          const arr = (raw as Record<string, unknown[]>).items ||
                      (raw as Record<string, unknown[]>).activity ||
                      (raw as Record<string, unknown[]>).data ||
                      [];
          setActivity(arr as ActivityItem[]);
        }
      }
      setLoadingStats(false);
    };

    fetchData();
  }, [user?.token]);

  const statCards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? "—",
      icon: Users,
      color: "#111827", // Accent black
    },
    {
      label: "Total Companies",
      value: stats?.totalCompanies ?? "—",
      icon: Building2,
      color: "#6366f1", // Indigo
    },
    {
      label: "Total Documents",
      value: (stats as Record<string, unknown>)?.totalDocuments ?? "—",
      icon: CheckCircle,
      color: "#10b981", // Success Green
    },
    {
      label: "Total Categories",
      value: (stats as Record<string, unknown>)?.totalCategories ?? "—",
      icon: TrendingUp,
      color: "#3b82f6", // Info Blue
    },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Welcome back, <strong>{user?.name ?? user?.email}</strong>!
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
              <div
                className={styles.statIcon}
                style={{ color }}
              >
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
            <p className={styles.statLabel}>{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          {/* <Link href="/dashboard/invitations" className={styles.seeAll}>
            View all
          </Link> */}
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
              const displayName =
                item.name || item.email || "Unknown";
              const action =
                item.action || item.type || "Activity";
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
                      <span className={`badge ${statusClass}`}>
                        {item.status}
                      </span>
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
