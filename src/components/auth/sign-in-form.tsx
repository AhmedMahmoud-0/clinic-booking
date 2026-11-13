"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";

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

  const fieldClass = "block min-h-[52px] w-full rounded-xl border border-[#D9E5E0] bg-white px-4 text-sm text-[#233B39] outline-none transition placeholder:text-[#9AA9A3] hover:border-[#B7CBC3] focus:border-[#176B67] focus:ring-4 focus:ring-[#176B67]/10 disabled:cursor-not-allowed disabled:bg-[#F6F8F7]";

  return (
    <form data-testid="sign-in-form" className="grid w-full gap-5" onSubmit={handleSubmit}>
      <div className="grid min-w-0 gap-2">
        <label htmlFor="sign-in-email" className="text-[0.82rem] font-bold text-[#344B46]">Email address</label>
        <input
          id="sign-in-email"
          className={fieldClass}
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
      <div className="grid min-w-0 gap-2">
        <label htmlFor="sign-in-password" className="text-[0.82rem] font-bold text-[#344B46]">Password</label>
        <div className="relative min-w-0">
          <input
            id="sign-in-password"
            className={`${fieldClass} pr-20`}
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
            className="absolute right-2 top-1/2 grid min-h-9 min-w-14 -translate-y-1/2 place-items-center rounded-lg px-2 text-xs font-bold text-[#657C74] transition hover:bg-[#EDF5F2] hover:text-[#176B67] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#176B67] disabled:opacity-50"
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
      {errorMessage ? <p className="m-0 rounded-xl border border-[#EFCBC7] bg-[#FFF7F6] px-4 py-3 text-sm leading-6 text-[#9D3029]" role="alert">{errorMessage}</p> : null}
      <button
        className="mt-1 inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#176B67] to-[#135B56] px-5 text-sm font-extrabold text-white shadow-[0_9px_20px_rgba(23,107,103,0.17)] transition hover:-translate-y-0.5 hover:shadow-[0_13px_24px_rgba(23,107,103,0.22)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#176B67] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting || !email.trim() || !password}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
        {!isSubmitting ? <span aria-hidden="true">→</span> : null}
      </button>
      <p className="m-0 text-center text-xs leading-5 text-[#87938E]">Secure access is limited to verified MERUNO accounts.</p>
    </form>
  );
}
