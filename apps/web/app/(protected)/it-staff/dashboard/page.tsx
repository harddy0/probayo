"use client";

import { useEffect, useState } from "react";
import { getAuthSession } from "@/lib/api/client";
import { Activity, Server, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ItStaffDashboard() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const authSession = getAuthSession();
    setSession(authSession);
  }, []);

  return (
    <div className="px-4 py-8">
      <div className="mb-8">
        <h1 className="text-5xl font-bold">IT Staff Dashboard</h1>
        <p className="mt-2 text-zinc-400">Monitor and manage system operations</p>
      </div>

      {session && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Welcome back!</CardTitle>
            <CardDescription>{session.identity.email}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">System Status</p>
                <p className="mt-2 text-2xl font-bold">Operational</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Active Users</p>
                <p className="mt-2 text-2xl font-bold">247</p>
              </div>
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Server Load</p>
                <p className="mt-2 text-2xl font-bold">42%</p>
              </div>
              <Server className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Alerts</p>
                <p className="mt-2 text-2xl font-bold">3</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription className="mt-1">Common operational tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Button className="w-full justify-start bg-zinc-800 text-zinc-50 hover:bg-zinc-700">View System Logs</Button>
            <Button className="w-full justify-start bg-zinc-800 text-zinc-50 hover:bg-zinc-700">Manage User Accounts</Button>
            <Button className="w-full justify-start bg-zinc-800 text-zinc-50 hover:bg-zinc-700">Backup Database</Button>
            <Button className="w-full justify-start bg-zinc-800 text-zinc-50 hover:bg-zinc-700">Security Audit</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
