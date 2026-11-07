"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "../../lib/auth-client";
import styles from "../../app/login/login.module.css";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        rememberMe: true,
        callbackURL: "/auth/account-status",
      });

      if (result.error) {
        setErrorMessage("The email address or password is incorrect.");
        return;
      }

      router.replace("/auth/account-status");
      router.refresh();
    } catch {
      setErrorMessage("Sign-in is temporarily unavailable. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="sign-in-email">Email address</label>
        <input
          id="sign-in-email"
          className={styles.input}
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          maxLength={254}
          placeholder="name@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="sign-in-password">Password</label>
        <div className={styles.inputWrap}>
          <input
            id="sign-in-password"
            className={`${styles.input} ${styles.passwordInput}`}
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            minLength={8}
            maxLength={128}
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={isSubmitting}
          />
          <button
            className={styles.togglePassword}
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            disabled={isSubmitting}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className={styles.errorMessage} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        className={styles.submitButton}
        type="submit"
        disabled={isSubmitting || !email.trim() || !password}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
        {!isSubmitting ? <span aria-hidden="true">→</span> : null}
      </button>
    </form>
  );
}
