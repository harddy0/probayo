"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { login } from "@/lib/api/auth";
import { getAuthSession } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRoleRedirect = (role?: string) => {
    const roleRedirects: Record<string, string> = {
      Admin: "/admin/dashboard",
      ItStaff: "/it-staff/dashboard",
      Employee: "/client/dashboard",
      DepartmentHead: "/department-head/dashboard",
    };

    return role ? roleRedirects[role] ?? "/client/dashboard" : "/client/dashboard";
  };

  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      router.replace(getRoleRedirect(session.identity.role));
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const summary = await login(email, password);

      // Clear sensitive form data immediately
      if (formRef.current) {
        formRef.current.reset();
      }

      router.push(getRoleRedirect(summary.identity.role));
    } catch {
      setError("Login failed. Check your credentials.");
      // Clear password field on error for security
      if (formRef.current) {
        const passwordInput = formRef.current.querySelector('input[name="password"]') as HTMLInputElement;
        if (passwordInput) passwordInput.value = "";
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <Card className="relative w-full max-w-5xl overflow-hidden border border-white/10 bg-white/5 shadow-[0_40px_150px_rgba(0,0,0,0.6)] backdrop-blur">
        <div className="grid md:grid-cols-[1.1fr_0.9fr]">
          {/* ── Left brand panel ── */}
          <div className="hidden flex-col justify-between border-r border-white/10 p-8 md:flex lg:p-10">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-base font-bold tracking-tight text-white">
                  P
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Probayo</p>
                  <p className="text-[11px] text-zinc-500">IT support platform</p>
                </div>
              </div>
            </div>

            <div className="max-w-sm">
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
                Welcome back to
                <br />
                your workspace.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              {`Sign in to manage tickets, track SLAs, and collaborate with your team across the organization.`}
              </p>

              <div className="mt-8 space-y-3">
                {[
                  { label: "Smart ticket routing", description: "Auto-assign based on skills and availability" },
                  { label: "Real-time SLA tracking", description: "Monitor response and resolution deadlines" },
                  { label: "Unified team workspace", description: "Collaborate across IT, admin, and departments" },
                ].map((feature) => (
                  <div key={feature.label} className="flex items-start gap-3">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-emerald-500/20 bg-emerald-500/10">
                      <svg
                        className="h-3 w-3 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{feature.label}</p>
                      <p className="text-xs text-zinc-500">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-zinc-600">
              Enterprise-grade IT management
            </div>
          </div>

          {/* ── Login form panel ── */}
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
            <CardHeader className="px-0 pt-0">
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500 md:hidden">
                Probayo
              </p>
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription className="text-sm">
                Enter your credentials to access the platform.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-0">
              <form
                ref={formRef}
                className="space-y-5"
                onSubmit={handleSubmit}
                method="post"
                autoComplete="off"
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      className="h-11 pl-11 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                      Password
                    </Label>
                    <button
                      type="button"
                      className="text-xs text-zinc-500 transition hover:text-zinc-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="h-11 pl-11 text-sm"
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
                      <svg
                        className="h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
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
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex-col items-start gap-3 px-0 pb-0 pt-4">
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <div className="h-px flex-1 bg-white/10" />
                <span>Secure enterprise login</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <p className="text-xs text-zinc-600">
                Need help?{" "}
                <button
                  type="button"
                  className="text-zinc-400 underline underline-offset-2 transition hover:text-zinc-200"
                >
                  Contact support
                </button>
              </p>
            </CardFooter>
          </div>
        </div>
      </Card>
    </main>
  );
}
