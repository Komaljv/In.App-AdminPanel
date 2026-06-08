"use client";

import { useState, useEffect, useRef } from "react";
import { X, UserPlus, Mail, ShieldCheck, Send, ChevronDown } from "lucide-react";
import { inviteUser, getRoles } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import styles from "./invite-modal.module.css";

interface Role {
  id: string;
  name: string;
  isDefault: boolean;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Roles to exclude (test/system roles)
const EXCLUDED_ROLES = ["update"];

// Role badge colors — In.APP brand palette
const ROLE_COLORS: Record<string, string> = {
  ADMIN:    "#FFB800",  // brand yellow
  MANAGER:  "#6060FF",  // electric blue
  EXTERNAL: "#06b6d4",  // cyan
  USER:     "#10b981",  // emerald
};

export default function InviteModal({ isOpen, onClose, onSuccess }: InviteModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [fieldError, setFieldError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  // Fetch roles on open
  useEffect(() => {
    if (!isOpen || !user?.token) return;

    const fetchRoles = async () => {
      setRolesLoading(true);
      const res = await getRoles(user.token);
      setRolesLoading(false);

      if (res.success && res.data) {
        // Filter out test/system roles and sort nicely
        const filtered = (res.data as Role[]).filter(
          (r) => !EXCLUDED_ROLES.includes(r.name.toLowerCase())
        );
        const order = ["ADMIN", "MANAGER", "USER", "EXTERNAL"];
        filtered.sort((a, b) => {
          const ai = order.indexOf(a.name);
          const bi = order.indexOf(b.name);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
        setRoles(filtered);
        // Pre-select USER role by default
        const userRole = filtered.find((r) => r.name === "USER");
        setRoleId(userRole?.id || filtered[0]?.id || "");
      }
    };

    fetchRoles();
    setEmail("");
    setFieldError("");
    setTimeout(() => emailRef.current?.focus(), 100);
  }, [isOpen, user?.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    if (!email.trim()) { setFieldError("Email is required."); return; }
    if (!roleId) { setFieldError("Please select a role."); return; }
    if (!user?.token) { setFieldError("Not authenticated."); return; }

    setLoading(true);
    const res = await inviteUser(email.trim(), roleId, user.token);
    setLoading(false);

    if (res.success) {
      showToast(res.message || `Invitation sent to ${email}!`, "success");
      onSuccess?.();
      onClose();
    } else {
      setFieldError(res.error || "Failed to send invite.");
    }
  };

  if (!isOpen) return null;

  const selectedRole = roles.find((r) => r.id === roleId);

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <UserPlus size={20} />
          </div>
          <div>
            <h2 className={styles.title}>Invite User</h2>
            <p className={styles.subtitle}>Send an invitation to join your organization</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} id="invite-modal-close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="invite-email">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Mail size={13} /> Email Address
              </span>
            </label>
            <input
              id="invite-email"
              ref={emailRef}
              type="email"
              className="form-input"
              placeholder="user@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldError(""); }}
            />
          </div>

          {/* Role selection as cards */}
          <div className="form-group">
            <label className="form-label">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={13} /> Assign Role
              </span>
            </label>

            {rolesLoading ? (
              <div className={styles.rolesLoading}>
                <span className="spinner" style={{ width: 18, height: 18 }} />
                <span>Loading roles...</span>
              </div>
            ) : (
              <div className={styles.selectWrapper}>
                <select
                  id="invite-role"
                  className={styles.roleSelect}
                  value={roleId}
                  onChange={(e) => { setRoleId(e.target.value); setFieldError(""); }}
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

          <div className={styles.infoBox}>
            <p className={styles.infoText}>
              The user will receive an email with a link to set up their account
              {selectedRole ? ` as ${selectedRole.name}` : ""}.
            </p>
          </div>

          {fieldError && <div className={styles.errorBox}>{fieldError}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || rolesLoading || !roleId}
              id="invite-modal-send"
            >
              {loading ? <span className="spinner" /> : <Send size={15} />}
              {loading ? "Sending…" : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
