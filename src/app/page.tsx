import Link from "next/link";
import { EclipseBackground } from "@/components/layout/eclipse-header";
import { ArrowRight, Target, CheckSquare, RotateCcw, BrainCircuit, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#ECE7E0] relative overflow-hidden flex flex-col justify-between">
      {/* Berserk Celestial Eclipse Atmosphere */}
      <EclipseBackground />

      {/* Navigation Header */}
      <header className="relative z-20 max-w-6xl w-full mx-auto px-6 h-24 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Red Crescent Eclipse Icon */}
          <div className="relative w-8 h-8 flex-shrink-0">
            <div className="w-8 h-8 rounded-full border-2 border-[#8B0D18] shadow-[0_0_15px_rgba(139,13,24,0.7)] flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-[#080808] translate-x-1 -translate-y-0.5" />
            </div>
          </div>
          <span className="font-serif text-2xl font-medium tracking-wide text-[#ECE7E0]">
            Life OS
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/login"
            className="text-xs text-[#8F877C] hover:text-[#ECE7E0] transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-[#540911] hover:bg-[#6E0A13] text-white rounded-lg text-xs font-medium shadow-crimson-pill transition-colors"
          >
            Enter Workspace
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center space-y-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#181113] border border-[#3E1116] text-xs font-mono text-[#E8A5AC]">
          <span className="w-2 h-2 rounded-full bg-[#8B0D18] animate-pulse" />
          <span>Phase 2 Active • Productivity Engine & Dark Medieval Atmosphere</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl font-normal tracking-tight text-[#ECE7E0] leading-tight">
          Master Your Focus. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ECE7E0] via-[#E8A5AC] to-[#B31222]">
            Execute With Deterministic Precision.
          </span>
        </h1>

        <p className="text-sm md:text-base text-[#8F877C] max-w-2xl mx-auto leading-relaxed">
          An integrated personal life-management platform combining goal architectures,
          daily task velocity, deterministic habit streak engines, and mathematical AI decision support.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-[#540911] hover:bg-[#6E0A13] text-white rounded-xl text-sm font-medium shadow-crimson-pill transition-colors w-full sm:w-auto justify-center"
          >
            <span>Open Dashboard</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 bg-[#141414] hover:bg-[#1A1A1A] border border-[#222222] text-[#ECE7E0] rounded-xl text-sm font-medium transition-colors w-full sm:w-auto"
          >
            Create Free Account
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12 text-left">
          <div className="bg-[#111111]/80 border border-[#1E1E1E] rounded-xl p-5 space-y-2 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-[#1C1113] border border-[#381116] flex items-center justify-center">
              <Target size={16} className="text-[#8B0D18]" />
            </div>
            <h3 className="font-serif text-sm font-medium text-[#ECE7E0]">Objective Architectures</h3>
            <p className="text-xs text-[#8F877C] leading-relaxed">
              Track multi-tier goals with measurable progress bars and linked daily tasks.
            </p>
          </div>

          <div className="bg-[#111111]/80 border border-[#1E1E1E] rounded-xl p-5 space-y-2 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-[#1C1113] border border-[#381116] flex items-center justify-center">
              <RotateCcw size={16} className="text-[#8B0D18]" />
            </div>
            <h3 className="font-serif text-sm font-medium text-[#ECE7E0]">Deterministic Streaks</h3>
            <p className="text-xs text-[#8F877C] leading-relaxed">
              Timezone-aware habit calculation engine maintaining active streaks and historical peaks.
            </p>
          </div>

          <div className="bg-[#111111]/80 border border-[#1E1E1E] rounded-xl p-5 space-y-2 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-[#1F1A12] border border-[#3E321E] flex items-center justify-center">
              <Shield size={16} className="text-[#A39168]" />
            </div>
            <h3 className="font-serif text-sm font-medium text-[#ECE7E0]">Privacy-Enforced RLS</h3>
            <p className="text-xs text-[#8F877C] leading-relaxed">
              Row-Level Security strictly isolates all records. Even admins cannot browse private data.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#1C1C1C] py-6 text-center text-xs text-[#6E6862] font-mono">
        Life OS • MediCaps University CS3CO40P • Phase 2 Production Build
      </footer>
    </div>
  );
}
