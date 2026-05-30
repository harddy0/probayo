"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound, Loader, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { isApiError } from "@/lib/api/client";
import { updateUserProfile } from "@/lib/api/users";
import type { UpdateUserProfilePayload } from "@/lib/types/users";
import { changePassword } from "@/lib/api/auth";
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

type PasswordState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type Tab = "profile" | "password";

const PASSWORD_MIN_LENGTH = 8;

function EditProfileModalInner({
  profile,
  onClose,
  onUpdated,
}: {
  profile: UserProfile | null;
  onClose: () => void;
  onUpdated: (profile: UserProfile) => void;
}) {
  const [tab, setTab] = useState<Tab>("profile");
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState<PasswordState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
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

  // ── Profile tab ──────────────────────────────────────────────

  const profilePayload = useMemo<UpdateUserProfilePayload>(() => {
    if (!profile) return {};
    const p: UpdateUserProfilePayload = {};
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if (firstName && firstName !== (profile.firstName ?? "")) p.firstName = firstName;
    if (lastName && lastName !== (profile.lastName ?? "")) p.lastName = lastName;
    return p;
  }, [form.firstName, form.lastName, profile]);

  const canSaveProfile = Object.keys(profilePayload).length > 0;

  const handleSaveProfile = async () => {
    if (!profile || !canSaveProfile) return;

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

  // ── Password tab ─────────────────────────────────────────────

  const passwordErrors = useMemo<string[]>(() => {
    const errors: string[] = [];
    if (!passwordForm.currentPassword) errors.push("Current password is required.");
    if (!passwordForm.newPassword) errors.push("New password is required.");
    else if (passwordForm.newPassword.length < PASSWORD_MIN_LENGTH)
      errors.push(`New password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
    if (passwordForm.newPassword !== passwordForm.confirmPassword)
      errors.push("Passwords do not match.");
    return errors;
  }, [passwordForm]);

  const canSavePassword =
    passwordForm.currentPassword.length > 0 &&
    passwordForm.newPassword.length >= PASSWORD_MIN_LENGTH &&
    passwordForm.newPassword === passwordForm.confirmPassword;

  const handleChangePassword = async () => {
    if (!canSavePassword) return;

    setIsSaving(true);
    setError(null);

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      push({
        title: "Password changed",
        description: "Your password was updated successfully.",
        variant: "success",
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onClose();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to change password.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Shared ───────────────────────────────────────────────────

  const handleClose = () => {
    if (isSaving) return;
    setError(null);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setTab("profile");
    onClose();
  };

  const tabClass = (t: Tab) =>
    `flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
      tab === t
        ? "bg-white/10 text-white"
        : "text-zinc-400 hover:text-white hover:bg-white/5"
    }`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="mx-3 my-6 w-full max-w-[90vw] sm:mx-4 sm:max-w-[640px]">
        <div className="flex max-h-[85vh] flex-col rounded-lg border border-white/10 bg-zinc-900 shadow-2xl">
          {/* ── Header ── */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <div>
              <h2 className="text-base font-medium text-white">
                {tab === "profile" ? "Edit profile" : "Change password"}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {tab === "profile"
                  ? "Update your account information."
                  : "Update your account password."}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex shrink-0 gap-2 border-b border-white/[0.06] px-5 py-2.5">
            <button onClick={() => { setTab("profile"); setError(null); }} className={tabClass("profile")}>
              <User className="h-4 w-4" />
              Profile
            </button>
            <button onClick={() => { setTab("password"); setError(null); }} className={tabClass("password")}>
              <KeyRound className="h-4 w-4" />
              Password
            </button>
          </div>

          {/* ── Body ── */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {tab === "profile" && (
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
            )}

            {tab === "password" && (
              <div className="space-y-5">
                {error ? (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    <p className="text-sm text-rose-200">{error}</p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="ep-current-pw">Current password</Label>
                  <Input
                    id="ep-current-pw"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((p) => ({
                        ...p,
                        currentPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter current password"
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ep-new-pw">New password</Label>
                  <Input
                    id="ep-new-pw"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((p) => ({
                        ...p,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ep-confirm-pw">Confirm new password</Label>
                  <Input
                    id="ep-confirm-pw"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((p) => ({
                        ...p,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Re-enter new password"
                    disabled={isSaving}
                  />
                </div>

                {passwordErrors.length > 0 && passwordForm.newPassword && (
                  <ul className="space-y-1">
                    {passwordErrors.map((err, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-rose-300">
                        <div className="h-1 w-1 rounded-full bg-rose-400" />
                        {err}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-white/[0.06] px-5 py-3.5">
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="h-8 rounded-lg border border-white/10 px-3 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>

            {tab === "profile" && (
              <button
                onClick={handleSaveProfile}
                disabled={isSaving || !canSaveProfile}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {isSaving ? <Loader className="h-3.5 w-3.5 animate-spin" /> : null}
                Save changes
              </button>
            )}

            {tab === "password" && (
              <button
                onClick={handleChangePassword}
                disabled={isSaving || !canSavePassword}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {isSaving ? <Loader className="h-3.5 w-3.5 animate-spin" /> : null}
                Change password
              </button>
            )}
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
