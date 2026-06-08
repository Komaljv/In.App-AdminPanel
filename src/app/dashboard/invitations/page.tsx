"use client";

import { useState } from "react";
import { UserPlus, Clock, CheckCircle, XCircle, RefreshCw, Copy } from "lucide-react";
import InviteModal from "@/components/invite-modal/InviteModal";
import styles from "./page.module.css";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "expired";
  sentAt: string;
  token: string;
}

const MOCK_INVITATIONS: Invitation[] = [
  { id: "1", email: "sunilp.brainerhub@gmail.com", role: "Manager", status: "pending", sentAt: "May 5, 2026 · 10:30 AM", token: "60f89070beac670d48a14923" },
  { id: "2", email: "john.doe@acme.com", role: "Viewer", status: "accepted", sentAt: "May 4, 2026 · 3:15 PM", token: "a1b2c3d4e5f6789012345678" },
  { id: "3", email: "jane.smith@corp.com", role: "Editor", status: "pending", sentAt: "May 4, 2026 · 9:00 AM", token: "b2c3d4e5f6a7890123456789" },
  { id: "4", email: "mike.jones@biz.io", role: "Viewer", status: "expired", sentAt: "May 2, 2026 · 2:00 PM", token: "c3d4e5f6a7b8901234567890" },
  { id: "5", email: "sarah.k@startup.dev", role: "Manager", status: "accepted", sentAt: "May 1, 2026 · 11:45 AM", token: "d4e5f6a7b8c9012345678901" },
];

const STATUS_ICON = {
  pending: Clock,
  accepted: CheckCircle,
  expired: XCircle,
};

const STATUS_BADGE = {
  pending: "badge-warning",
  accepted: "badge-success",
  expired: "badge-muted",
};

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>(MOCK_INVITATIONS);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/accept-invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const counts = {
    pending: invitations.filter((i) => i.status === "pending").length,
    accepted: invitations.filter((i) => i.status === "accepted").length,
    expired: invitations.filter((i) => i.status === "expired").length,
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Invitations</h1>
          <p className={styles.subtitle}>Track and manage all user invitations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsInviteOpen(true)} id="invitations-invite-btn">
          <UserPlus size={16} />
          New Invite
        </button>
      </div>

      {/* Summary chips */}
      <div className={styles.summary}>
        <div className={`${styles.summaryChip} ${styles.chipPending}`}>
          <Clock size={14} />
          <span>{counts.pending} Pending</span>
        </div>
        <div className={`${styles.summaryChip} ${styles.chipAccepted}`}>
          <CheckCircle size={14} />
          <span>{counts.accepted} Accepted</span>
        </div>
        <div className={`${styles.summaryChip} ${styles.chipExpired}`}>
          <XCircle size={14} />
          <span>{counts.expired} Expired</span>
        </div>
      </div>

      {/* List */}
      <div className={styles.list}>
        {invitations.map((inv) => {
          const StatusIcon = STATUS_ICON[inv.status];
          return (
            <div key={inv.id} className={styles.inviteCard}>
              <div className={styles.cardLeft}>
                <div className={`${styles.statusDot} ${styles[inv.status]}`}>
                  <StatusIcon size={16} />
                </div>
                <div>
                  <p className={styles.email}>{inv.email}</p>
                  <p className={styles.meta}>
                    <span className="badge badge-info">{inv.role}</span>
                    <span className={styles.dot}>·</span>
                    <span>{inv.sentAt}</span>
                  </p>
                </div>
              </div>

              <div className={styles.cardRight}>
                <span className={`badge ${STATUS_BADGE[inv.status]}`}>{inv.status}</span>

                {inv.status === "pending" && (
                  <>
                    <button
                      className={styles.actionBtn}
                      onClick={() => copyLink(inv.token, inv.id)}
                      title="Copy invite link"
                      id={`copy-link-${inv.id}`}
                    >
                      {copiedId === inv.id ? (
                        <CheckCircle size={14} style={{ color: "#10b981" }} />
                      ) : (
                        <Copy size={14} />
                      )}
                      {copiedId === inv.id ? "Copied!" : "Copy Link"}
                    </button>
                    <button
                      className={styles.actionBtn}
                      title="Resend invite"
                      id={`resend-${inv.id}`}
                    >
                      <RefreshCw size={14} />
                      Resend
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />
    </div>
  );
}
