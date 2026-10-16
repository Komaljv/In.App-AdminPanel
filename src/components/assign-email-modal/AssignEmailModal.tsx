"use client";

import { useState, useEffect } from "react";
import { X, Mail, Check, AlertCircle } from "lucide-react";
import { assignUserEmail, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import styles from "./assign-email-modal.module.css";

interface AssignEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedUser: User) => void;
  user: User | null;
}

export default function AssignEmailModal({
  isOpen,
  onClose,
  onSuccess,
  user: targetUser,
}: AssignEmailModalProps) {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setError("");
  }, [isOpen]);

  if (!isOpen || !targetUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter a new email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!authUser?.token) return;

    setLoading(true);
    const res = await assignUserEmail(targetUser.id, trimmedEmail, authUser.token);
    setLoading(false);

    if (res.success && res.data) {
      showToast(`Email ${trimmedEmail} assigned to ${targetUser.name} successfully`, "success");
      onSuccess?.(res.data);
      onClose();
    } else {
      setError(res.error || "Failed to assign email to user.");
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Mail size={22} />
          </div>
          <div>
            <h2 className={styles.title}>Assign New Email</h2>
            <p className={styles.subtitle}>Reassign login access to this user profile</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.userSummary}>
            <div className={styles.userAvatar}>
              {targetUser.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{targetUser.name}</span>
              <span className={styles.userMeta}>
                Currently Revoked • Profile, data & uploads preserved
              </span>
            </div>
          </div>

          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="assign-email-input">
              New Email Address <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <Input
              id="assign-email-input"
              type="email"
              placeholder="e.g. employee@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              leftIcon={<Mail size={16} />}
              disabled={loading}
            />
            <p className={styles.hint}>
              The user will be able to log in with this new email. Their profile history and files remain intact.
            </p>
          </div>

          <div className={styles.actions}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              leftIcon={<Check size={16} />}
              fullWidth
            >
              Assign Email
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
