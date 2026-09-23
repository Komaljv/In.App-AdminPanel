"use client";

import { useEffect, useState, useMemo } from "react";
import { Check, X, CreditCard, Zap, Loader2, Building2 } from "lucide-react";
import { apiCall, getCompanies, getCompany } from "@/lib/api";
import { Company } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { isAdminUser, isSystemAdmin } from "@/lib/role-utils";
import { useToast } from "@/lib/toast-context";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Badge } from "@/components/ui/Badge/Badge";
import { Table, type Column } from "@/components/ui/Table/Table";
import { Card, CardHeader, CardBody } from "@/components/ui/Card/Card";

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
  usage?: Company['usage'];
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function UsageCell({ usage }: { usage?: Company['usage'] }) {
  const usersUsed = usage?.users?.used ?? 0;
  const usersMax = usage?.users?.max ?? 0;
  const usersPercentage = usage?.users?.percentage ?? 0;

  const storageUsed = usage?.storage?.usedStorageBytes ?? 0;
  const storageMax = usage?.storage?.maxBytes ?? 0;
  const storagePercentage = usage?.storage?.percentage ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
      {/* Users Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Users</span>
          <span>{usersUsed} / {usersMax === 0 ? '∞' : usersMax}</span>
        </div>
        <div style={{ height: '6px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            backgroundColor: usersPercentage > 90 ? 'var(--color-danger)' : usersPercentage > 75 ? 'var(--color-warning)' : 'var(--color-primary)', 
            width: `${Math.min(usersPercentage, 100)}%` 
          }} />
        </div>
      </div>

      {/* Storage Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Storage</span>
          <span>{formatBytes(storageUsed)} / {storageMax === 0 ? '∞' : formatBytes(storageMax)}</span>
        </div>
        <div style={{ height: '6px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            backgroundColor: storagePercentage > 90 ? 'var(--color-danger)' : storagePercentage > 75 ? 'var(--color-warning)' : 'var(--color-success)', 
            width: `${Math.min(storagePercentage, 100)}%` 
          }} />
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
  const { showToast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
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
    } catch (error) {
      console.error("Failed to load billing data", error);
      showToast("Failed to load billing data", "error");
    } finally {
      setLoading(false);
    }
  };

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

  const adminColumns = useMemo<Column<Company>[]>(() => [
    {
      key: "name",
      header: "Company",
      render: (c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={16} color="var(--color-primary)" />
          <span style={{ fontWeight: 500 }}>{c.name}</span>
        </div>
      )
    },
    {
      key: "plan",
      header: "Plan",
      render: (c) => c.subscriptionPlan ? <span style={{ fontWeight: 500 }}>{c.subscriptionPlan.name}</span> : <span style={{ color: 'var(--text-muted)' }}>Free / None</span>
    },
    {
      key: "status",
      header: "Status",
      render: (c) => c.subscriptionStatus ? (
        <Badge variant={c.subscriptionStatus === 'active' ? 'success' : 'warning'}>
          {c.subscriptionStatus.toUpperCase()}
        </Badge>
      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    {
      key: "limits",
      header: "Limits",
      render: (c) => c.subscriptionPlan ? (
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <div>Users: {c.subscriptionPlan.maxUsers ?? 'Unlimited'}</div>
          <div>Storage: {c.subscriptionPlan.maxStorage ? `${Math.round(Number(c.subscriptionPlan.maxStorage) / (1024*1024*1024))}GB` : 'Unlimited'}</div>
        </div>
      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    {
      key: "usage",
      header: "Usage",
      render: (c) => <UsageCell usage={c.usage} />
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

  const activePlanId = status?.plan?.id || status?.subscriptionPlanId;
  const currentStatus = status?.status || status?.subscriptionStatus;
  const isSubscribed = currentStatus === "active" || currentStatus === "trialing";

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className="text-page-title text-text-primary">Billing & Subscriptions</h1>
          <p className="text-text-secondary text-sm" style={{ marginTop: 'var(--space-1)' }}>Manage your plan and billing details.</p>
        </div>
         
        {status?.stripeCustomerId && status.stripeCustomerId !== '[null]' && (
          <Button 
            variant="outline"
            onClick={handleManageBilling}
            disabled={subscribingTo === "manage"}
            leftIcon={subscribingTo === "manage" ? <Loader2 className={styles.btnSpinner} size={16} /> : <CreditCard size={16} />}
          >
            Manage Billing
          </Button>
        )}
      </header>

      {currentStatus && currentStatus !== "null" && (
        <div className={`${styles.statusBanner} ${isSubscribed ? styles.statusActive : styles.statusInactive}`}>
          <div className={styles.statusInfo}>
            <span className={styles.statusDot}></span>
            <span className={styles.statusText}>
              Current Status: {status?.stripeCustomerId && status.stripeCustomerId !== '[null]' ? <strong>{currentStatus.toUpperCase()}</strong> : "No Active Plan"}
            </span>
          </div>
          {status.trialEndsAt && (
            <span className={styles.trialText}>
              Trial ends on {new Date(status.trialEndsAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {currentStatus && myCompany && (() => {
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
          <Card className="mb-8" style={{ marginBottom: '2rem' }}>
            <CardHeader title="Current Plan Usage" />
            <CardBody>
              <div style={{ maxWidth: '400px' }}>
                <UsageCell usage={calculatedUsage} />
              </div>
            </CardBody>
          </Card>
        );
      })()}

      {isAdminUser(user) && !isSystemAdmin(user) && (
        <div className={styles.plansGrid}>
          {plans.map((plan) => {
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
                  style={{ width: '100%' }}
                >
                  {subscribingTo === plan.stripePriceId ? (
                    <Loader2 className={styles.btnSpinner} size={18} />
                  ) : isActive ? (
                    "Subscribed"
                  ) : (
                    <>
                      <Zap size={16} /> Subscribe Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {isSystemAdmin(user) && (
        <div style={{ marginTop: '2rem' }}>
          <h2 className="text-section-heading mb-4">All Companies Billing Overview</h2>
          <Card padding="none">
            <Table
              columns={adminColumns}
              data={companies}
              emptyMessage="No companies found."
            />
          </Card>
        </div>
      )}
    </div>
  );
}
