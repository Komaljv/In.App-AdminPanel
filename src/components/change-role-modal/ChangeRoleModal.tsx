"use client";

import { useState, useEffect } from "react";
import { X, ShieldCheck, Check, ChevronDown } from "lucide-react";
import { getRoles, updateUserRole, type User, type Role } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import styles from "./change-role-modal.module.css";

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: User | null;
}

const EXCLUDED_ROLES = ["update"];

export default function ChangeRoleModal({ isOpen, onClose, onSuccess, user: targetUser }: ChangeRoleModalProps) {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const [roleId, setRoleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !authUser?.token) return;

    const fetchRoles = async () => {
      setRolesLoading(true);
      const res = await getRoles(authUser.token);
      setRolesLoading(false);

      if (res.success && res.data) {
        const filtered = (res.data as Role[]).filter(
          (r) => !EXCLUDED_ROLES.includes(r.name.toLowerCase())
        );
        setRoles(filtered);
      }
    };

    fetchRoles();
    if (targetUser) {
      setRoleId(targetUser.role?.id || "");
    }
    setError("");
  }, [isOpen, authUser?.token, targetUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!roleId) { setError("Please select a role."); return; }
    if (!targetUser) return;
    if (!authUser?.token) return;

    setLoading(true);
    const res = await updateUserRole(targetUser.id, roleId, authUser.token);
    setLoading(false);

    if (res.success) {
      showToast(`Role updated for ${targetUser.name}`, "success");
      onSuccess?.();
      onClose();
    } else {
      setError(res.error || "Failed to update role.");
    }
  };

  if (!isOpen || !targetUser) return null;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className={styles.title}>Change User Role</h2>
            <p className={styles.subtitle}>Update permissions for this team member</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.userSummary}>
            <div className={styles.avatar}>
              {targetUser.name?.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userDetails}>
              <p className={styles.userName}>{targetUser.name}</p>
              <p className={styles.userEmail}>{targetUser.email}</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">New Role</label>
            {rolesLoading ? (
              <div className={styles.rolesLoading}>
                <span className="spinner" />
                <span>Loading roles...</span>
              </div>
            ) : (
              <div className={styles.selectWrapper}>
                <select
                  className={styles.roleSelect}
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                >
                  <option value="" disabled>Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className={styles.selectChevron} size={16} />
              </div>
            )}
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.actions}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || rolesLoading || !roleId}>
              {loading ? <span className="spinner" /> : <Check size={16} />}
              {loading ? "Updating…" : "Update Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
