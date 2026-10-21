"use client";

import { Suspense, useState } from "react";
import { Mail, Lock, Eye, EyeOff, Info } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { login as apiLogin } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import styles from "./login.module.css";

function LoginForm() {
  const { login: setAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectUrl =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/dashboard";

  const [email, setEmail] = useState(redirectParam ? "" : "admin@gmail.com");
  const [password, setPassword] = useState(redirectParam ? "" : "admin@1234");
  const [showPwd, setShowPwd] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await apiLogin(email, password);
      if (res.success && res.data) {
        const { accessToken, refreshToken, user } = res.data as any;
        
        const normalizedUser = {
          ...user,
          refreshToken,
          role: typeof user.role === 'object' ? user.role.name : user.role
        };

        setAuth(accessToken, normalizedUser);
        router.replace(redirectUrl);
      } else {
        setError(res.error || "Invalid credentials");
      }
    } catch (err: any) {
      setError("An unexpected error occurred");
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
            <h2 className={styles.formTitle}>Sign In</h2>
            <p className={styles.formSubtitle}>Sign in to continue</p>
          </div>

          {redirectParam && redirectParam.startsWith("/share/") && (
            <div className={styles.noticeBox}>
              <Info size={18} style={{ flexShrink: 0 }} />
              <span>
                {searchParams.get("reason") === "unauthorized"
                  ? "This link was shared with a specific user. Please sign in with the authorized account."
                  : "Please sign in to view the shared content."}
              </span>
            </div>
          )}
       
          {error && (
            <div className={styles.errorBox}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              {error}
            </div>
          )}

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

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <div className={styles.inputWrapper}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  className={styles.input}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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

            <div className={styles.formActions}>
              <label className={styles.checkboxLabel}>
              </label>
              <Link href="/forgot-password" className={styles.forgotLink}>
                Forgot your password?
              </Link>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <LoginForm />
    </Suspense>
  );
}
