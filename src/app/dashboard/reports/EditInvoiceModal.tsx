"use client";

import { useState, useEffect } from "react";
import { X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { editExtractedInvoice, type ReportDocumentItem } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import styles from "./EditInvoiceModal.module.css";

interface EditInvoiceModalProps {
  isOpen: boolean;
  document: ReportDocumentItem | null;
  authToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditInvoiceModal({
  isOpen,
  document,
  authToken,
  onClose,
  onSuccess,
}: EditInvoiceModalProps) {
  const { showToast } = useToast();

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyNif, setCounterpartyNif] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [total, setTotal] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [retentionAmount, setRetentionAmount] = useState("");
  const [workerTax, setWorkerTax] = useState("");
  const [paidInCash, setPaidInCash] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      setInvoiceNumber(document.invoice_number || "");
      setCounterpartyName(document.counterparty_name || document.counterparty || "");
      setCounterpartyNif(document.counterparty_nif || "");
      setIssueDate(document.issue_date ? document.issue_date.split("T")[0] : "");
      setDueDate(document.due_date ? document.due_date.split("T")[0] : "");
      setTotal(document.total || "");
      setTaxAmount(document.tax_amount || "");
      setRetentionAmount(document.retention_amount || "");
      setWorkerTax(document.worker_tax || "");
      setPaidInCash(Boolean(document.paid_in_cash));
      setError(null);
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !document.document_id) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        invoice_number: invoiceNumber || undefined,
        counterparty_name: counterpartyName || undefined,
        counterparty_nif: counterpartyNif || undefined,
        issue_date: issueDate || undefined,
        due_date: dueDate || undefined,
        total: total || undefined,
        tax_amount: taxAmount || undefined,
        retention_amount: retentionAmount || undefined,
        worker_tax: workerTax || undefined,
        paid_in_cash: paidInCash,
      };

      const res = await editExtractedInvoice(authToken, document.document_id, payload);

      if (res.success) {
        showToast("Invoice fields updated and report recalculated successfully", "success");
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to update extracted invoice");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while saving invoice changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.iconCircle}>
              <FileText size={20} />
            </div>
            <div>
              <h2>Edit Extracted Invoice</h2>
              <p className={styles.docSubtitle}>{document.file_name}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Invoice Number</label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. FT 2026/001"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Total Amount ({document.currency || "AOA"})</label>
              <Input
                type="text"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Counterparty / Supplier Name</label>
              <Input
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                placeholder="Company or Person name"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Counterparty NIF</label>
              <Input
                value={counterpartyNif}
                onChange={(e) => setCounterpartyNif(e.target.value)}
                placeholder="e.g. 5412345678"
              />
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Issue Date</label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.grid3}>
            <div className={styles.formGroup}>
              <label>VAT / Tax Amount</label>
              <Input
                type="text"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Retention (WHT 6.5%)</label>
              <Input
                type="text"
                value={retentionAmount}
                onChange={(e) => setRetentionAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Worker Tax (IRT)</label>
              <Input
                type="text"
                value={workerTax}
                onChange={(e) => setWorkerTax(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={paidInCash}
                onChange={(e) => setPaidInCash(e.target.checked)}
                className={styles.checkboxInput}
              />
              <span>Paid in Cash</span>
            </label>
            <span className={styles.checkboxHint}>Indicates settlement took place outside bank transfers</span>
          </div>

          <div className={styles.actions}>
            <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={saving}
              leftIcon={<CheckCircle2 size={16} />}
            >
              {saving ? "Saving & Recalculating..." : "Save & Recalculate"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
