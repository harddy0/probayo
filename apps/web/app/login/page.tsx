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
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.16),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_28%),linear-gradient(135deg,_rgba(24,24,27,0.98),_rgba(9,9,11,1))]" />
      <div className="absolute left-8 top-10 h-32 w-32 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute right-14 top-24 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

      <Card className="relative w-full max-w-5xl overflow-hidden border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="grid md:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden flex-col justify-between border-r border-white/10 p-8 md:flex lg:p-10">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Protected access
            </div>

            <div className="max-w-md">
              <p className="mb-4 text-sm uppercase tracking-[0.35em] text-zinc-500">
                Probayo system
              </p>
              <h1 className="text-5xl font-semibold tracking-tight text-white">
                Sign in to the workspace.
              </h1>
              <p className="mt-5 text-base leading-7 text-zinc-400">
                A minimal control room for the protected area. Clean, quiet, and
                ready for shadcn-based forms.
              </p>
            </div>

            <div className="text-sm text-zinc-500">Built for internal use.</div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <CardHeader className="px-0 pt-0">
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500 md:hidden">
                Access
              </p>
              <CardTitle>Log in</CardTitle>
              <CardDescription>
                Use your account email and password to continue.
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
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="pl-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="pl-11"
                    />
                  </div>
                </div>

                {error ? (
                  <p className="text-sm text-rose-400">{error}</p>
                ) : null}

                <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in" : "Login"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-center px-0 pb-0 pt-2 text-xs text-zinc-500">
              Secure system login
            </CardFooter>
          </div>
        </div>
      </Card>
    </main>
  );
}
