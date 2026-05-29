"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  CircleUserRound,
  IdCard,
  Mail,
  Pencil,
  Shield,
} from "lucide-react";
import { fetchProfile } from "@/lib/api/auth";
import type { UserProfile } from "@/lib/types/auth";
import EditProfileModal from "@/components/profile/edit-profile-modal";

type ProfileState = {
  data: UserProfile | null;
  error: string | null;
  isLoading: boolean;
};

export default function DepartmentHeadProfilePage() {
  const [state, setState] = useState<ProfileState>({
    data: null,
    error: null,
    isLoading: true,
  });
  const [isEditing, setIsEditing] = useState(false);

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
          const message =
            error instanceof Error ? error.message : "Failed to load profile.";
          setState({ data: null, error: message, isLoading: false });
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Loading / Error / Empty ──

  if (state.isLoading) {
    return (
      <section className="flex h-full flex-col gap-3">
        <div className="flex shrink-0 items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="flex h-full items-center justify-center gap-2.5 text-sm text-zinc-500">Loading…</div>
        </div>
      </section>
    );
  }

  if (state.error) {
    return (
      <section className="flex h-full flex-col gap-3">
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <CircleUserRound className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-white">Profile</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
          {state.error}
        </div>
      </section>
    );
  }

  if (!state.data) {
    return (
      <section className="flex h-full flex-col gap-3">
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <CircleUserRound className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-white">Profile</h1>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">No profile data.</div>
        </div>
      </section>
    );
  }

  const profile = state.data;
  const displayName = profile.firstName
    ? `${profile.firstName} ${profile.lastName ?? ""}`.trim()
    : profile.email;

  return (
    <section className="flex h-full flex-col gap-3">
      {/* ── Compact header ── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <CircleUserRound className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">{displayName}</h1>
            <p className="text-xs text-zinc-500">Your account information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-300">
            {profile.role}
          </span>
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-100"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      </div>

      {/* ── Info grid ── */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="h-full overflow-auto">
          <div className="divide-y divide-white/5">
            {/* ID */}
            <InfoRow
              icon={<IdCard className="h-4 w-4 text-zinc-400" />}
              label="User ID"
              value={profile.id}
            />
            {/* Email */}
            <InfoRow
              icon={<Mail className="h-4 w-4 text-zinc-400" />}
              label="Email"
              value={profile.email}
            />
            {/* Role */}
            <InfoRow
              icon={<Shield className="h-4 w-4 text-zinc-400" />}
              label="Role"
              value={profile.role}
            />
            {/* Department */}
            {profile.departmentId && (
              <InfoRow
                icon={<Building2 className="h-4 w-4 text-zinc-400" />}
                label="Department ID"
                value={profile.departmentId}
              />
            )}
          </div>
        </div>
      </div>

      <EditProfileModal
        open={isEditing}
        profile={profile}
        onClose={() => setIsEditing(false)}
        onUpdated={(updated) =>
          setState((current) => ({ ...current, data: updated }))
        }
      />
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 bg-white/[0.02] px-4 py-3 transition hover:bg-white/[0.05]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-zinc-100">
          {value}
        </p>
      </div>
    </div>
  );
}
