"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getReportDashboard,
  getReportDocuments,
  deleteReportDocument,
  type ReportDashboard,
  type ReportDocumentItem,
  type ReportDocumentsResponse,
} from "@/lib/api";
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
  Coins,
  FileText,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  FileCheck2,
  AlertTriangle
} from "lucide-react";
import styles from "./page.module.css";
import EditInvoiceModal from "./EditInvoiceModal";
import ConfirmDialog from "@/components/confirm-dialog/ConfirmDialog";

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Card } from "@/components/ui/Card/Card";

export default function ReportsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Set default dates: first day of current month to today
  const today = useMemo(() => new Date(), []);
  const firstDay = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  
  const [fromDate, setFromDate] = useState(firstDay.toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(today.toISOString().split("T")[0]);
  const [currency, setCurrency] = useState("AOA");
  
  const [report, setReport] = useState<ReportDashboard | null>(null);
  const [reportDocuments, setReportDocuments] = useState<ReportDocumentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<"sales" | "costs" | null>(null);

  // Document table controls & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "counted" | "excluded" | "processing">("all");
  const [docTypeFilter, setDocTypeFilter] = useState("all");

  // Edit Invoice Modal state
  const [editingDoc, setEditingDoc] = useState<ReportDocumentItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Delete Document Confirm state
  const [deletingDoc, setDeletingDoc] = useState<ReportDocumentItem | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  /**
   * Fetches the report data in sequence:
   * 1. First, call Dashboard API (/api/reports/dashboard) -> loads financial performance & tax assessment
   * 2. Then, call Report Documents API (/api/reports/documents) -> loads uploaded documents & extraction audit
   */
  const fetchReport = async () => {
    if (!user?.token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: First API call — Dashboard (shows all users / company aggregate history for period)
      const dashboardRes = await getReportDashboard(user.token, {
        from: fromDate || undefined,
        to: toDate || undefined,
        currency: currency || "AOA",
      });

      if (dashboardRes.success && dashboardRes.data) {
        setReport(dashboardRes.data);
      } else {
        setError(typeof dashboardRes.error === "string" ? dashboardRes.error : "Failed to load report dashboard.");
      }

      // Step 2: Then API call — Report Documents for the same period
      setDocsLoading(true);
      const docsRes = await getReportDocuments(user.token, {
        from: fromDate || undefined,
        to: toDate || undefined,
      });

      if (docsRes.success && docsRes.data) {
        setReportDocuments(docsRes.data);
      } else {
        console.warn("Report documents fetch returned:", docsRes.error);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while generating the report.");
    } finally {
      setLoading(false);
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchReport();
    }
  }, [user?.token]);

  // Handle document deletion
  const handleDeleteConfirm = async () => {
    if (!user?.token || !deletingDoc?.document_id) return;
    try {
      const res = await deleteReportDocument(user.token, deletingDoc.document_id);
      if (res.success) {
        showToast("Document deleted and reports recalculated successfully", "success");
        setIsDeleteConfirmOpen(false);
        setDeletingDoc(null);
        // Refresh both dashboard & documents
        fetchReport();
      } else {
        showToast(res.error || "Failed to delete document", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error deleting document", "error");
    }
  };

  // Filtered documents list for the UI
  const filteredDocuments = useMemo(() => {
    if (!reportDocuments?.rows) return [];
    return reportDocuments.rows.filter((doc) => {
      // Status tab
      if (statusTab === "counted" && doc.status !== "counted") return false;
      if (statusTab === "processing" && doc.status !== "processing") return false;
      if (statusTab === "excluded" && (doc.status === "counted" || doc.status === "processing")) return false;

      // Doc type filter
      if (docTypeFilter !== "all" && doc.doc_type?.toLowerCase() !== docTypeFilter.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = doc.file_name?.toLowerCase().includes(q);
        const matchCounterparty = (doc.counterparty_name || doc.counterparty || "").toLowerCase().includes(q);
        const matchNif = (doc.counterparty_nif || "").toLowerCase().includes(q);
        const matchInvoice = (doc.invoice_number || "").toLowerCase().includes(q);
        if (!matchName && !matchCounterparty && !matchNif && !matchInvoice) return false;
      }

      return true;
    });
  }, [reportDocuments, statusTab, docTypeFilter, searchQuery]);

  // Document counts for tabs
  const tabCounts = useMemo(() => {
    if (!reportDocuments?.rows) return { all: 0, counted: 0, excluded: 0, processing: 0 };
    const all = reportDocuments.rows.length;
    let counted = 0;
    let processing = 0;
    let excluded = 0;

    for (const r of reportDocuments.rows) {
      if (r.status === "counted") counted++;
      else if (r.status === "processing") processing++;
      else excluded++;
    }

    return { all, counted, excluded, processing };
  }, [reportDocuments]);

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

          {/* ── SECTION 4: Report Documents (Linked API) ── */}
          <div className={styles.documentsSection}>
            <div className={styles.sectionTitle}>
              <h2>
                <FileText size={20} style={{ color: "#8b5cf6" }} />
                Report Documents & Extraction Status
              </h2>
              <span className={styles.sectionSubtitle}>
                {reportDocuments ? (
                  <>
                    <strong style={{ color: "#059669" }}>{reportDocuments.counted}</strong> counted in calculations · {reportDocuments.rows.length} total in period
                  </>
                ) : docsLoading ? (
                  "Retrieving report documents..."
                ) : (
                  "Document audit trail"
                )}
              </span>
            </div>

            <div className={styles.docsCard}>
              {/* Controls bar */}
              <div className={styles.docsControls}>
                {/* Status Tabs */}
                <div className={styles.docsFilterTabs}>
                  <button
                    className={`${styles.docsTab} ${statusTab === "all" ? styles.docsTabActive : ""}`}
                    onClick={() => setStatusTab("all")}
                  >
                    All <span className={styles.tabCount}>{tabCounts.all}</span>
                  </button>
                  <button
                    className={`${styles.docsTab} ${statusTab === "counted" ? styles.docsTabActive : ""}`}
                    onClick={() => setStatusTab("counted")}
                  >
                    Counted <span className={styles.tabCount}>{tabCounts.counted}</span>
                  </button>
                  <button
                    className={`${styles.docsTab} ${statusTab === "excluded" ? styles.docsTabActive : ""}`}
                    onClick={() => setStatusTab("excluded")}
                  >
                    Excluded <span className={styles.tabCount}>{tabCounts.excluded}</span>
                  </button>
                  <button
                    className={`${styles.docsTab} ${statusTab === "processing" ? styles.docsTabActive : ""}`}
                    onClick={() => setStatusTab("processing")}
                  >
                    Processing <span className={styles.tabCount}>{tabCounts.processing}</span>
                  </button>
                </div>

                {/* Search & Type filter */}
                <div className={styles.docsSearchAndFilter}>
                  <div className={styles.searchWrap}>
                    <Search size={14} className={styles.searchIcon} />
                    <input
                      type="text"
                      className={styles.searchInput}
                      placeholder="Search document, supplier, NIF..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <select
                    className={styles.typeSelect}
                    value={docTypeFilter}
                    onChange={(e) => setDocTypeFilter(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="invoice">Invoices</option>
                    <option value="statement">Bank Statements</option>
                    <option value="receipt">Receipts</option>
                    <option value="slip">Payment Slips</option>
                  </select>
                </div>
              </div>

              {/* Table / List */}
              <div className={styles.tableContainer}>
                {docsLoading && !reportDocuments ? (
                  <div className={styles.emptyStateWrap}>
                    <div className={styles.spinner} style={{ width: 28, height: 28 }} />
                    <p>Loading documents for selected period...</p>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className={styles.emptyStateWrap}>
                    <FileCheck2 size={40} style={{ color: "#94a3b8" }} />
                    <h3>No documents found</h3>
                    <p>
                      {searchQuery || statusTab !== "all" || docTypeFilter !== "all"
                        ? "No documents match the selected filters or search query."
                        : "No documents recorded for this period. Upload invoices or bank statements in the Documents module to generate automated reports."}
                    </p>
                  </div>
                ) : (
                  <table className={styles.docsTable}>
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Counterparty & Flow</th>
                        <th>Dates & Ref</th>
                        <th>Total Amount</th>
                        <th>Status & Reason</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((doc) => {
                        const isInvoice = doc.doc_type?.toLowerCase() === "invoice";
                        return (
                          <tr key={doc.document_id} className={styles.docsTableRow}>
                            {/* Col 1: Document */}
                            <td>
                              <div className={styles.docInfoCol}>
                                <div className={styles.docFileIcon}>
                                  <FileText size={18} />
                                </div>
                                <div className={styles.docTextWrap}>
                                  <span className={styles.docFileName} title={doc.file_name}>
                                    {doc.file_name}
                                  </span>
                                  <div className={styles.docBadgeRow}>
                                    <span className={styles.typePill}>
                                      {doc.doc_type === "statement"
                                        ? "Bank Statement"
                                        : doc.doc_type === "invoice"
                                        ? "Invoice"
                                        : doc.doc_type === "receipt"
                                        ? "Receipt"
                                        : doc.doc_type === "slip"
                                        ? "Payment Slip"
                                        : doc.doc_type || "Document"}
                                    </span>
                                    {doc.source_page && (
                                      <span className={styles.pagePill}>p. {doc.source_page}</span>
                                    )}
                                    {doc.paid_in_cash && (
                                      <span
                                        className={styles.pagePill}
                                        style={{ background: "#fef3c7", color: "#92400e" }}
                                      >
                                        Cash
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Col 2: Counterparty & Flow */}
                            <td>
                              <div className={styles.counterpartyCol}>
                                <span className={styles.counterpartyTitle}>
                                  {doc.counterparty_name ||
                                    doc.counterparty ||
                                    (doc.doc_type === "statement" ? "Bank Statement" : "—")}
                                </span>
                                <div className={styles.metaSub}>
                                  {doc.counterparty_nif && (
                                    <span className={styles.nifTag}>NIF: {doc.counterparty_nif}</span>
                                  )}
                                  {doc.direction && (
                                    <span
                                      className={`${styles.directionTag} ${
                                        doc.direction === "sale"
                                          ? styles.directionSale
                                          : styles.directionPurchase
                                      }`}
                                    >
                                      {doc.direction === "sale" ? (
                                        <>
                                          <ArrowUpRight size={12} /> Sale
                                        </>
                                      ) : (
                                        <>
                                          <ArrowDownLeft size={12} /> Purchase
                                        </>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Col 3: Dates & Reference */}
                            <td>
                              <div className={styles.dateCol}>
                                {doc.invoice_number && (
                                  <span className={styles.invoiceNum}>#{doc.invoice_number}</span>
                                )}
                                {doc.issue_date && (
                                  <span className={styles.dateText}>
                                    Date: {doc.issue_date.split("T")[0]}
                                  </span>
                                )}
                                {doc.due_date && (
                                  <span className={styles.dateText}>
                                    Due: {doc.due_date.split("T")[0]}
                                  </span>
                                )}
                                {!doc.invoice_number && !doc.issue_date && !doc.due_date && (
                                  <span className={styles.dateText}>—</span>
                                )}
                              </div>
                            </td>

                            {/* Col 4: Amount & Taxes */}
                            <td>
                              <div className={styles.amountCol}>
                                {doc.statement_in || doc.statement_out ? (
                                  <>
                                    {doc.statement_in && (
                                      <span className={styles.flowIn}>+{doc.statement_in} Kz in</span>
                                    )}
                                    {doc.statement_out && (
                                      <span className={styles.flowOut}>-{doc.statement_out} Kz out</span>
                                    )}
                                  </>
                                ) : (
                                  <span className={styles.amountMain}>
                                    {doc.total ? `${doc.total} ${doc.currency || "Kz"}` : "0.00 Kz"}
                                  </span>
                                )}

                                {doc.tax_amount && Number(doc.tax_amount) > 0 && (
                                  <span className={styles.taxBreakdownSmall}>
                                    VAT: {doc.tax_amount}
                                  </span>
                                )}
                                {doc.retention_amount && Number(doc.retention_amount) > 0 && (
                                  <span className={styles.taxBreakdownSmall}>
                                    WHT: {doc.retention_amount}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Col 5: Status & Reason */}
                            <td>
                              <div className={styles.statusCol}>
                                {doc.status === "counted" ? (
                                  <span className={`${styles.statusBadge} ${styles.statusCounted}`}>
                                    <CheckCircle2 size={12} />
                                    Counted
                                  </span>
                                ) : doc.status === "processing" ? (
                                  <span className={`${styles.statusBadge} ${styles.statusProcessing}`}>
                                    <Clock size={12} />
                                    Processing
                                  </span>
                                ) : doc.status === "excluded_duplicate" ? (
                                  <span className={`${styles.statusBadge} ${styles.statusDuplicate}`}>
                                    <AlertTriangle size={12} />
                                    Duplicate
                                  </span>
                                ) : (
                                  <span className={`${styles.statusBadge} ${styles.statusExcluded}`}>
                                    {doc.status}
                                  </span>
                                )}

                                {doc.reason && (
                                  <span className={styles.reasonExplain}>{doc.reason}</span>
                                )}
                                {doc.warnings && doc.warnings.length > 0 && (
                                  <div className={styles.docBadgeRow}>
                                    {doc.warnings.map((w, idx) => (
                                      <span key={idx} className={styles.warningItem} title={w}>
                                        {w}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Col 6: Actions */}
                            <td className={styles.actionsCell}>
                              <div className={styles.actionsRow}>
                                {isInvoice && (
                                  <button
                                    className={styles.iconBtn}
                                    title="Edit extracted invoice fields"
                                    onClick={() => {
                                      setEditingDoc(doc);
                                      setIsEditModalOpen(true);
                                    }}
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                )}
                                <button
                                  className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                  title="Delete / archive document"
                                  onClick={() => {
                                    setDeletingDoc(doc);
                                    setIsDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* ── Edit Extracted Invoice Modal ── */}
      {user?.token && (
        <EditInvoiceModal
          isOpen={isEditModalOpen}
          document={editingDoc}
          authToken={user.token}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingDoc(null);
          }}
          onSuccess={() => {
            fetchReport();
          }}
        />
      )}

      {/* ── Confirm Delete Document Dialog ── */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete & Recalculate Report"
        message={
          deletingDoc
            ? `Are you sure you want to delete "${deletingDoc.file_name}"? The document will be removed and the financial report metrics will recalculate immediately.`
            : "Are you sure you want to delete this document?"
        }
        confirmLabel="Delete & Recalculate"
        variant="danger"
        icon="delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setDeletingDoc(null);
        }}
      />
    </div>
  );
}
