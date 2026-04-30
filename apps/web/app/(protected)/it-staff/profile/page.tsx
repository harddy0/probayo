"use client";

import { useEffect, useState } from "react";
import { fetchProfile } from "@/lib/api/auth";
import { Mail, User, Shield, Calendar, Loader } from "lucide-react";
import type { UserProfile } from "@/lib/types/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ItStaffProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const data = await fetchProfile();
        setProfile(data);
      } catch (err) {
        setError("Failed to load profile");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <Loader className="h-6 w-6 animate-spin text-zinc-400" />
          <p className="text-zinc-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <div className="mb-8">
        <h1 className="text-5xl font-bold">My Profile</h1>
        <p className="mt-2 text-zinc-400">Manage your account information</p>
      </div>

      {profile && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>
                    {profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : "IT Staff Member"}
                  </CardTitle>
                  <CardDescription className="mt-1">{profile.email}</CardDescription>
                </div>
                <div className="rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 p-1">
                  <div className="rounded-full bg-zinc-950 p-4">
                    <User className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardContent>
                <div className="flex items-start gap-4">
                  <Mail className="h-5 w-5 flex-shrink-0 text-blue-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Email</p>
                    <p className="mt-1 font-medium">{profile.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-start gap-4">
                  <Shield className="h-5 w-5 flex-shrink-0 text-purple-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Role</p>
                    <p className="mt-1 font-medium">{profile.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-start gap-4">
                  <User className="h-5 w-5 flex-shrink-0 text-green-400" />
                  <div>
                    <p className="text-sm text-zinc-400">User ID</p>
                    <p className="mt-1 font-medium font-mono text-xs">{profile.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-start gap-4">
                  <Calendar className="h-5 w-5 flex-shrink-0 text-amber-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Status</p>
                    <p className="mt-1 font-medium">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 flex gap-4">
            <Button className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700">Edit Profile</Button>
            <Button className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700">Change Password</Button>
          </div>
        </>
      )}
    </div>
  );
}
