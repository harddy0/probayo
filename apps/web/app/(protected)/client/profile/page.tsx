"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, CircleUserRound, Mail, IdCard, Building2 } from "lucide-react";
import { fetchProfile } from "@/lib/api/auth";
import type { UserProfile } from "@/lib/types/auth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProfileState = {
  data: UserProfile | null;
  error: string | null;
  isLoading: boolean;
};

export default function ProfilePage() {
  const [state, setState] = useState<ProfileState>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const data = await fetchProfile();
        if (isMounted) {
          setState({ data, error: null, isLoading: false });
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : "Failed to load profile.";
          setState({ data: null, error: message, isLoading: false });
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.isLoading) {
    return <p className="text-sm text-zinc-400">Loading profile...</p>;
  }

  if (state.error) {
    return <p className="text-sm text-rose-400">{state.error}</p>;
  }

  if (!state.data) {
    return <p className="text-sm text-zinc-400">No profile data.</p>;
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
          <CircleUserRound className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Profile</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Authenticated user</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-white/10 bg-white/5 md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
              <BadgeCheck className="h-3.5 w-3.5" />
              Profile data
            </div>
            <CardTitle>{state.data.firstName || state.data.email}</CardTitle>
            <CardDescription>Basic account information from the backend.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-zinc-400">
              <IdCard className="h-4 w-4" />
              User ID
            </CardDescription>
            <CardTitle className="text-lg break-all">{state.data.id}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-zinc-400">
              <Mail className="h-4 w-4" />
              Email
            </CardDescription>
            <CardTitle className="text-lg break-all">{state.data.email}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-zinc-400">
              <BadgeCheck className="h-4 w-4" />
              Role
            </CardDescription>
            <CardTitle className="text-lg">{state.data.role}</CardTitle>
          </CardHeader>
        </Card>

        {state.data.departmentId ? (
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardDescription className="flex items-center gap-2 text-zinc-400">
                <Building2 className="h-4 w-4" />
                Department ID
              </CardDescription>
              <CardTitle className="text-lg break-all">{state.data.departmentId}</CardTitle>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
