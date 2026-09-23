"use client";

import { useState, useEffect } from "react";
import { Save, User, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { updateProfile, getMe, getCompanies, createCustomPlan, type Company } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { COUNTRIES } from "@/lib/countries";
import styles from "./page.module.css";

// Unified Components
import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Card, CardHeader, CardBody } from "@/components/ui/Card/Card";

export default function SettingsPage() {
  const { user, login } = useAuth();
  const { showToast } = useToast();

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileCountry, setProfileCountry] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [stripePlanName, setStripePlanName] = useState("");
  const [stripePlanPrice, setStripePlanPrice] = useState("");
  const [stripePlanCurrency, setStripePlanCurrency] = useState("USD");
  const [stripePlanUsers, setStripePlanUsers] = useState("");
  const [stripePlanStorage, setStripePlanStorage] = useState("");
  const [stripePlanCompanyId, setStripePlanCompanyId] = useState("");
  const [isSavingStripePlan, setIsSavingStripePlan] = useState(false);
  
  const [companies, setCompanies] = useState<Company[]>([]);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfileEmail(user.email || "");
      setProfileCountry((user as any).country || "");
      
      // Load companies for the dropdown
      if (user.token) {
        getCompanies(user.token, 1, 100).then(res => {
          if (res.success && res.data) {
            const arr = Array.isArray(res.data) ? res.data : (res.data as any).items || (res.data as any).data || [];
            setCompanies(arr);
            if (arr.length > 0) {
              setStripePlanCompanyId(arr[0].id);
            }
          }
        });
      }
    }
  }, [user]);

  const handleSaveSettings = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const isFredAdmin = user?.role?.toUpperCase() === 'SYSTEMADMIN';

  const handleSaveProfile = async () => {
    if (!user?.token) return;
    setIsSavingProfile(true);
    const res = await updateProfile(user.token, {
      name: profileName,
      country: profileCountry,
      file: profileFile || undefined,
    });
    setIsSavingProfile(false);
    if (res.success) {
      showToast("Profile updated successfully", "success");
      const meRes = await getMe(user.token);
      if (meRes.success && meRes.data) {
        login(user.token, { ...user, ...meRes.data } as any);
      }
    } else {
      showToast(res.error || "Failed to update profile", "error");
    }
  };

  return (
    <div className={styles.page} style={{ padding: 'var(--space-8) 36px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="text-page-title text-text-primary">Settings</h1>
        <p className="text-text-secondary text-sm" style={{ marginTop: 'var(--space-1)' }}>Configure your admin panel preferences</p>
      </div>

      <div className={styles.grid}>
        {/* Profile Configuration */}
        <Card className={styles.section} padding="lg">
          <div className={styles.sectionHead}>
            <div className={styles.sectionIcon} style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
              <User size={18} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Profile Configuration</h2>
              <p className={styles.sectionDesc}>Update your personal account details</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
            <div className="form-group">
              <label className="text-label text-text-primary mb-1 block" htmlFor="profile-name">Full Name</label>
              <Input
                id="profile-name"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Admin"
              />
            </div>
            <div className="form-group">
              <label className="text-label text-text-primary mb-1 block" htmlFor="profile-email">Email Address</label>
              <Input
                id="profile-email"
                type="email"
                value={profileEmail}
                readOnly
                disabled
                placeholder="admin@example.com"
              />
            </div>
          
            <div className="form-group">
              <label className="text-label text-text-primary mb-1 block" htmlFor="profile-country">Country</label>
              <select
                id="profile-country"
                value={profileCountry}
                onChange={(e) => setProfileCountry(e.target.value)}
                style={{ 
                  cursor: "pointer",
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-base)',
                  color: 'var(--text-primary)',
                  background: 'var(--color-bg)',
                  outline: 'none',
                }}
              >
                <option value="">Select a country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-6)" }}>
            <Button 
              variant="primary" 
              onClick={handleSaveProfile} 
              disabled={isSavingProfile || !profileName.trim()}
              loading={isSavingProfile}
              leftIcon={<Save size={15} />}
            >
              Update Profile
            </Button>
          </div>
        </Card>

        {/* Stripe Plan Customization */}
        {isFredAdmin && (
        <Card className={styles.section} padding="lg">
          <div className={styles.sectionHead}>
            <div className={styles.sectionIcon} style={{ background: "rgba(99, 102, 241, 0.12)", color: "#6366f1" }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Stripe Plan Customization</h2>
              <p className={styles.sectionDesc}>Create or customize your company subscription plans</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
            <div className="form-group">
              <label className="text-label text-text-primary mb-1 block" htmlFor="plan-name">Plan Name</label>
              <Input
                id="plan-name"
                type="text"
                value={stripePlanName}
                onChange={(e) => setStripePlanName(e.target.value)}
                placeholder="e.g. Pro Plan"
              />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label className="text-label text-text-primary mb-1 block" htmlFor="plan-price">Price</label>
                <Input
                  id="plan-price"
                  type="number"
                  value={stripePlanPrice}
                  onChange={(e) => setStripePlanPrice(e.target.value)}
                  placeholder="e.g. 49"
                />
              </div>
              <div className="form-group">
                <label className="text-label text-text-primary mb-1 block" htmlFor="plan-currency">Currency</label>
                <select
                  id="plan-currency"
                  value={stripePlanCurrency}
                  onChange={(e) => setStripePlanCurrency(e.target.value)}
                  style={{ 
                    cursor: "pointer",
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-base)',
                    color: 'var(--text-primary)',
                    background: 'var(--color-bg)',
                    outline: 'none',
                  }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label className="text-label text-text-primary mb-1 block" htmlFor="plan-company">Target Company</label>
              <select
                id="plan-company"
                value={stripePlanCompanyId}
                onChange={(e) => setStripePlanCompanyId(e.target.value)}
                style={{ 
                  cursor: "pointer",
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-base)',
                  color: 'var(--text-primary)',
                  background: 'var(--color-bg)',
                  outline: 'none',
                }}
              >
                <option value="" disabled>Select a company</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label className="text-label text-text-primary mb-1 block" htmlFor="plan-users">Max Users</label>
                <Input
                  id="plan-users"
                  type="number"
                  value={stripePlanUsers}
                  onChange={(e) => setStripePlanUsers(e.target.value)}
                  placeholder="e.g. 10"
                />
              </div>
              <div className="form-group">
                <label className="text-label text-text-primary mb-1 block" htmlFor="plan-storage">Max Storage (MB)</label>
                <Input
                  id="plan-storage"
                  type="number"
                  value={stripePlanStorage}
                  onChange={(e) => setStripePlanStorage(e.target.value)}
                  placeholder="e.g. 51200"
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-6)" }}>
            <Button 
              variant="primary" 
              onClick={async () => {
                if (!stripePlanCompanyId || !user?.token) return;
                setIsSavingStripePlan(true);
                const res = await createCustomPlan(
                  stripePlanCompanyId,
                  {
                    name: stripePlanName,
                    price: parseFloat(stripePlanPrice) || 0,
                    maxUsers: parseInt(stripePlanUsers) || 0,
                    storage: parseInt(stripePlanStorage) || 0
                  },
                  user.token
                );
                setIsSavingStripePlan(false);
                if (res.success) {
                  showToast("Stripe plan customized successfully", "success");
                  setStripePlanName("");
                  setStripePlanPrice("");
                  setStripePlanUsers("");
                  setStripePlanStorage("");
                } else {
                  showToast(res.error || "Failed to create custom plan", "error");
                }
              }} 
              disabled={
                isSavingStripePlan || 
                !stripePlanCompanyId || 
                !stripePlanName.trim() || 
                !stripePlanPrice || isNaN(Number(stripePlanPrice)) ||
                !stripePlanUsers || isNaN(Number(stripePlanUsers)) ||
                !stripePlanStorage || isNaN(Number(stripePlanStorage))
              }
              loading={isSavingStripePlan}
              leftIcon={<Save size={15} />}
            >
              Save Plan
            </Button>
          </div>
        </Card>
        )}
      </div>
    </div>
  );
}
