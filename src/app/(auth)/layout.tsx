import { EclipseBackground } from "@/components/layout/eclipse-header";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#080808] relative overflow-hidden text-[#ECE7E0]">
      {/* Background Atmosphere */}
      <EclipseBackground />

      <div className="relative z-10 w-full max-w-md bg-[#111111] border border-[#1E1E1E] rounded-xl p-8 shadow-card-dark space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2.5 group">
            {/* Red Crescent Eclipse Icon */}
            <div className="relative w-8 h-8 flex-shrink-0">
              <div className="w-8 h-8 rounded-full border-2 border-[#8B0D18] shadow-[0_0_15px_rgba(139,13,24,0.7)] flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-[#111111] translate-x-1 -translate-y-0.5" />
              </div>
            </div>
            <span className="font-serif text-2xl font-medium tracking-wide text-[#ECE7E0] group-hover:text-white transition-colors">
              Life OS
            </span>
          </Link>
          <p className="text-xs text-[#8F877C] font-mono">
            Personal Life-Management & Intelligent Decision Support
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
