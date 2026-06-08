"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  Bell,
  LogOut,
  Shield,
  ChevronRight,
  Building2,
  Tag,
  UserPlus,
  Folder,
  Activity,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import styles from "./sidebar.module.css";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/companies", label: "Companies", icon: Building2 },
  { href: "/dashboard/categories", label: "Categories", icon: Tag },
  { href: "/dashboard/folders", label: "Folders", icon: Folder },
  { href: "/dashboard/activity", label: "Activity Logs", icon: Activity },
  // { href: "/dashboard/invitations", label: "Invitations", icon: UserPlus },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.brandIcon}>
          <img src="/brand/logo-circle.svg" alt="In.APP" style={{ width: '100%', height: '100%' }} />
        </div>
        <div>
          <p className={styles.brandName}>IN.APP</p>
          <p className={styles.brandRole}>Admin Portal</p>
        </div>
      </div>

      {/* Company badge */}
      {user && (
        <div className={styles.companyBadge}>
          <Building2 size={14} />
          <span>My Organization</span>
        </div>
      )}

      {/* Nav */}
      <nav className={styles.nav}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`${styles.navItem} ${active ? styles.active : ""}`}>
              <span className={styles.navIcon}>
                <Icon size={18} />
              </span>
              <span className={styles.navLabel}>{label}</span>
              {active && <ChevronRight size={14} className={styles.chevron} />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={styles.bottom}>
        <div className={styles.userCard}>
          <div className={styles.avatar}>
            {typeof user?.role === 'string' 
              ? user.role.charAt(0) 
              : (user?.role as any)?.name?.charAt(0) ?? "A"}
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{user?.name || "Admin"}</p>
            <p className={styles.userEmail}>{user?.email || "Administrator"}</p>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} id="logout-btn">
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
