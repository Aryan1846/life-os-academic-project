"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#1C1C1C] pb-3 text-center">
        <h2 className="font-serif text-lg font-medium text-[#ECE7E0]">Create Account</h2>
        <p className="text-xs text-[#8F877C]">Initialize your personal life management workspace</p>
      </div>

      {error && (
        <div className="p-3 bg-[#200A0D] border border-[#4A141A] text-red-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#ECE7E0] mb-1" htmlFor="fullName">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 bg-[#181818] border border-[#262626] rounded-lg text-xs text-[#ECE7E0] placeholder-[#5A544E] focus:outline-none focus:border-[#8B0D18]"
            placeholder="Aryan"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#ECE7E0] mb-1" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-[#181818] border border-[#262626] rounded-lg text-xs text-[#ECE7E0] placeholder-[#5A544E] focus:outline-none focus:border-[#8B0D18]"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#ECE7E0] mb-1" htmlFor="password">
            Password (min 8 chars)
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[#540911] hover:bg-[#6E0A13] text-white rounded-lg text-xs font-medium shadow-crimson-pill disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating Account..." : "Create Account & Enter Workspace"}
        </button>
      </form>

      <div className="text-center text-xs text-[#8F877C] pt-2 border-t border-[#1C1C1C]">
        Already have an account?{" "}
        <Link href="/login" className="text-[#ECE7E0] hover:text-white underline font-medium">
          Sign In
        </Link>
      </div>
    </div>
  );
}
