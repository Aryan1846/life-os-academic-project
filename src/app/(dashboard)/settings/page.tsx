"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, User as UserIcon, Lock, AlertTriangle, Check } from "lucide-react";

interface ProfileData {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  role: string;
  privacy_settings: {
    share_goals: boolean;
    share_finance: boolean;
    share_health: boolean;
    share_career: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [privacy, setPrivacy] = useState({
    shareGoals: false,
    shareFinance: false,
    shareHealth: false,
    shareCareer: false,
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [privacyMessage, setPrivacyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Account deletion state
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function downloadExport() {
    setExporting(true); setExportError("");
    try {
      const response = await fetch("/api/profile/export", { cache: "no-store" });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error || "Export failed"); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `life-os-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : "Export failed"); }
    finally { setExporting(false); }
  }

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          setFullName(data.profile.full_name || "");
          setAvatarUrl(data.profile.avatar_url || "");
          if (data.profile.privacy_settings) {
            setPrivacy({
              shareGoals: !!data.profile.privacy_settings.share_goals,
              shareFinance: !!data.profile.privacy_settings.share_finance,
              shareHealth: !!data.profile.privacy_settings.share_health,
              shareCareer: !!data.profile.privacy_settings.share_career,
            });
          }
        }
        if (data.user) {
          setEmail(data.user.email || "");
        }
      } catch (err: unknown) {
        console.warn("Could not fetch remote profile:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      setProfileMessage({ type: "success", text: "Profile details updated successfully." });
    } catch (err: unknown) {
      setProfileMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving profile",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePrivacy(e: React.FormEvent) {
    e.preventDefault();
    setSavingPrivacy(true);
    setPrivacyMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacySettings: privacy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update privacy settings");
      setPrivacyMessage({ type: "success", text: "Privacy permissions updated successfully." });
    } catch (err: unknown) {
      setPrivacyMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving privacy settings",
      });
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (deleteConfirm !== "DELETE") {
      setDeleteError('Please type "DELETE" exactly to confirm.');
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/profile/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Account deletion failed");

      router.push("/login?message=account_purged");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Deletion failed");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#8B0D18] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {/* 1. Profile Information */}
      <section className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6 shadow-card-dark space-y-5">
        <div className="flex items-center space-x-3 border-b border-[#1C1C1C] pb-3">
          <div className="w-8 h-8 rounded-lg bg-[#1C1113] border border-[#381116] flex items-center justify-center">
            <UserIcon size={16} className="text-[#8B0D18]" />
          </div>
          <div>
            <h3 className="font-serif text-base font-medium text-[#ECE7E0]">Personal Profile</h3>
            <p className="text-xs text-[#8F877C]">Identity details and credentials</p>
          </div>
        </div>

        {profileMessage && (
          <div
            className={`p-3 text-xs rounded-lg border ${
              profileMessage.type === "success"
                ? "bg-[#0E1A11] border-[#1C3B24] text-emerald-400"
                : "bg-[#200A0D] border-[#4A141A] text-red-400"
            }`}
          >
            {profileMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-[#ECE7E0] mb-1">Email Address</label>
            <input
              type="email"
              disabled
              value={email || profile?.id || ""}
              className="w-full px-3 py-2 bg-[#161616] border border-[#242424] rounded-lg text-xs text-[#8F877C] font-mono cursor-not-allowed"
            />
            <span className="text-[10px] text-[#6E6862] mt-1 block">Email address cannot be changed</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#ECE7E0] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] focus:outline-none focus:border-[#8B0D18]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#ECE7E0] mb-1">Avatar URL (Optional)</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] placeholder-[#5A544E] focus:outline-none focus:border-[#8B0D18]"
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="px-4 py-2 bg-[#540911] hover:bg-[#6E0A13] text-white rounded-lg text-xs font-medium shadow-crimson-pill disabled:opacity-50 transition-colors"
          >
            {savingProfile ? "Saving..." : "Save Profile Details"}
          </button>
        </form>
      </section>

      {/* 2. Granular AI Privacy Controls */}
      <section className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6 shadow-card-dark space-y-5">
        <div className="flex items-center space-x-3 border-b border-[#1C1C1C] pb-3">
          <div className="w-8 h-8 rounded-lg bg-[#1F1A12] border border-[#3E321E] flex items-center justify-center">
            <Shield size={16} className="text-[#A39168]" />
          </div>
          <div>
            <h3 className="font-serif text-base font-medium text-[#ECE7E0]">AI Context & Privacy Controls</h3>
            <p className="text-xs text-[#8F877C]">Select which personal life-areas the AI decision engine may inspect (FR-1.5)</p>
          </div>
        </div>

        {privacyMessage && (
          <div
            className={`p-3 text-xs rounded-lg border ${
              privacyMessage.type === "success"
                ? "bg-[#0E1A11] border-[#1C3B24] text-emerald-400"
                : "bg-[#200A0D] border-[#4A141A] text-red-400"
            }`}
          >
            {privacyMessage.text}
          </div>
        )}

        <form onSubmit={handleSavePrivacy} className="space-y-3 max-w-xl">
          {[
            {
              key: "shareGoals",
              title: "Goals & Productivity Context",
              desc: "Allow AI to inspect active goals and upcoming task deadlines during decision evaluation",
              checked: privacy.shareGoals,
            },
            {
              key: "shareFinance",
              title: "Personal Finance Context",
              desc: "Allow AI to inspect monthly budget limits and spending summaries",
              checked: privacy.shareFinance,
            },
            {
              key: "shareHealth",
              title: "Health & Fitness Context",
              desc: "Allow AI to inspect workout volume and health trend summaries",
              checked: privacy.shareHealth,
            },
            {
              key: "shareCareer",
              title: "Career & Education Context",
              desc: "Allow AI to inspect career milestones, skills, and business ideas",
              checked: privacy.shareCareer,
            },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-start space-x-3 p-3.5 rounded-lg bg-[#141414] border border-[#1F1F1F] hover:border-[#2C2C2C] cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) =>
                  setPrivacy({ ...privacy, [item.key]: e.target.checked })
                }
                className="mt-0.5 rounded accent-[#8B0D18]"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-[#ECE7E0] block">{item.title}</span>
                <span className="text-[11px] text-[#8F877C] block leading-relaxed">{item.desc}</span>
              </div>
            </label>
          ))}

          <button
            type="submit"
            disabled={savingPrivacy}
            className="px-4 py-2 bg-[#540911] hover:bg-[#6E0A13] text-white rounded-lg text-xs font-medium shadow-crimson-pill disabled:opacity-50 transition-colors"
          >
            {savingPrivacy ? "Saving..." : "Save Privacy Preferences"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-[#292323] bg-[#111] p-6 shadow-card-dark">
        <h3 className="font-serif text-lg text-[#ECE7E0]">Personal data export</h3>
        <p className="mt-2 text-xs text-[#8F877C]">Download your profile and life-area records as JSON. Authentication and administrative records are excluded.</p>
        {exportError && <p role="alert" className="mt-3 text-xs text-red-400">{exportError}</p>}
        <button type="button" disabled={exporting} onClick={() => void downloadExport()} className="mt-4 rounded-lg bg-[#540911] px-4 py-2 text-xs text-white disabled:opacity-50">{exporting ? "Preparing export…" : "Download my data"}</button>
      </section>

      {/* 3. Danger Zone: Secure Account Deletion */}
      <section className="bg-[#180A0C] border border-[#3E1116] rounded-xl p-6 shadow-card-dark space-y-4">
        <div className="flex items-center space-x-3 border-b border-[#3E1116] pb-3">
          <div className="w-8 h-8 rounded-lg bg-[#2E0A0F] border border-[#52131C] flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-400" />
          </div>
          <div>
            <h3 className="font-serif text-base font-medium text-red-200">Danger Zone: Account Purge</h3>
            <p className="text-xs text-red-400/80">Permanent, irreversible deletion of all personal data (FR-1.6)</p>
          </div>
        </div>

        <p className="text-xs text-[#8F877C] leading-relaxed max-w-xl">
          Deleting your account executes a complete cascading database purge of your profile, goals, tasks,
          habits, financial transactions, health logs, contacts, calendar entries, and AI decision history.
        </p>

        {deleteError && (
          <div className="p-3 bg-[#2A0F13] border border-[#5E1B24] text-red-300 text-xs rounded-lg">
            {deleteError}
          </div>
        )}

        <form onSubmit={handleDeleteAccount} className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-medium text-red-300 mb-1">
              Type <span className="font-mono font-bold text-white">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              required
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 bg-[#14080A] border border-[#44171E] rounded-lg text-xs text-red-200 font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={deleting || deleteConfirm !== "DELETE"}
            className="px-4 py-2 bg-[#8B0D18] hover:bg-[#A3121F] text-white rounded-lg text-xs font-medium disabled:opacity-40 transition-colors"
          >
            {deleting ? "Purging Account..." : "Permanently Delete My Account & All Data"}
          </button>
        </form>
      </section>
    </div>
  );
}
