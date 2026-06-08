"use client";

import { useState } from "react";
import { X, Bell, Send } from "lucide-react";
import { sendTestNotification } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { User } from "@/lib/api";
import styles from "./notification-modal.module.css";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function NotificationModal({ isOpen, onClose, user }: NotificationModalProps) {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  
  const [title, setTitle] = useState("Test Notification");
  const [body, setBody] = useState("This is a push notification from the admin panel.");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    if (!title.trim() || !body.trim()) {
      setFieldError("Title and body are required.");
      return;
    }
    if (!authUser?.token) {
      setFieldError("Not authenticated.");
      return;
    }

    setLoading(true);
    const res = await sendTestNotification(user.id, title, body, authUser.token);
    setLoading(false);

    if (res.success) {
      showToast(`Notification sent to ${user.name}!`, "success");
      onClose();
    } else {
      setFieldError(res.error || "Failed to send notification.");
    }
  };

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
            <Bell size={20} />
          </div>
          <div>
            <h2 className={styles.title}>Send Push Notification</h2>
            <p className={styles.subtitle}>To: {user.name} ({user.email})</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="notif-title">Title</label>
            <input
              id="notif-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="notif-body">Body</label>
            <textarea
              id="notif-body"
              className="form-input"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ resize: "vertical" }}
            />
          </div>

          {fieldError && <div className={styles.errorBox}>{fieldError}</div>}

          <div className={styles.actions}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !title || !body}>
              {loading ? <span className="spinner" /> : <Send size={15} />}
              {loading ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
