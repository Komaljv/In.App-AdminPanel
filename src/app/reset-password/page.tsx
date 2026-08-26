"use client";

import { useState, Suspense } from "react";
import { Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { resetPassword } from "@/lib/api";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import styles from "../login/login.module.css"; // Reuse auth styles

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!token || !email) {
      setError("Invalid reset link. Missing token or email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPassword(email, token, password);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || "Failed to reset password. The link might be expired.");
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formWrapper}>
      <div className={styles.logoContainer}>
        <Image 
          src="/brand/fred_logo.png" 
          alt="Fred Administrativo" 
          width={260} 
          height={130} 
          className={styles.logo}
          priority
        />
      </div>

      <div className={styles.formHeader}>
        <h2 className={styles.formTitle}>Reset Password</h2>
        <p className={styles.formSubtitle}>Create a new password for your account</p>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          {error}
        </div>
      )}

      {success ? (
        <div className={styles.formWrapper} style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '24px', borderRadius: '16px', marginTop: '16px', boxShadow: 'none' }}>
          <p style={{ color: '#10b981', textAlign: 'center', fontWeight: '500', lineHeight: 1.5 }}>
            Your password has been successfully reset!
          </p>
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link href="/login" style={{ color: '#fff', textDecoration: 'underline' }}>
              Proceed to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.inputGroup}>
            <label className={styles.label}>New Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                className={styles.input}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPwd(!showPwd)}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Confirm Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="confirmPassword"
                type={showPwd ? "text" : "password"}
                className={styles.input}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
            style={{ marginTop: '32px' }}
          >
            {isSubmitting ? "RESETTING..." : "RESET PASSWORD"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className={styles.page}>
      <div className={styles.brandSide}>
        <div className={styles.brandContent}>
          <div className={styles.brandBadge}>
            <div className={styles.brandBadgeDot} />
            Secure Access
          </div>
          <h1 className={styles.brandTitle}>
            <span>Welcome to</span>
            Fred <em>Admin</em>
          </h1>
        </div>
      </div>

      <div className={styles.formSide}>
        <Suspense fallback={<div style={{ color: 'white' }}>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
