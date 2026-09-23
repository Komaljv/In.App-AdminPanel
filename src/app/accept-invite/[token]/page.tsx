"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  Eye, EyeOff, CheckCircle, Shield, AlertCircle,
  Building2, Hash, User, Mail, Phone, Lock, Globe
} from "lucide-react";
import { acceptInvite, getInviteDetails } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import Link from "next/link";
import styles from "./page.module.css";

interface FormData {
  companyName: string;
  fiscalNumber: string;
  name:string;
  masterEmail: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  country: string;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = params.token as string;
  const urlCompanyName = searchParams.get("companyName") || "";
  const urlFiscalCode = searchParams.get("fiscalCode") || "";

  const [form, setForm] = useState<FormData>({
    companyName: urlCompanyName,
    fiscalNumber: urlFiscalCode,
    name: "",
    masterEmail: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    country: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);

  // Fetch invite details on mount to get invited email
  useEffect(() => {
    async function verify() {
      if (!token) return;
      const res = await getInviteDetails(token);
      if (res.success && res.data) {
        const data = res.data as any;
        setInviteData(data);
        // Auto-fill master email and company info from invite details
        setForm((f) => ({
          ...f,
          masterEmail: data.email || data.user?.email || f.masterEmail,
          companyName: data.companyName || urlCompanyName || f.companyName,
          fiscalNumber: data.fiscalCode || urlFiscalCode || f.fiscalNumber,
        }));
      } else {
        setError(res.error || "Invalid or expired invitation link.");
      }
      setVerifying(false);
    }
    verify();
  }, [token]);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError("");
  };

  const getStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(form.password);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#06b6d4", "#10b981"][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) { setError(" name is required."); return; }
    if (!form.masterEmail.trim()) { setError("Master email is required."); return; }
    
    if (form.phoneNumber) {
      const phoneClean = form.phoneNumber.replace(/[\s\-()]/g, "");
      if (!/^\+?[0-9]{7,15}$/.test(phoneClean)) {
        setError("Please enter a valid phone number (7-15 digits).");
        return;
      }
    }

    if (!form.password) { setError("Password is required."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (!form.country) { setError("Please select a country."); return; }

    setLoading(true);
    const res = await acceptInvite(token, form.password, {
      name: form.name,
      email: form.masterEmail,
      phoneNumber: form.phoneNumber,
      country: form.country,
      companyName: form.companyName,
      fiscalCode: form.fiscalNumber,
    });
    setLoading(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || "Failed to complete registration.");
    }
  };

  if (verifying) {
    return (
      <div className={styles.page}>
        <div className={styles.formSide}>
          <div className={styles.formWrapper}>
            <div className={styles.loadingState}>
              <span className="spinner" style={{ width: 36, height: 36 }} />
              <p>Verifying invitation...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.brandSide}>
          <div className={styles.brandContent}>
            <div className={styles.brandBadge}>
              <div className={styles.brandBadgeDot} />
              Setup Complete
            </div>
            <h1 className={styles.brandTitle}>
              <span>Account</span>
              Ready <em>Now</em>
            </h1>
            <p className={styles.brandSubtitle}>
              Your administrative access has been provisioned. You can now access all features.
            </p>
          </div>
        </div>

        <div className={styles.formSide}>
          <div className={styles.formWrapper}>
            <div className={styles.successState}>
              <div className={styles.successIcon}><CheckCircle size={44} /></div>
              <h1 className={styles.successTitle}>Account Created!</h1>
              <p className={styles.successText}>
                Welcome <strong>{form.name || form.masterEmail}</strong>! Your account has been set up successfully.
              </p>
              <div className={styles.loginHint}>
                You can now log in to access your account.
              </div>
              <Link href="/login" className="btn btn-primary" style={{ marginTop: "24px", width: "100%", textAlign: "center" }}>
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Logo badge — floating for mobile ── */}
      <div className={styles.logoBadge}>
        <img src="/brand/fred_logo.png" alt="Fred" style={{ objectFit: 'contain' }} />
      </div>

      {/* ── Brand Side (Left) ── */}
      <div className={styles.brandSide}>
        <div className={styles.brandContent}>
          <div className={styles.brandBadge}>
            <div className={styles.brandBadgeDot} />
            Secure Onboarding
          </div>
          <h1 className={styles.brandTitle}>
            <span>Join the</span>
            Fred <em>Team</em>
          </h1>
          <p className={styles.brandSubtitle}>
            Complete your registration to start managing your digital ecosystem with precision and ease.
          </p>
        </div>
      </div>

      {/* ── Form Side (Right) ── */}
      <div className={styles.formSide}>
       

        <div className={styles.formWrapper}>
          {/* Header */}
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <img src="/brand/FRED_ADM_logo.png" alt="Fred" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            {/* <div>
              <p className={styles.logoLabel}>Fred</p>
              <p className={styles.logoSub}>Accept Invitation</p>
            </div> */}
          </div>

          {/* Invited Banner */}
          {/* {(form.companyName || inviteData?.companyName) && (
            <div className={styles.inviteBanner}>
              <Building2 size={18} />
              <div>
                <p className={styles.inviteBannerText}>Invitation to join</p>
                <p className={styles.inviteBannerCompany}>{form.companyName || inviteData?.companyName}</p>
              </div>
            </div>
          )} */}

      
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Fill in your details to complete registration</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
            {/* Row 1: Company Name */}
            <div className={`${styles.fieldGroup} ${styles.readOnly}`} style={{ marginBottom: 0 }}>
              <div className={styles.fieldIcon}><Building2 size={18} /></div>
              <input
                id="company-name"
                type="text"
                className={styles.fieldInput}
                placeholder="Company name"
                value={form.companyName}
                readOnly
              />
            </div>

            {/* Row 2: VAT N° */}
            <div className={`${styles.fieldGroup} ${styles.readOnly}`} style={{ marginBottom: 0 }}>
              <div className={styles.fieldIcon}><Hash size={18} /></div>
              <input
                id="fiscal-number"
                type="text"
                className={styles.fieldInput}
                placeholder="VAT N°"
                value={form.fiscalNumber}
                readOnly
              />
            </div>

            {/* Row 3: Master Name */}
            <div className={styles.fieldGroup} style={{ marginBottom: 0 }}>
              <div className={styles.fieldIcon}><User size={18} /></div>
              <input
                id="master-name"
                type="text"
                className={styles.fieldInput}
                placeholder="Master name"
                value={form.name}
                onChange={set("name")}
                required
              />
            </div>

            {/* Row 4: Master Email (auto-filled, editable) */}
            <div className={`${styles.fieldGroup} ${styles.readOnly}`} style={{ marginBottom: 0 }}>
              <div className={styles.fieldIcon}><Mail size={18} /></div>
              <input
                id="master-email"
                type="email"
                className={styles.fieldInput}
                placeholder="Master email"
                value={form.masterEmail}
                readOnly
              />
            </div>

            {/* Row 6: Password */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className={styles.fieldGroup} style={{ marginBottom: 0 }}>
                <div className={styles.fieldIcon}><Lock size={18} /></div>
                <div style={{ flex: 1, position: "relative", display: 'flex' }}>
                  <input
                    id="new-password"
                    type={showPwd ? "text" : "password"}
                    className={styles.fieldInput}
                    placeholder="Password"
                    value={form.password}
                    onChange={set("password")}
                    style={{ paddingRight: 40, width: "100%" }}
                    required
                  />
                  <button type="button" className={styles.eyeInline} onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password strength */}
              {form.password && (
                <div className={styles.strengthBar} style={{ marginTop: '8px' }}>
                  <div className={styles.strengthTrack}>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={styles.strengthSegment}
                        style={{ background: i <= strength ? strengthColor : "#e8e8e8" }}
                      />
                    ))}
                  </div>
                  <span className={styles.strengthLabel} style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            {/* Row 7: Confirm Password */}
            <div className={styles.fieldGroup} style={{ marginBottom: 0 }}>
              <div className={styles.fieldIcon}><Lock size={18} /></div>
              <div style={{ flex: 1, position: "relative", display: 'flex' }}>
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  className={styles.fieldInput}
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  style={{ paddingRight: 40, width: "100%" }}
                  required
                />
                <button type="button" className={styles.eyeInline} onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Row 8: Location */}
            <div className={styles.fieldGroup} style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
              <div className={styles.fieldIcon}><Globe size={18} /></div>
              <select
                id="country"
                className={styles.fieldInput}
                value={form.country}
                onChange={set("country")}
                style={{ appearance: 'none', cursor: 'pointer' }}
              >
                <option value="" style={{ color: '#fff', backgroundColor: '#1e1e2d' }}>Select Location</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c} style={{ color: '#fff', backgroundColor: '#1e1e2d' }}>{c}</option>
                ))}
              </select>
            </div>
            </div>

            {/* Error */}
            {error && (
              <div className={styles.errorBox}>
                <AlertCircle size={18} /> {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
              id="complete-setup-btn"
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  Complete Setup
                  <CheckCircle size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
