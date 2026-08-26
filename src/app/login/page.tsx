"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { login as apiLogin } from "@/lib/api";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import styles from "./login.module.css";

export default function LoginPage() {
  const { login: setAuth } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin@1234");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);

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
        router.replace("/dashboard");
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
                <input 
                  type="checkbox" 
                  className={styles.checkbox} 
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
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
