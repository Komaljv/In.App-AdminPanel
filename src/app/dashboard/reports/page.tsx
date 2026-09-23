"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getReportSummary, type ReportSummary } from "@/lib/api";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Landmark, 
  Calculator, 
  RefreshCw,
  FileText
} from "lucide-react";
import styles from "./page.module.css";

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Card } from "@/components/ui/Card/Card";

export default function ReportsPage() {
  const { user } = useAuth();
  
  // Set default dates: first day of current month to today
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [fromDate, setFromDate] = useState(firstDay.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0]);
  const [currency, setCurrency] = useState("USD");
  
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    if (!user?.token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await getReportSummary(user.token, fromDate, toDate, currency);
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        setError(typeof res.error === "string" ? res.error : "Failed to load report summary.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchReport();
    }
  }, [user?.token]); // Fetch on initial load once token is ready

  const formatMoney = (val?: string) => {
    if (!val) return "0.00";
    return Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className={styles.page} style={{ padding: 'var(--space-8) 40px', maxWidth: 1400, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="text-page-title text-text-primary">Financial Reports</h1>
        <p className="text-text-secondary text-sm" style={{ marginTop: 'var(--space-1)' }}>AI-generated summary of your business performance.</p>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>From Date</label>
          <Input 
            type="date" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <label>To Date</label>
          <Input 
            type="date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Currency</label>
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-primary)',
              background: 'var(--color-bg)',
              outline: 'none',
              minWidth: '120px'
            }}
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="AOA">AOA (Kz)</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <Button 
            variant="primary"
            onClick={fetchReport} 
            disabled={loading}
            leftIcon={<RefreshCw size={16} className={loading ? styles.spin : ""} />}
          >
            Generate Report
          </Button>
        </div>
      </div>

      {error && (
        <div className={styles.errorState}>
          <strong>Error: </strong> {error}
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Analyzing financial documents...</p>
        </div>
      ) : report ? (
        <div className={styles.grid}>
          {/* Sales Card */}
          <Card className={styles.statCard} style={{ "--card-color": "#10b981", "--icon-bg": "#d1fae5" } as React.CSSProperties}>
            <div className={styles.statTop}>
              <h3 className={styles.statTitle}>Total Sales</h3>
              <div className={styles.statIcon}><TrendingUp size={20} /></div>
            </div>
            <div className={styles.statValue}>
              {formatMoney(report.sales.total)}
              <span className={styles.statCurrency}>{report.currency}</span>
            </div>
            <div className={styles.statMeta}>
              <FileText size={14} /> {report.sales.document_count} documents analyzed
            </div>
          </Card>

          {/* Cost Card */}
          <Card className={styles.statCard} style={{ "--card-color": "#ef4444", "--icon-bg": "#fee2e2" } as React.CSSProperties}>
            <div className={styles.statTop}>
              <h3 className={styles.statTitle}>Total Cost</h3>
              <div className={styles.statIcon}><TrendingDown size={20} /></div>
            </div>
            <div className={styles.statValue}>
              {formatMoney(report.cost.total)}
              <span className={styles.statCurrency}>{report.currency}</span>
            </div>
            <div className={styles.statMeta}>
              <FileText size={14} /> {report.cost.document_count} documents analyzed
            </div>
          </Card>

          {/* Profit Card */}
          <Card className={styles.statCard} style={{ "--card-color": "#3b82f6", "--icon-bg": "#dbeafe" } as React.CSSProperties}>
            <div className={styles.statTop}>
              <h3 className={styles.statTitle}>Net Profit</h3>
              <div className={styles.statIcon}><DollarSign size={20} /></div>
            </div>
            <div className={styles.statValue}>
              {formatMoney(report.profit)}
              <span className={styles.statCurrency}>{report.currency}</span>
            </div>
            <div className={styles.statMeta}>
              Based on sales minus costs
            </div>
          </Card>

          {/* VAT Card */}
          <Card className={styles.statCard} style={{ "--card-color": "#f59e0b", "--icon-bg": "#fef3c7", "gridRow": "span 2" } as React.CSSProperties}>
            <div className={styles.statTop}>
              <h3 className={styles.statTitle}>VAT Overview</h3>
              <div className={styles.statIcon}><Calculator size={20} /></div>
            </div>
            <div className={styles.statValue}>
              {formatMoney(report.vat.net_payable)}
              <span className={styles.statCurrency}>{report.currency}</span>
            </div>
            <div className={styles.statMeta}>
              Net VAT Payable
            </div>
            
            <div className={styles.vatBreakdown}>
              <div className={styles.vatRow}>
                <span className={styles.vatLabel}>VAT on Sales</span>
                <span className={styles.vatVal}>{formatMoney(report.vat.on_sales)}</span>
              </div>
              <div className={styles.vatRow}>
                <span className={styles.vatLabel}>VAT on Cost</span>
                <span className={styles.vatVal}>{formatMoney(report.vat.on_cost)}</span>
              </div>
              <div className={styles.vatRow}>
                <span className={styles.vatLabel}>Excluded Receipts</span>
                <span className={styles.vatVal}>{formatMoney(report.vat.on_cost_excluded_receipts)}</span>
              </div>
            </div>
          </Card>

          {/* Bank Card */}
          <Card className={styles.statCard} style={{ "--card-color": "#8b5cf6", "--icon-bg": "#ede9fe" } as React.CSSProperties}>
            <div className={styles.statTop}>
              <h3 className={styles.statTitle}>Bank Status</h3>
              <div className={styles.statIcon}><Landmark size={20} /></div>
            </div>
            <div className={styles.statValue}>
              {formatMoney(report.bank.balance || "0.00")}
              <span className={styles.statCurrency}>{report.currency}</span>
            </div>
            <div className={styles.statMeta}>
              <span style={{ color: "var(--color-success)", fontWeight: 500 }}>+{formatMoney(report.bank.received)}</span> IN &nbsp;|&nbsp;
              <span style={{ color: "var(--color-danger)", fontWeight: 500 }}>-{formatMoney(report.bank.paid)}</span> OUT
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
