"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Target,
  CheckSquare,
  RotateCcw,
  Coins,
  Heart,
  Briefcase,
  Users,
  Calendar,
  BarChart2,
  Sparkles,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  role?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: typeof Home;
  phase?: string;
}

const primaryNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Habits", href: "/habits", icon: RotateCcw },
];

const futureNavItems: NavItem[] = [
  { name: "Finance", href: "/finance", icon: Coins, phase: "Phase 3" },
  { name: "Health", href: "/health", icon: Heart, phase: "Phase 3" },
  { name: "Career", href: "/career", icon: Briefcase, phase: "Phase 3" },
  { name: "Relationships", href: "/relationships", icon: Users, phase: "Phase 3" },
  { name: "Calendar", href: "/calendar", icon: Calendar, phase: "Phase 3" },
  { name: "Analytics", href: "/analytics", icon: BarChart2, phase: "Phase 4" },
  { name: "AI Decision Support", href: "/decisions", icon: Sparkles, phase: "Phase 5" },
];

export function Sidebar({ role = "user", isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-[#0A0A0A] border-r border-[#1C1C1C] flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-60"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand / Logo Header with Crescent Eclipse */}
        <div className="h-20 px-5 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center space-x-3 group"
            onClick={onMobileClose}
          >
            {/* Red Crescent Eclipse Icon */}
            <div className="relative w-7 h-7 flex-shrink-0">
              <div className="w-7 h-7 rounded-full border-2 border-[#8B0D18] shadow-[0_0_12px_rgba(139,13,24,0.6)] flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-[#0A0A0A] translate-x-1 -translate-y-0.5" />
              </div>
            </div>

            {!isCollapsed && (
              <span className="font-serif text-xl font-medium tracking-wide text-[#ECE7E0] group-hover:text-white transition-colors">
                Life OS
              </span>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center w-5 h-5 rounded text-[#6E6862] hover:text-[#ECE7E0] hover:bg-[#181818] transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Navigation Items Area */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {primaryNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? "bg-[#540911] text-[#FFFFFF] shadow-crimson-pill"
                    : "text-[#8F877C] hover:text-[#ECE7E0] hover:bg-[#141414]"
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon
                  size={16}
                  className={`flex-shrink-0 ${
                    isActive ? "text-white" : "text-[#756E65] group-hover:text-[#ECE7E0]"
                  }`}
                />
                {!isCollapsed && <span className="ml-3 tracking-normal">{item.name}</span>}
              </Link>
            );
          })}

          <div className="py-2" />

          {/* Integrated Life Modules */}
          {futureNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? "bg-[#540911] text-[#FFFFFF] shadow-crimson-pill"
                    : "text-[#8F877C] hover:text-[#ECE7E0] hover:bg-[#141414]"
                }`}
                title={isCollapsed ? `${item.name} (${item.phase})` : undefined}
              >
                <Icon
                  size={16}
                  className={`flex-shrink-0 ${
                    isActive ? "text-white" : "text-[#756E65] group-hover:text-[#ECE7E0]"
                  }`}
                />
                {!isCollapsed && (
                  <span className="ml-3 tracking-normal truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Section: Settings & Admin */}
        <div className="p-3 border-t border-[#1C1C1C] space-y-1">
          <Link
            href="/settings"
            onClick={onMobileClose}
            className={`flex items-center px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
              pathname === "/settings"
                ? "bg-[#540911] text-[#FFFFFF] shadow-crimson-pill"
                : "text-[#8F877C] hover:text-[#ECE7E0] hover:bg-[#141414]"
            }`}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings
              size={16}
              className={`flex-shrink-0 ${
                pathname === "/settings" ? "text-white" : "text-[#756E65] group-hover:text-[#ECE7E0]"
              }`}
            />
            {!isCollapsed && <span className="ml-3">Settings</span>}
          </Link>

          {role === "admin" && (
            <Link
              href="/admin"
              onClick={onMobileClose}
              className={`flex items-center px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                pathname.startsWith("/admin")
                  ? "bg-[#2A180E] text-[#D4C39B] border border-[#523A1E]"
                  : "text-[#A39168] hover:text-[#D4C39B] hover:bg-[#161410]"
              }`}
              title={isCollapsed ? "Admin" : undefined}
            >
              <Shield size={16} className="flex-shrink-0" />
              {!isCollapsed && <span className="ml-3 font-semibold">Admin</span>}
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
