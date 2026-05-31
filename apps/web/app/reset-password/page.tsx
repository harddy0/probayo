"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, LockKeyhole } from "lucide-react";
import { confirmPasswordReset } from "@/lib/api/auth";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid or missing reset token. Please use the link from your email.");
      return;
    }

    if (!password) {
      setError("New password is required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordReset({ token, newPassword: password, confirmPassword });
      setIsSuccess(true);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to reset password. The link may have expired.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <>
        <CardHeader className="p-8 pb-0 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10">
            <LockKeyhole className="h-7 w-7 text-rose-400" />
          </div>
          <CardTitle className="text-xl">Invalid reset link</CardTitle>
          <CardDescription className="mt-2 text-sm leading-relaxed text-zinc-400">
            This password reset link is invalid or missing a token. Please request a new reset
            link.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center px-8 pb-8 pt-4">
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Request a new reset link
          </Link>
        </CardFooter>
      </>
    );
  }

  if (isSuccess) {
    return (
      <>
        <CardHeader className="p-8 pb-0 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <CardTitle className="text-xl">Password reset successful</CardTitle>
          <CardDescription className="mt-2 text-sm leading-relaxed text-zinc-400">
            Your password has been updated. You can now sign in with your new password.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center px-8 pb-8 pt-4">
          <Button
            className="h-11 gap-2 text-sm font-semibold"
            onClick={() => router.push("/login")}
          >
            Sign in with new password
          </Button>
        </CardFooter>
      </>
    );
  }

  return (
    <>
      <CardHeader className="p-8 pb-0">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-base font-bold tracking-tight text-white">
            P
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">Probayo</p>
            <p className="text-[11px] text-zinc-500">Reset password</p>
          </div>
        </div>
        <CardTitle className="text-xl">Set new password</CardTitle>
        <CardDescription className="text-sm text-zinc-400">
          Enter your new password below.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-8">
        <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
              New password
            </Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Enter new password"
                className="h-11 pl-11 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-zinc-300"
            >
              Confirm new password
            </Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                className="h-11 pl-11 text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <p className="text-sm text-rose-200">{error}</p>
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-11 w-full gap-2 text-sm font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Resetting password...
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="px-8 pb-8 pt-0">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </CardFooter>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-8 text-zinc-50 sm:px-6 sm:py-10">
      {/* ── Ambient background ── */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(255,255,255,0.12),_transparent_40%),radial-gradient(circle_at_70%_80%,_rgba(255,255,255,0.06),_transparent_30%),linear-gradient(135deg,_rgba(24,24,27,0.98),_rgba(9,9,11,1))]" />
      <div className="absolute left-12 top-16 h-48 w-48 rounded-full bg-white/[0.04] blur-[120px]" />
      <div className="absolute right-20 top-28 h-56 w-56 rounded-full bg-white/[0.03] blur-[140px]" />

      {/* ── Subtle grid overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <Card className="relative w-full max-w-md overflow-hidden border border-white/10 bg-white/5 shadow-[0_40px_150px_rgba(0,0,0,0.6)] backdrop-blur">
        <Suspense
          fallback={
            <CardContent className="flex items-center justify-center p-8">
              <svg className="h-6 w-6 animate-spin text-zinc-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </CardContent>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </Card>
    </main>
  );
}
