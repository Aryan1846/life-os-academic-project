"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Password update failed");
      }

      router.push("/login?message=password_updated");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#1C1C1C] pb-3 text-center">
        <h2 className="font-serif text-lg font-medium text-[#ECE7E0]">Set New Password</h2>
        <p className="text-xs text-[#8F877C]">Enter your new account password</p>
      </div>

      {error && (
        <div className="p-3 bg-[#200A0D] border border-[#4A141A] text-red-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#ECE7E0] mb-1" htmlFor="password">
            New Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-[#181818] border border-[#262626] rounded-lg text-xs text-[#ECE7E0] placeholder-[#5A544E] focus:outline-none focus:border-[#8B0D18]"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#ECE7E0] mb-1" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 bg-[#181818] border border-[#262626] rounded-lg text-xs text-[#ECE7E0] placeholder-[#5A544E] focus:outline-none focus:border-[#8B0D18]"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[#540911] hover:bg-[#6E0A13] text-white rounded-lg text-xs font-medium shadow-crimson-pill disabled:opacity-50 transition-colors"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>

      <div className="text-center text-xs text-[#8F877C] pt-2 border-t border-[#1C1C1C]">
        <Link href="/login" className="text-[#ECE7E0] hover:text-white underline font-medium">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
