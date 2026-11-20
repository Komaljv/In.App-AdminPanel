"use client";

import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut } from "lucide-react";
import styles from "./ImpersonationBanner.module.css";

export default function ImpersonationBanner() {
  const { isImpersonating, user, impersonatorAdmin, exitImpersonation } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  if (!isImpersonating || !user) return null;

  const handleExit = () => {
    exitImpersonation();
    showToast(
      `Exited impersonation mode. Returned to ${impersonatorAdmin?.name || "Master Admin"}.`,
      "info"
    );
    router.push("/dashboard/users");
  };

  return (
    <div className={styles.banner} role="alert">
      <div className={styles.left}>
        <div className={styles.icon}>
          <ShieldAlert size={18} />
        </div>
        <div className={styles.text}>
          You are currently viewing as{" "}
          <span className={styles.highlight}>{user.name}</span> ({user.email})
          <span className={styles.roleBadge}>{user.role || "User"}</span>
          {" — "}
          <span>Actions taken affect this user's account.</span>
        </div>
      </div>
      <button className={styles.exitBtn} onClick={handleExit} title="Exit View as User">
        <LogOut size={15} />
        Exit & Return to Admin
      </button>
    </div>
  );
}

