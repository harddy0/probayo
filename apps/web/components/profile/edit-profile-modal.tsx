"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
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

const emptyFormState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
};

export function EditProfileModal({
  open,
  profile,
  onClose,
  onUpdated,
}: EditProfileModalProps) {
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (!open) return;
    if (!profile) {
      setFormState(emptyFormState);
      return;
    }

    setFormState({
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      email: profile.email ?? "",
    });
    setError(null);
  }, [open, profile]);

  const payload = useMemo<UpdateUserProfilePayload>(() => {
    if (!profile) return {};

    const nextPayload: UpdateUserProfilePayload = {};
    const firstName = formState.firstName.trim();
    const lastName = formState.lastName.trim();

    if (firstName && firstName !== (profile.firstName ?? "")) {
      nextPayload.firstName = firstName;
    }

    if (lastName && lastName !== (profile.lastName ?? "")) {
      nextPayload.lastName = lastName;
    }

    return nextPayload;
  }, [formState.firstName, formState.lastName, profile]);

  const hasChanges = Object.keys(payload).length > 0;

  const handleConfirm = async () => {
    if (!profile) return;

    if (!hasChanges) {
      setError("No changes to save.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updated = await updateUserProfile(profile.id, payload);
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
    <Modal
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Edit profile"
      description="Keep your name up to date. Email changes are managed by administrators."
      confirmLabel="Save changes"
      loading={isSaving}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
          Review your details before saving. Only your name can be edited here.
        </div>
        <div>
          <Label className="text-sm font-medium text-zinc-300">
            First name
          </Label>
          <Input
            value={formState.firstName}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                firstName: event.target.value,
              }))
            }
            placeholder="Enter your first name"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-zinc-300">Last name</Label>
          <Input
            value={formState.lastName}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                lastName: event.target.value,
              }))
            }
            placeholder="Enter your last name"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-zinc-300">Email</Label>
          <Input
            type="email"
            value={formState.email}
            placeholder="Enter your email"
            disabled
          />
          <p className="mt-2 text-xs text-zinc-500">
            Email updates require administrator approval.
          </p>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        {!hasChanges ? (
          <p className="text-xs text-zinc-500">
            Make a change to enable saving.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

export default EditProfileModal;
