"use client";

import { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { forgotPassword } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import styles from "../login/login.module.css"; // Reuse auth styles

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await forgotPassword(email);
      if (res.success) {
        setSuccess("If an account with that email exists, we have sent a password reset link.");
      } else {
        setError(res.error || "Failed to send reset link. Please try again.");
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h2 className={styles.formTitle}>Forgot Password</h2>
            <p className={styles.formSubtitle}>Enter your email to receive a reset link</p>
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
                {success}
              </p>
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Link href="/login" style={{ color: '#fff', textDecoration: 'underline' }}>
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email</label>
                <div className={styles.inputWrapper}>
                  <Mail size={18} className={styles.inputIcon} />
                  <input
                    id="email"
                    type="email"
                    className={styles.input}
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
                style={{ marginTop: '16px' }}
              >
                {isSubmitting ? "SENDING LINK..." : "SEND RESET LINK"}
              </button>

              <div className={styles.formActions} style={{ justifyContent: 'center', marginTop: '24px' }}>
                <Link href="/login" className={styles.forgotLink} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowLeft size={16} />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
