"use client";

import { useState, useEffect } from "react";
import { X, Building2, Mail, Hash, AlertCircle, Info, Check } from "lucide-react";
import { updateCompany, type Company } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import styles from "./edit-company-modal.module.css";

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedCompany: Company) => void;
  company: Company | null;
}

export default function EditCompanyModal({
  isOpen,
  onClose,
  onSuccess,
  company,
}: EditCompanyModalProps) {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fiscalCode, setFiscalCode] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "PENDING" | "INACTIVE">("PENDING");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (company && isOpen) {
      setName(company.name || "");
      setEmail(company.email || "");
      setFiscalCode(company.fiscalCode || "");
      const validStatus = (["ACTIVE", "PENDING", "INACTIVE"].includes(company.status as any)
        ? company.status
        : "PENDING") as "ACTIVE" | "PENDING" | "INACTIVE";
      setStatus(validStatus);
      setError("");
    }
  }, [company, isOpen]);

  if (!isOpen || !company) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Company name is required.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Master email address is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    const trimmedFiscal = fiscalCode.trim();
    if (trimmedFiscal) {
      const vatClean = trimmedFiscal.replace(/[\s\-]/g, "");
      if (!/^[a-zA-Z0-9]{5,20}$/.test(vatClean) || !/[0-9]/.test(vatClean)) {
        setError("Please enter a valid VAT number containing numbers (5-20 characters).");
        return;
      }
    }

    if (!authUser?.token) {
      setError("Authentication session not found.");
      return;
    }

    setLoading(true);
    const res = await updateCompany(
      company.id,
      {
        name: trimmedName,
        email: trimmedEmail,
        fiscalCode: trimmedFiscal || undefined,
        status,
      },
      authUser.token
    );
    setLoading(false);

    if (res.success) {
      const updated: Company = {
        ...company,
        name: trimmedName,
        email: trimmedEmail,
        fiscalCode: trimmedFiscal || undefined,
        status,
        ...(res.data ? res.data : {}),
      };
      showToast("Company updated successfully", "success");
      onSuccess?.(updated);
      onClose();
    } else {
      setError(res.error || "Failed to update company");
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Building2 size={22} />
          </div>
          <div>
            <h2 className={styles.title}>Edit Company</h2>
            <p className={styles.subtitle}>Update details, master email, or status</p>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {company.status === "PENDING" && (
            <div className={styles.infoAlert}>
              <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <strong>Registration Pending:</strong> Updating the Master Email will reassign the primary
                admin account and generate a new invitation link for them.
              </span>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-company-name">
              Company Name <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <Input
              id="edit-company-name"
              type="text"
              placeholder="e.g. Acme Corporation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              leftIcon={<Building2 size={16} />}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-company-email">
              Email Master <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <Input
              id="edit-company-email"
              type="email"
              placeholder="e.g. admin@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              leftIcon={<Mail size={16} />}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-company-fiscal">
              VAT N° <span style={{ color: "var(--color-text-muted)" }}>(optional)</span>
            </label>
            <Input
              id="edit-company-fiscal"
              type="text"
              placeholder="e.g. IT123456789"
              value={fiscalCode}
              onChange={(e) => setFiscalCode(e.target.value)}
              disabled={loading}
              leftIcon={<Hash size={16} />}
            />
          </div>

          {/* <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-company-status">
              Status
            </label>
            <select
              id="edit-company-status"
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              disabled={loading}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING">PENDING</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div> */}

          <div className={styles.actions}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              leftIcon={<Check size={16} />}
              id="save-company-btn"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
