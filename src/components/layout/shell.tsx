"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { EclipseBackground } from "./eclipse-header";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userName?: string;
  userRole?: string;
}

export function AppShell({
  children,
  userEmail,
  userName,
  userRole,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080808] text-[#ECE7E0] flex antialiased selection:bg-[#8B0D18] selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        role={userRole}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Eclipse Atmosphere */}
        <EclipseBackground />

        {/* Topbar */}
        <Topbar
          userEmail={userEmail}
          userName={userName}
          userRole={userRole}
          onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Page Content Viewport */}
        <main className="relative z-10 flex-1 px-6 md:px-10 pb-12 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
