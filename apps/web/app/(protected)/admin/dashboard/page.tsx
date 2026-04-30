import Link from "next/link";
import { ArrowUpRight, BarChart3, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Admin Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">System Management</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Overview and management tools for the Probayo system.
          </p>
        </div>
        <Link
          href="/admin/departments"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          Manage departments
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
              <Users className="h-3.5 w-3.5" />
              Users
            </div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage all system users.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
              Monitor employee accounts, roles, and access levels.
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
              <BarChart3 className="h-3.5 w-3.5" />
              Departments
            </div>
            <CardTitle>Department Control</CardTitle>
            <CardDescription>Create and organize organizational departments.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/departments"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              View departments
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
