"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setMessage(data.message || "Password reset link sent if an account exists.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#1C1C1C] pb-3 text-center">
        <h2 className="font-serif text-lg font-medium text-[#ECE7E0]">Reset Password</h2>
        <p className="text-xs text-[#8F877C]">
          Enter your email to receive a secure recovery link
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#200A0D] border border-[#4A141A] text-red-400 text-xs rounded-lg">
          {error}
        </div>
      )}

      {message ? (
        <div className="space-y-4">
          <div className="p-3 bg-[#0E1A11] border border-[#1C3B24] text-emerald-400 text-xs rounded-lg leading-relaxed">
            {message}
          </div>
          <Link
            href="/login"
            className="block text-center w-full py-2.5 px-4 bg-[#540911] hover:bg-[#6E0A13] text-white rounded-lg text-xs font-medium shadow-crimson-pill transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#540911] hover:bg-[#6E0A13] text-white rounded-lg text-xs font-medium shadow-crimson-pill disabled:opacity-50 transition-colors"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}

      <div className="text-center text-xs text-[#8F877C] pt-2 border-t border-[#1C1C1C]">
        Remember your password?{" "}
        <Link href="/login" className="text-[#ECE7E0] hover:text-white underline font-medium">
          Sign In
        </Link>
      </div>
    </div>
  );
}
