"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { getReportDashboard, type ReportDashboard } from "@/lib/api";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calculator, 
  RefreshCw,
  Receipt,
  Scale,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Layers,
  FileSpreadsheet,
  Coins
} from "lucide-react";
import styles from "./page.module.css";

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Card } from "@/components/ui/Card/Card";

export default function ReportsPage() {
  const { user } = useAuth();
  
  // Set default dates: first day of current month to today
  const today = useMemo(() => new Date(), []);
  const firstDay = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  
  const [fromDate, setFromDate] = useState(firstDay.toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(today.toISOString().split("T")[0]);
  const [currency, setCurrency] = useState("AOA");
  
  const [report, setReport] = useState<ReportDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<"sales" | "costs" | null>(null);

  const fetchReport = async () => {
    if (!user?.token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await getReportDashboard(user.token, {
        from: fromDate || undefined,
        to: toDate || undefined,
        currency: currency || "AOA",
      });

      if (res.success && res.data) {
        setReport(res.data);
      } else {
        setError(typeof res.error === "string" ? res.error : "Failed to load report dashboard.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while generating the report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchReport();
    }
  }, [user?.token]);

  // Donut chart calculations
  const donutData = useMemo(() => {
    if (!report?.donut_chart) return null;
    const { sales, costs, formatted_sales, formatted_costs, profit, formatted_profit, formatted_result } = report.donut_chart;
    
    const validSales = Math.max(0, sales || 0);
    const validCosts = Math.max(0, costs || 0);
    const totalVolume = validSales + validCosts;
    
    const radius = 70;
    const circumference = 2 * Math.PI * radius; // ~439.82
    
    if (totalVolume === 0) {
      return {
        salesPercent: 0,
        costsPercent: 0,
        salesStroke: 0,
        costsStroke: 0,
        circumference,
        hasData: false,
        formatted_sales,
        formatted_costs,
        formatted_profit,
        formatted_result,
        isProfitable: profit >= 0,
      };
    }

    const salesRatio = validSales / totalVolume;
    const costsRatio = validCosts / totalVolume;

    return {
      salesPercent: Math.round(salesRatio * 100),
      costsPercent: Math.round(costsRatio * 100),
      salesStroke: salesRatio * circumference,
      costsStroke: costsRatio * circumference,
      circumference,
      hasData: true,
      formatted_sales,
      formatted_costs,
      formatted_profit,
      formatted_result,
      isProfitable: profit >= 0,
    };
  }, [report]);

  return (
    <div className={styles.page}>
      {/* ── Page Header ── */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Financial Reports</h1>
          <p>AI-generated financial dashboard: revenue analysis, operational cost breakdown, and assessed tax obligations.</p>
        </div>

        {report && (
          <div className={styles.headerMeta}>
            {report.period?.month && (
              <span className={`${styles.pillBadge} ${styles.pillBadgePrimary}`}>
                <Calendar size={14} />
                {report.period.month}
              </span>
            )}
            <span className={styles.pillBadge}>
              <Coins size={14} />
              Currency: {report.currency_code || report.currency}
            </span>
          </div>
        )}
      </div>

      {/* ── Filters Bar ── */}
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
            className={styles.selectInput}
          >
            <option value="AOA">AOA (Kz)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>

        <div className={styles.filterAction}>
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

      {/* ── Error Banner ── */}
      {error && (
        <div className={styles.errorState}>
          <AlertCircle size={20} />
          <div>
            <strong>Error: </strong> {error}
          </div>
        </div>
      )}

      {/* ── Loading Spinner ── */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Generating AI financial dashboard...</p>
        </div>
      ) : report ? (
        <>
          {/* ── SECTION 1: Financial Performance & Donut Chart ── */}
          <div className={styles.sectionTitle}>
            <h2>
              <Layers size={20} style={{ color: "#3b82f6" }} />
              Financial Performance
            </h2>
            <span className={styles.sectionSubtitle}>Donut distribution and core financial KPIs</span>
          </div>

          <div className={styles.overviewGrid}>
            {/* Donut Chart Card */}
            <div className={styles.donutCard}>
              <div className={styles.donutHeader}>
                <span className={styles.donutTitle}>Revenue vs Cost Ratio</span>
                <span className={styles.donutSubtitle}>Inflow / Outflow</span>
              </div>

              <div className={styles.chartContainer}>
                <svg className={styles.donutSvg} viewBox="0 0 180 180">
                  {/* Background Track */}
                  <circle
                    cx="90"
                    cy="90"
                    r="70"
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="18"
                  />

                  {donutData?.hasData ? (
                    <>
                      {/* Costs Arc */}
                      <circle
                        cx="90"
                        cy="90"
                        r="70"
                        fill="transparent"
                        stroke="#ef4444"
                        strokeWidth={hoveredSlice === "costs" ? 22 : 18}
                        strokeDasharray={`${donutData.costsStroke} ${donutData.circumference}`}
                        strokeDashoffset={-donutData.salesStroke}
                        className={styles.donutSlice}
                        onMouseEnter={() => setHoveredSlice("costs")}
                        onMouseLeave={() => setHoveredSlice(null)}
                      />

                      {/* Sales Arc */}
                      <circle
                        cx="90"
                        cy="90"
                        r="70"
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth={hoveredSlice === "sales" ? 22 : 18}
                        strokeDasharray={`${donutData.salesStroke} ${donutData.circumference}`}
                        strokeDashoffset={0}
                        className={styles.donutSlice}
                        onMouseEnter={() => setHoveredSlice("sales")}
                        onMouseLeave={() => setHoveredSlice(null)}
                      />
                    </>
                  ) : (
                    <circle
                      cx="90"
                      cy="90"
                      r="70"
                      fill="transparent"
                      stroke="#e2e8f0"
                      strokeWidth="18"
                    />
                  )}
                </svg>

                {/* Center of Donut */}
                <div className={styles.donutCenter}>
                  <span className={styles.centerLabel}>Net Profit</span>
                  <span className={styles.centerValue}>{report.donut_chart.formatted_profit}</span>
                  <span className={`${styles.centerBadge} ${donutData?.isProfitable ? styles.badgeProfit : styles.badgeLoss}`}>
                    {donutData?.isProfitable ? "Profitable" : "Deficit"}
                  </span>
                </div>
              </div>

              {/* Legend & Breakdown */}
              <div className={styles.donutLegend}>
                <div className={styles.legendItem}>
                  <div className={styles.legendKey}>
                    <span className={styles.legendDot} style={{ background: "#10b981" }} />
                    <span>Sales ({donutData?.salesPercent || 0}%)</span>
                  </div>
                  <span className={styles.legendVal}>{report.donut_chart.formatted_sales}</span>
                </div>

                <div className={styles.legendItem}>
                  <div className={styles.legendKey}>
                    <span className={styles.legendDot} style={{ background: "#ef4444" }} />
                    <span>Costs ({donutData?.costsPercent || 0}%)</span>
                  </div>
                  <span className={styles.legendVal}>{report.donut_chart.formatted_costs}</span>
                </div>
              </div>
            </div>

            {/* 4 Financial Key Metric Cards */}
            <div className={styles.metricsGrid}>
              {/* Total Sales */}
              <Card className={styles.metricCard}>
                <div className={styles.metricCardTop}>
                  <span className={styles.metricCardTitle}>Total Sales</span>
                  <div className={styles.metricIcon} style={{ background: "#ecfdf5", color: "#10b981" }}>
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div className={styles.metricValue}>{report.donut_chart.formatted_sales}</div>
                <div className={styles.metricMeta}>Gross revenue generated from customer invoices</div>
              </Card>

              {/* Total Cost */}
              <Card className={styles.metricCard}>
                <div className={styles.metricCardTop}>
                  <span className={styles.metricCardTitle}>Total Costs</span>
                  <div className={styles.metricIcon} style={{ background: "#fef2f2", color: "#ef4444" }}>
                    <TrendingDown size={20} />
                  </div>
                </div>
                <div className={styles.metricValue}>{report.donut_chart.formatted_costs}</div>
                <div className={styles.metricMeta}>Operational expenditures and supplier billings</div>
              </Card>

              {/* Result */}
              <Card className={styles.metricCard}>
                <div className={styles.metricCardTop}>
                  <span className={styles.metricCardTitle}>Operating Result</span>
                  <div className={styles.metricIcon} style={{ background: "#eff6ff", color: "#3b82f6" }}>
                    <Scale size={20} />
                  </div>
                </div>
                <div className={styles.metricValue}>{report.donut_chart.formatted_result}</div>
                <div className={styles.metricMeta}>Combined transaction activity balance</div>
              </Card>

              {/* Net Profit */}
              <Card className={styles.metricCard}>
                <div className={styles.metricCardTop}>
                  <span className={styles.metricCardTitle}>Net Profit</span>
                  <div className={styles.metricIcon} style={{ background: "#f0fdf4", color: "#059669" }}>
                    <DollarSign size={20} />
                  </div>
                </div>
                <div className={styles.metricValue}>{report.donut_chart.formatted_profit}</div>
                <div className={styles.metricMeta}>Final earnings after deducting operational costs</div>
              </Card>
            </div>
          </div>

          {/* ── SECTION 2: 4 Tax Assessment Cards ── */}
          <div className={styles.taxesSection}>
            <div className={styles.sectionTitle}>
              <h2>
                <Calculator size={20} style={{ color: "#f59e0b" }} />
                Tax Assessment
              </h2>
              <span className={styles.sectionSubtitle}>4 statutory tax assessments and withholding calculations</span>
            </div>

            <div className={styles.taxesGrid}>
              {/* VAT Card */}
              <Card className={styles.taxCard}>
                <div className={styles.taxCardHeader}>
                  <div className={styles.taxCardTitle}>
                    <Receipt size={18} style={{ color: "#f59e0b" }} />
                    {report.taxes.vat.title || "VAT"}
                  </div>
                  <span className={`${styles.taxPill} ${report.taxes.vat.is_payable ? styles.taxPillPayable : styles.taxPillCredit}`}>
                    {report.taxes.vat.is_payable ? "Payable" : "Credit"}
                  </span>
                </div>

                <div className={styles.taxAmount}>{report.taxes.vat.formatted_amount}</div>

                <div className={styles.taxBreakdown}>
                  <div className={styles.taxBreakdownRow}>
                    <span className={styles.taxBreakdownLabel}>VAT on Sales</span>
                    <span className={styles.taxBreakdownValue}>{report.taxes.vat.on_sales}</span>
                  </div>
                  <div className={styles.taxBreakdownRow}>
                    <span className={styles.taxBreakdownLabel}>VAT on Costs</span>
                    <span className={styles.taxBreakdownValue}>{report.taxes.vat.on_costs}</span>
                  </div>
                </div>
              </Card>

              {/* WHT Card */}
              <Card className={styles.taxCard}>
                <div className={styles.taxCardHeader}>
                  <div className={styles.taxCardTitle}>
                    <FileSpreadsheet size={18} style={{ color: "#8b5cf6" }} />
                    {report.taxes.wht.title || "WHT 6.5%"}
                  </div>
                  <span className={`${styles.taxPill} ${styles.taxPillPayable}`}>
                    {report.taxes.wht.subtitle || "Assessed"}
                  </span>
                </div>

                <div className={styles.taxAmount}>{report.taxes.wht.net_payable}</div>

                <div className={styles.taxBreakdown}>
                  <div className={styles.taxBreakdownRow}>
                    <span className={styles.taxBreakdownLabel}>Customer Deducted</span>
                    <span className={styles.taxBreakdownValue} style={{ color: "#10b981" }}>
                      {report.taxes.wht.customer_deducted}
                    </span>
                  </div>
                  <div className={styles.taxBreakdownRow}>
                    <span className={styles.taxBreakdownLabel}>Supplier Retained</span>
                    <span className={styles.taxBreakdownValue} style={{ color: "#ef4444" }}>
                      {report.taxes.wht.supplier_retained}
                    </span>
                  </div>
                </div>
              </Card>

              {/* IRT Card */}
              <Card className={styles.taxCard}>
                <div className={styles.taxCardHeader}>
                  <div className={styles.taxCardTitle}>
                    <ShieldCheck size={18} style={{ color: "#0ea5e9" }} />
                    {report.taxes.irt.title || "IRT"}
                  </div>
                  <span className={styles.taxPill}>
                    {report.taxes.irt.subtitle || "Assessed"}
                  </span>
                </div>

                <div className={styles.taxAmount}>{report.taxes.irt.formatted_amount}</div>

                <div className={styles.taxDescription}>
                  Personal income tax assessed on payroll, remuneration, and contractor disbursements.
                </div>
              </Card>

              {/* INSS Card */}
              <Card className={styles.taxCard}>
                <div className={styles.taxCardHeader}>
                  <div className={styles.taxCardTitle}>
                    <Coins size={18} style={{ color: "#6366f1" }} />
                    {report.taxes.inss.title || "INSS"}
                  </div>
                  <span className={styles.taxPill}>
                    {report.taxes.inss.subtitle || "Assessed"}
                  </span>
                </div>

                <div className={styles.taxAmount}>{report.taxes.inss.formatted_amount}</div>

                <div className={styles.taxDescription}>
                  Social security contributions assessed for employee welfare protection and retirement reserves.
                </div>
              </Card>
            </div>
          </div>

          {/* ── SECTION 3: Legal Note / Disclaimer ── */}
          {report.note && (
            <div className={styles.noteCard}>
              <AlertCircle size={18} className={styles.noteIcon} />
              <span>{report.note}</span>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
