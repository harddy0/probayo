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

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-6 py-10 text-zinc-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.16),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_28%),linear-gradient(135deg,_rgba(24,24,27,0.98),_rgba(9,9,11,1))]" />
      <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute right-16 top-24 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

      <Card className="relative w-full max-w-5xl overflow-hidden border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
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
              <form className="space-y-5">
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

                <Button type="submit" className="w-full gap-2">
                  Login
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
