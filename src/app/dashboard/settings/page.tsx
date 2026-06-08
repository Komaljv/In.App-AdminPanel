"use client";

import { useState } from "react";
import { Settings, Bell, Shield, Globe, Save, Key } from "lucide-react";
import styles from "./page.module.css";

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState("http://localhost:3000");
  const [notifyInvite, setNotifyInvite] = useState(true);
  const [notifyAccept, setNotifyAccept] = useState(true);
  const [inviteExpiry, setInviteExpiry] = useState("24");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Configure your admin panel preferences</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          id="settings-save-btn"
        >
          <Save size={15} />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className={styles.grid}>
        {/* API Configuration */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionIcon} style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>
              <Globe size={18} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>API Configuration</h2>
              <p className={styles.sectionDesc}>Base URL for backend API requests</p>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="api-url">API Base URL</label>
            <input
              id="api-url"
              type="url"
              className="form-input"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:3000"
            />
          </div>
          <div className={styles.hint}>
            Set <code>NEXT_PUBLIC_API_URL</code> in your <code>.env.local</code> to override.
          </div>
        </div>

        {/* Invite Settings */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionIcon} style={{ background: "rgba(6,182,212,0.12)", color: "#06b6d4" }}>
              <Key size={18} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Invite Settings</h2>
              <p className={styles.sectionDesc}>Control invitation behavior</p>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="invite-expiry">Invite Link Expiry (hours)</label>
            <select
              id="invite-expiry"
              className="form-input"
              value={inviteExpiry}
              onChange={(e) => setInviteExpiry(e.target.value)}
              style={{ cursor: "pointer" }}
            >
              <option value="12">12 hours</option>
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
              <option value="72">72 hours</option>
            </select>
          </div>
        </div>

        {/* Notifications */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionIcon} style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
              <Bell size={18} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Notifications</h2>
              <p className={styles.sectionDesc}>Choose what events trigger alerts</p>
            </div>
          </div>
          <div className={styles.toggleList}>
            <label className={styles.toggle}>
              <div>
                <p className={styles.toggleLabel}>Invite Sent</p>
                <p className={styles.toggleDesc}>Alert when an invitation is dispatched</p>
              </div>
              <button
                role="switch"
                aria-checked={notifyInvite}
                className={`${styles.toggleSwitch} ${notifyInvite ? styles.on : ""}`}
                onClick={() => setNotifyInvite(!notifyInvite)}
                id="toggle-notify-invite"
              />
            </label>
            <label className={styles.toggle}>
              <div>
                <p className={styles.toggleLabel}>Invite Accepted</p>
                <p className={styles.toggleDesc}>Alert when a user completes registration</p>
              </div>
              <button
                role="switch"
                aria-checked={notifyAccept}
                className={`${styles.toggleSwitch} ${notifyAccept ? styles.on : ""}`}
                onClick={() => setNotifyAccept(!notifyAccept)}
                id="toggle-notify-accept"
              />
            </label>
          </div>
        </div>

        {/* Security */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionIcon} style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
              <Shield size={18} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Security</h2>
              <p className={styles.sectionDesc}>Authorization token information</p>
            </div>
          </div>
          <div className={styles.tokenBox}>
            <p className={styles.tokenLabel}>Current Session Token (JWT)</p>
            <p className={styles.tokenValue}>Stored in localStorage · Expires per JWT exp claim</p>
          </div>
          <p className={styles.hint}>Tokens are never stored in cookies. All API calls use Bearer auth.</p>
        </div>
      </div>
    </div>
  );
}
