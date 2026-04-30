import Link from "next/link";
import { ArrowUpRight, Sparkles, UserRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Client workspace</h1>
          <p className="mt-2 text-sm text-zinc-400">
            A quiet control surface for your protected actions.
          </p>
        </div>
        <Link
          href="/client/profile"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          View profile
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
              <Sparkles className="h-3.5 w-3.5" />
              Status
            </div>
            <CardTitle>Authenticated</CardTitle>
            <CardDescription>Session is active and ready to use.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
              You can now access protected endpoints and account data.
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
              <UserRound className="h-3.5 w-3.5" />
              Account
            </div>
            <CardTitle>Profile overview</CardTitle>
            <CardDescription>Review your stored identity fields.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/client/profile"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Open profile
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
