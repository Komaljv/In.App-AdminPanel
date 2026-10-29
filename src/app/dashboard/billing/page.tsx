"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Check,
  CreditCard,
  Zap,
  Loader2,
  Building2,
  Search,
  Download,
  ExternalLink,
  FileText,
  AlertTriangle,
  RotateCw,
  X,
  Receipt
} from "lucide-react";
import { apiCall, getCompanies, getCompany } from "@/lib/api";
import { Company } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { isAdminUser, isSystemAdmin } from "@/lib/role-utils";
import { useToast } from "@/lib/toast-context";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Badge, type BadgeVariant } from "@/components/ui/Badge/Badge";
import { Table, type Column } from "@/components/ui/Table/Table";
import { Card } from "@/components/ui/Card/Card";

interface Plan {
  id: string;
  name: string;
  stripePriceId: string | null;
  maxUsers: number | null;
  maxStorage: string | null;
  price: number | null;
  currency: string;
  interval: string;
}

interface SubscriptionStatus {
  subscriptionPlanId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  status?: string | null;
  plan?: {
    id: string | null;
    name: string;
    maxUsers: number | null;
    maxStorage: string | null;
  };
  usage?: Company["usage"];
}

export interface Invoice {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  paid: boolean;
  date: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  attemptCount?: number;
  nextPaymentAttempt?: string | null;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function UsageCell({ usage }: { usage?: Company["usage"] }) {
  const usersUsed = usage?.users?.used ?? 0;
  const usersMax = usage?.users?.max ?? 0;
  const usersPercentage = usage?.users?.percentage ?? 0;

  const storageUsed = usage?.storage?.usedStorageBytes ?? 0;
  const storageMax = usage?.storage?.maxBytes ?? 0;
  const storagePercentage = usage?.storage?.percentage ?? 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", width: "100%" }}>
      {/* Users Progress */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#4b5563", fontWeight: 500 }}>
          <span>Users</span>
          <span>{usersUsed} / {usersMax === 0 ? "Unlimited" : usersMax}</span>
        </div>
        <div style={{ height: "4px", backgroundColor: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              backgroundColor: "#7c3aed",
              width: `${Math.min(usersPercentage, 100)}%`,
              borderRadius: "4px"
            }}
          />
        </div>
      </div>

      {/* Storage Progress */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#4b5563", fontWeight: 500 }}>
          <span>Storage</span>
          <span>{formatBytes(storageUsed)} / {storageMax === 0 ? "Unlimited" : formatBytes(storageMax)}</span>
        </div>
        <div style={{ height: "4px", backgroundColor: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              backgroundColor: "#7c3aed",
              width: `${Math.min(storagePercentage, 100)}%`,
              borderRadius: "4px"
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [myCompany, setMyCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribingTo, setSubscribingTo] = useState<string | null>(null);

  // Invoices state for current company
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // System admin company invoices modal state
  const [selectedCompanyForInvoices, setSelectedCompanyForInvoices] = useState<Company | null>(null);
  const [companyInvoices, setCompanyInvoices] = useState<Invoice[]>([]);
  const [loadingCompanyInvoices, setLoadingCompanyInvoices] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { showToast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
      
      let status = "inactive";
      if (c.subscriptionStatus === "active" || c.subscriptionStatus === "trialing") {
        status = "active";
      }

      const matchStatus = statusFilter === "all" || status === statusFilter;
      
      return matchSearch && matchStatus;
    });
  }, [companies, search, statusFilter]);

  const loadInvoices = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoadingInvoices(true);
      const res = await apiCall<Invoice[]>("/api/billing/invoices", { method: "GET" }, user.token);
      if (res.success && Array.isArray(res.data)) {
        setInvoices(res.data);
      }
    } catch (err) {
      console.error("Failed to load invoices", err);
    } finally {
      setLoadingInvoices(false);
    }
  }, [user?.token]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [plansRes, statusRes, compRes, myCompanyRes] = await Promise.all([
        isAdminUser(user) && !isSystemAdmin(user)
          ? apiCall<Plan[]>("/api/billing/plans", { method: "GET" }, user?.token)
          : Promise.resolve({ success: true, data: [] }),
        !isSystemAdmin(user)
          ? apiCall<SubscriptionStatus>("/api/billing/subscription", { method: "GET" }, user?.token)
          : Promise.resolve({ success: true, data: null }),
        isSystemAdmin(user) && user?.token
          ? getCompanies(user.token, 1, 100)
          : Promise.resolve({ success: true, data: { items: [] } }),
        !isSystemAdmin(user) && user?.companyId && user?.token
          ? getCompany(user.companyId as string, user.token)
          : Promise.resolve({ success: true, data: null })
      ]);

      setPlans(plansRes.data || []);
      setStatus(statusRes.data || null);
      setMyCompany(myCompanyRes.data || null);

      if (isSystemAdmin(user) && compRes.success) {
        const compData = compRes.data as any;
        setCompanies(Array.isArray(compData) ? compData : compData.items || compData.data || []);
      }

      // Fetch company invoices if not system admin
      if (!isSystemAdmin(user) && user?.token) {
        loadInvoices();
      }
    } catch (error) {
      console.error("Failed to load billing data", error);
      showToast("Failed to load billing data", "error");
    } finally {
      setLoading(false);
    }
  }, [user, loadInvoices, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubscribe = async (priceId: string | null) => {
    if (!priceId) {
      showToast("This plan cannot be subscribed to directly.", "error");
      return;
    }

    try {
      setSubscribingTo(priceId);
      const successUrl = `${window.location.origin}/dashboard/billing?success=true`;
      const cancelUrl = `${window.location.origin}/dashboard/billing?canceled=true`;
      
      const res = await apiCall<any>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          priceId,
          successUrl,
          cancelUrl,
        })
      }, user?.token);

      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Failed to initiate checkout", error);
      showToast("Failed to start checkout process", "error");
    } finally {
      setSubscribingTo(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      setSubscribingTo("manage");
      const returnUrl = `${window.location.origin}/dashboard/billing`;
      const res = await apiCall<any>("/api/billing/portal", {
        method: "POST",
        body: JSON.stringify({ returnUrl })
      }, user?.token);
      
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error) {
      console.error("Failed to access billing portal", error);
      showToast("Failed to open billing portal", "error");
    } finally {
      setSubscribingTo(null);
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    if (invoice.invoicePdf) {
      window.open(invoice.invoicePdf, "_blank");
      return;
    }

    if (invoice.hostedInvoiceUrl) {
      window.open(invoice.hostedInvoiceUrl, "_blank");
      return;
    }

    try {
      const res = await apiCall<{ downloadUrl: string }>(
        `/api/billing/invoices/${invoice.id}/download`,
        { method: "GET", headers: { Accept: "application/json" } },
        user?.token
      );
      if (res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, "_blank");
      } else {
        showToast("Invoice file is not ready yet", "info");
      }
    } catch (err) {
      console.error("Failed to download invoice", err);
      showToast("Failed to download invoice", "error");
    }
  };

  const handleOpenCompanyInvoices = async (company: Company) => {
    setSelectedCompanyForInvoices(company);
    setLoadingCompanyInvoices(true);
    setCompanyInvoices([]);
    try {
      const res = await apiCall<Invoice[]>(
        `/api/billing/invoices?companyId=${company.id}`,
        { method: "GET" },
        user?.token
      );
      if (res.success && Array.isArray(res.data)) {
        setCompanyInvoices(res.data);
      }
    } catch (err) {
      console.error("Failed to load company invoices", err);
      showToast("Failed to load company invoices", "error");
    } finally {
      setLoadingCompanyInvoices(false);
    }
  };

  const invoiceColumns = useMemo<Column<Invoice>[]>(() => [
    {
      key: "number",
      header: "Invoice #",
      render: (inv) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={16} color="var(--color-primary, #7c3aed)" />
          <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
            {inv.number || inv.id.slice(0, 14)}
          </span>
        </div>
      )
    },
    {
      key: "date",
      header: "Invoice Date",
      render: (inv) => inv.date ? (
        <span style={{ color: "var(--text-secondary, #4b5563)" }}>
          {new Date(inv.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
        </span>
      ) : <span style={{ color: "var(--text-muted, #9ca3af)" }}>-</span>
    },
    {
      key: "period",
      header: "Billing Period",
      render: (inv) => inv.periodStart && inv.periodEnd ? (
        <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary, #4b5563)" }}>
          {new Date(inv.periodStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          {" - "}
          {new Date(inv.periodEnd).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ) : <span style={{ color: "var(--text-muted, #9ca3af)" }}>-</span>
    },
    {
      key: "amount",
      header: "Amount",
      render: (inv) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary, #111827)" }}>
          ${inv.amount.toFixed(2)} {inv.currency}
        </span>
      )
    },
    {
      key: "status",
      header: "Status",
      render: (inv) => {
        const s = (inv.status || (inv.paid ? "paid" : "open")).toLowerCase();
        let variant: BadgeVariant = "neutral";
        let label = s.toUpperCase();

        if (inv.paid || s === "paid") {
          variant = "success";
          label = "PAID";
        } else if (s === "past_due" || s === "uncollectible") {
          variant = "danger";
          label = s === "past_due" ? "PAST DUE" : "UNCOLLECTIBLE";
        } else if (s === "open") {
          variant = "warning";
          label = "OPEN";
        } else if (s === "draft") {
          variant = "info";
          label = "DRAFT";
        }

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <Badge variant={variant} dot>{label}</Badge>
            {inv.attemptCount && inv.attemptCount > 1 ? (
              <span style={{ fontSize: "0.7rem", color: "#dc2626", fontWeight: 500 }}>
                Retry #{inv.attemptCount}
              </span>
            ) : null}
          </div>
        );
      }
    },
    {
      key: "actions",
      header: "Actions",
      render: (inv) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadInvoice(inv)}
            leftIcon={<Download size={14} />}
          >
            Download PDF
          </Button>
          {inv.hostedInvoiceUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(inv.hostedInvoiceUrl!, "_blank")}
              leftIcon={<ExternalLink size={14} />}
            >
              Receipt
            </Button>
          )}
        </div>
      )
    }
  ], []);

  const adminColumns = useMemo<Column<Company>[]>(() => [
    {
      key: "name",
      header: "Company",
      render: (c) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Building2 size={16} color="var(--color-primary)" />
          <span style={{ fontWeight: 500 }}>{c.name}</span>
        </div>
      )
    },
    {
      key: "plan",
      header: "Plan",
      render: (c) => {
        const isSub = c.subscriptionStatus === "active" || c.subscriptionStatus === "trialing";
        if (!isSub) {
          return (
            <span style={{ color: "var(--text-muted)" }}>
              {c.subscriptionStatus === "canceled" && c.subscriptionPlan ? `${c.subscriptionPlan.name} (Canceled)` : "Free / None"}
            </span>
          );
        }
        return c.subscriptionPlan ? (
          <span style={{ fontWeight: 500 }}>{c.subscriptionPlan.name}</span>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>Free / None</span>
        );
      }
    },
    {
      key: "status",
      header: "Status",
      render: (c) => {
        const status = c.subscriptionStatus?.toLowerCase();
        let variant: BadgeVariant = "warning";
        if (status === "active") variant = "success";
        else if (status === "past_due" || status === "unpaid" || status === "canceled") variant = "danger";

        return c.subscriptionStatus ? (
          <Badge variant={variant}>
            {c.subscriptionStatus.toUpperCase()}
          </Badge>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>-</span>
        );
      }
    },
    {
      key: "usage",
      header: "Usage",
      render: (c) => {
        const isSub = c.subscriptionStatus === "active" || c.subscriptionStatus === "trialing";
        if (!isSub) {
          return <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No active plan</span>;
        }
        return <UsageCell usage={c.usage} />;
      }
    },
    {
      key: "actions",
      header: "Invoices",
      render: (c) => (
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Receipt size={14} />}
          onClick={() => handleOpenCompanyInvoices(c)}
        >
          View Invoices
        </Button>
      )
    }
  ], []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={40} />
        <p>Loading your billing details...</p>
      </div>
    );
  }

  const currentStatus = status?.status || status?.subscriptionStatus;
  const isSubscribed = currentStatus === "active" || currentStatus === "trialing";
  const isPastDue = currentStatus === "past_due";
  const activePlanId = isSubscribed ? (status?.plan?.id || status?.subscriptionPlanId) : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Billing & Subscriptions</h1>
          <p className={styles.subtitle}>Manage your plan, automated billing, and invoice history.</p>
        </div>
         
        {status?.stripeCustomerId && status.stripeCustomerId !== "[null]" && (
          <Button 
            variant="outline"
            onClick={handleManageBilling}
            disabled={subscribingTo === "manage"}
            leftIcon={subscribingTo === "manage" ? <Loader2 className={styles.btnSpinner} size={16} /> : <CreditCard size={16} />}
          >
            Manage Billing & Payment Methods
          </Button>
        )}
      </header>

      {/* Dunning Alert Banner when payment has failed / past due */}
      {isPastDue && (
        <div className={styles.dunningAlert}>
          <div className={styles.dunningContent}>
            <AlertTriangle className={styles.dunningIcon} size={24} />
            <div>
              <h4 className={styles.dunningTitle}>Payment Action Required (Past Due)</h4>
              <p className={styles.dunningMessage}>
                Your latest subscription payment failed. Stripe automated dunning is retrying the payment. To avoid service disruption or feature limits, please update your payment method or pay the outstanding invoice below.
              </p>
            </div>
          </div>
          <div className={styles.dunningActions}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleManageBilling}
              leftIcon={<CreditCard size={14} />}
            >
              Update Payment Method
            </Button>
          </div>
        </div>
      )}

      {currentStatus && currentStatus !== "null" && (
        <div className={`${styles.statusBanner} ${isSubscribed ? styles.statusActive : styles.statusInactive}`}>
          <div className={styles.statusInfo}>
            <span className={styles.statusDot}></span>
            <span className={styles.statusText}>
              Current Status: {status?.stripeCustomerId && status.stripeCustomerId !== "[null]" ? <strong>{currentStatus.toUpperCase()}</strong> : "No Active Plan"}
            </span>
          </div>
          {status?.trialEndsAt && (
            <span className={styles.trialText}>
              Trial ends on {new Date(status.trialEndsAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {isSubscribed && myCompany && (() => {
        const activePlan = plans.find((p) => p.id === activePlanId);
        
        const rawUsers = (myCompany as any).users || [];
        const nonAdminUsers = rawUsers.filter((u: any) => {
          const isCurrentAdminRole = user?.roleId && u.roleId === user.roleId;
          return !isCurrentAdminRole && !isAdminUser(u);
        });
        
        const usersUsed = nonAdminUsers.length;
        const usersMax = activePlan?.maxUsers ?? 0;
        const usersPercentage = usersMax > 0 ? (usersUsed / usersMax) * 100 : 0;
        
        const storageUsed = (myCompany as any).documents?.reduce((acc: number, doc: any) => acc + (doc.fileSize || doc.size || 0), 0) ?? 0;
        const storageMax = Number(activePlan?.maxStorage || 0);
        const storagePercentage = storageMax > 0 ? (storageUsed / storageMax) * 100 : 0;
        
        const calculatedUsage = {
          users: { used: usersUsed, max: usersMax, percentage: usersPercentage },
          storage: { usedStorageBytes: storageUsed, maxBytes: storageMax, percentage: storagePercentage }
        };
        
        return (
          <div style={{ marginBottom: "2rem", padding: "1.5rem", borderRadius: "12px", border: "1px solid #e5e7eb", background: "#fff", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "24px", color: "#111827" }}>Current Plan Usage</h3>
            <div style={{ width: "100%" }}>
              <UsageCell usage={calculatedUsage} />
            </div>
          </div>
        );  
      })()}

      {isAdminUser(user) && !isSystemAdmin(user) && (
        <>
          <div className={styles.plansGrid}>
            {plans
              .filter((plan) => plan.name !== "Big plan")
              .map((plan) => {
                const isActive = activePlanId === plan.id && isSubscribed;
                return (
                  <div key={plan.id} className={`${styles.planCard} ${isActive ? styles.activeCard : ""}`}>
                    {isActive && <div className={styles.activeBadge}>Current Plan</div>}
                    
                    <div className={styles.planHeader}>
                      <h3 className={styles.planName}>{plan.name}</h3>
                      <div className={styles.planPrice}>
                        <span className={styles.currency}>{plan.currency === "USD" ? "$" : plan.currency}</span>
                        <span className={styles.amount}>{plan.price || 0}</span>
                        <span className={styles.interval}>/{plan.interval}</span>
                      </div>
                    </div>

                    <div className={styles.planFeatures}>
                      <div className={styles.feature}>
                        <Check size={16} className={styles.checkIcon} />
                        <span>Up to <strong>{plan.maxUsers || "Unlimited"}</strong> users</span>
                      </div>
                      <div className={styles.feature}>
                        <Check size={16} className={styles.checkIcon} />
                        <span>
                          <strong>
                            {plan.maxStorage 
                              ? `${Math.round(Number(plan.maxStorage) / (1024 * 1024 * 1024))}GB` 
                              : "Unlimited"}
                          </strong> storage
                        </span>
                      </div>
                      <div className={styles.feature}>
                        <Check size={16} className={styles.checkIcon} />
                        <span>Premium Support</span>
                      </div>
                    </div>

                    <div className={styles.planFooter}>
                      <Button
                        variant={isActive ? "outline" : "primary"}
                        onClick={() => handleSubscribe(plan.stripePriceId)}
                        disabled={isSubscribed || !plan.stripePriceId || subscribingTo !== null}
                        fullWidth
                      >
                        {subscribingTo === plan.stripePriceId ? (
                          <Loader2 className={styles.btnSpinner} size={18} />
                        ) : isActive ? (
                          "Subscribed"
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Zap size={14} fill="currentColor" style={{ marginRight: "6px" }} /> SUBSCRIBE NOW
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Invoices and Billing History Section */}
          <div className={styles.invoicesSection}>
            <div className={styles.invoicesHeader}>
              <div>
                <h2 className={styles.invoicesTitle}>Invoices & Payment Receipts</h2>
                <p className={styles.invoicesSubtitle}>
                  View automated billing receipts and download PDF invoices for your records.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadInvoices}
                disabled={loadingInvoices}
                leftIcon={<RotateCw size={14} className={loadingInvoices ? styles.btnSpinner : undefined} />}
              >
                Refresh Invoices
              </Button>
            </div>

            <Table<Invoice>
              columns={invoiceColumns}
              data={invoices}
              loading={loadingInvoices}
              emptyMessage="No invoices generated yet. Invoices will automatically appear here once your plan is renewed."
            />
          </div>
        </>
      )}

      {isSystemAdmin(user) && (
        <div style={{ marginTop: "2rem" }}>
          <div className={styles.toolbar}>
            <div className={styles.searchWrapper}>
              <Input
                id="companies-search"
                type="text"
                leftIcon={<Search size={15} />}
                placeholder="Search by company name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className={styles.filters}>
              {["all", "active", "inactive"].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <Table
            columns={adminColumns}
            data={filteredCompanies}
            emptyMessage="No companies found."
          />
        </div>
      )}

      {/* System Admin Company Invoices Modal */}
      {selectedCompanyForInvoices && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCompanyForInvoices(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  Invoices: {selectedCompanyForInvoices.name}
                </h3>
                <p className={styles.modalSubtitle}>
                  Plan: {selectedCompanyForInvoices.subscriptionPlan?.name || "Free"} | Status: {selectedCompanyForInvoices.subscriptionStatus?.toUpperCase() || "INACTIVE"}
                </p>
              </div>
              <button
                className={styles.closeButton}
                onClick={() => setSelectedCompanyForInvoices(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <Table<Invoice>
                columns={invoiceColumns}
                data={companyInvoices}
                loading={loadingCompanyInvoices}
                emptyMessage="No invoices found for this company."
              />
            </div>

            <div className={styles.modalFooter}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCompanyForInvoices(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
