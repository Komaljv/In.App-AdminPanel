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
  Briefcase,
  FileText,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isAdminUser, isSystemAdmin } from "@/lib/role-utils";
import styles from "./sidebar.module.css";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/roles", label: "Roles", icon: Shield },
  { href: "/dashboard/departments", label: "Departments", icon: Briefcase },
  { href: "/dashboard/companies", label: "Companies", icon: Building2 },
  { href: "/dashboard/categories", label: "Categories", icon: Tag },
  { href: "/dashboard/folders", label: "Folders", icon: Folder },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/activity", label: "Activity Logs", icon: Activity },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/reports", label: "Reports", icon: Activity },
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
        <img src="/brand/fred_logo.png" alt="Fred" className={styles.brandLogoImage} />
        <div className={styles.brandText}>
          <p className={styles.brandRole}>Admin Portal</p>
        </div>
      </div>

      {/* Company badge */}
      {user && (
        <div className={styles.companyBadge}>
          <Building2 size={14} />
          <span>{user?.company?.name || "My Organization"}</span>
        </div>
      )}

      {/* Nav */}
      <nav className={styles.nav}>
        {navItems
          .filter(item => {
            const isAdmin = isAdminUser(user);
            const isSysAdmin = isSystemAdmin(user);

            // Administrative tabs restricted to Admins and Super Admins
            const adminTabs = [
              "/dashboard/users",
              "/dashboard/roles",
              "/dashboard/departments",
              "/dashboard/documents",
              "/dashboard/activity",
              "/dashboard/folders",
              "/dashboard/categories",
              "/dashboard/billing",
              "/dashboard/reports",
            ];
            
            if (item.href === "/dashboard/companies") {
              return isSysAdmin;
            }

            if (adminTabs.includes(item.href)) {
              return isAdmin;
            }

            return true;
          })
          .map(({ href, label, icon: Icon }) => {
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
            {(user as any)?.profilePicture || (user as any)?.avatar ? (
              <img 
                src={(user as any).profilePicture || (user as any).avatar} 
                alt="Profile" 
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} 
              />
            ) : user?.name ? (
              user.name.charAt(0).toUpperCase()
            ) : typeof user?.role === 'string' ? (
              user.role.charAt(0)
            ) : (
              (user?.role as any)?.name?.charAt(0) ?? "A"
            )}
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
