"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { isApiError } from "@/lib/api/client";
import {
  updateUserProfile,
  type UpdateUserProfilePayload,
} from "@/lib/api/users";
import type { UserProfile } from "@/lib/types/auth";

type EditProfileModalProps = {
  open: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onUpdated: (profile: UserProfile) => void;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
};

function EditProfileModalInner({
  profile,
  onClose,
  onUpdated,
}: {
  profile: UserProfile | null;
  onClose: () => void;
  onUpdated: (profile: UserProfile) => void;
}) {
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (!profile) {
      setForm({ firstName: "", lastName: "", email: "" });
      return;
    }
    setForm({
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      email: profile.email ?? "",
    });
    setError(null);
  }, [profile]);

  const profilePayload = useMemo<UpdateUserProfilePayload>(() => {
    if (!profile) return {};
    const p: UpdateUserProfilePayload = {};
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if (firstName && firstName !== (profile.firstName ?? "")) p.firstName = firstName;
    if (lastName && lastName !== (profile.lastName ?? "")) p.lastName = lastName;
    return p;
  }, [form.firstName, form.lastName, profile]);

  const canSave = Object.keys(profilePayload).length > 0;

  const handleSave = async () => {
    if (!profile || !canSave) return;

    setIsSaving(true);
    setError(null);

    try {
      const updated = await updateUserProfile(profile.id, profilePayload);
      onUpdated(updated);
      push({
        title: "Profile updated",
        description: "Your changes were saved successfully.",
        variant: "success",
      });
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-3 my-6 w-full max-w-[90vw] sm:mx-4 sm:max-w-[640px]">
        <div className="flex max-h-[85vh] flex-col rounded-lg border border-white/10 bg-zinc-900 shadow-2xl">
          {/* ── Header ── */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <div>
              <h2 className="text-base font-medium text-white">Edit profile</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Update your account information.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-5">
              {error ? (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  <p className="text-sm text-rose-200">{error}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ep-first">First name</Label>
                  <Input
                    id="ep-first"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, firstName: e.target.value }))
                    }
                    placeholder="Enter first name"
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ep-last">Last name</Label>
                  <Input
                    id="ep-last"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, lastName: e.target.value }))
                    }
                    placeholder="Enter last name"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ep-email">Email</Label>
                <Input
                  id="ep-email"
                  type="email"
                  value={form.email}
                  placeholder="your@email.com"
                  disabled
                />
                <p className="text-xs text-zinc-500">
                  Email changes require administrator approval.
                </p>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-white/[0.06] px-5 py-3.5">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="h-8 rounded-lg border border-white/10 px-3 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !canSave}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50"
            >
              {isSaving ? <Loader className="h-3.5 w-3.5 animate-spin" /> : null}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditProfileModal({
  open,
  profile,
  onClose,
  onUpdated,
}: EditProfileModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <EditProfileModalInner
      profile={profile}
      onClose={onClose}
      onUpdated={onUpdated}
    />,
    document.body,
  );
}

export default EditProfileModal;
