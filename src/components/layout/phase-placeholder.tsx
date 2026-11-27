import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

interface PhasePlaceholderProps {
  title: string;
  phase: string;
  roadmapRef: string;
  description: string;
  plannedFeatures: string[];
}

export function PhasePlaceholder({
  title,
  phase,
  roadmapRef,
  description,
  plannedFeatures,
}: PhasePlaceholderProps) {
  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      {/* Banner Card */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-8 shadow-card-dark space-y-6 relative overflow-hidden">
        {/* Subtle Crimson Glow in Corner */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#8B0D18]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1C1113] border border-[#3E1116] text-[11px] font-mono text-[#E8A5AC] mb-2">
              <Sparkles size={11} className="text-[#8B0D18]" />
              <span>{phase} • In Active Development</span>
            </div>
            <h2 className="font-serif text-2xl font-medium text-[#ECE7E0] tracking-wide">
              {title}
            </h2>
            <p className="text-xs text-[#8F877C] font-mono">{roadmapRef}</p>
          </div>
        </div>

        <p className="text-xs text-[#ECE7E0] leading-relaxed max-w-xl">
          {description}
        </p>

        {/* Planned Features List */}
        <div className="space-y-2.5 pt-2 border-t border-[#1C1C1C]">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#A39168]">
            Planned Capabilities (docs/SPEC.md & docs/ROADMAP.md)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plannedFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-2 text-xs text-[#8F877C] bg-[#141414] border border-[#1F1F1F] px-3 py-2 rounded-lg"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#8B0D18] flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security / Privacy Assurance */}
        <div className="flex items-center space-x-2 text-[11px] text-[#6E6862] pt-2">
          <ShieldCheck size={14} className="text-[#A39168]" />
          <span>
            Database schema & RLS policies for this module already exist in PostgreSQL. Full CRUD UI activates in {phase}.
          </span>
        </div>

        {/* Quick link back */}
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-1.5 text-xs text-[#B31222] hover:text-[#FF334B] font-medium transition-colors"
          >
            <span>Return to Productivity Dashboard</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
