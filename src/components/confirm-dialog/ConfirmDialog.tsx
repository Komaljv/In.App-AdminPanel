"use client";

import { AlertTriangle, Trash2, UserX, RefreshCw } from "lucide-react";
import styles from "./confirm-dialog.module.css";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  icon?: "delete" | "deactivate" | "reactivate";
  onConfirm: () => void;
  onCancel: () => void;
}

const ICONS = {
  delete: <Trash2 size={22} />,
  deactivate: <UserX size={22} />,
  reactivate: <RefreshCw size={22} />,
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  icon = "delete",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.dialog}>
        <div className={`${styles.iconWrap} ${styles[variant]}`}>
          {ICONS[icon]}
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            id="confirm-dialog-cancel"
          >
            Cancel
          </button>
          <button
            className={`btn ${variant === "danger" ? "btn-danger" : "btn-warning"}`}
            onClick={onConfirm}
            id="confirm-dialog-confirm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
