"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { NotificationBell } from "@/components/phase3/notification-bell";
import {
  Menu,
  Calendar as CalendarIcon,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Plus,
  Target,
  CheckSquare,
  RotateCcw,
} from "lucide-react";

interface TopbarProps {
  userEmail?: string;
  userName?: string;
  userRole?: string;
  onMobileToggle?: () => void;
}

export function Topbar({
  userEmail = "user@localhost",
  userName = "Aryan",
  userRole = "user",
  onMobileToggle,
}: TopbarProps) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [formattedDate, setFormattedDate] = useState("Today");

  useEffect(() => {
    const now = new Date();
    const str = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(now);
    setFormattedDate(str);
  }, []);

  const getPageTitle = (path: string): string => {
    if (path === "/dashboard") return "Dashboard";
    if (path.startsWith("/goals")) return "Goals";
    if (path.startsWith("/tasks")) return "Tasks";
    if (path.startsWith("/habits")) return "Habits";
    if (path.startsWith("/finance")) return "Finance";
    if (path.startsWith("/health")) return "Health";
    if (path.startsWith("/career")) return "Career";
    if (path.startsWith("/relationships")) return "Relationships";
    if (path.startsWith("/calendar")) return "Calendar";
    if (path.startsWith("/analytics")) return "Analytics";
    if (path.startsWith("/decisions")) return "AI Decision Support";
    if (path.startsWith("/settings")) return "Settings";
    if (path.startsWith("/admin")) return "Admin Portal";
    return "Life OS";
  };

  const initial = (userName[0] || userEmail[0] || "U").toUpperCase();

  return (
    <header className="relative z-20 h-20 px-6 md:px-10 flex items-center justify-between">
      {/* Page Title */}
      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={onMobileToggle}
          className="lg:hidden p-2 rounded text-[#8F877C] hover:text-[#ECE7E0] hover:bg-[#141414] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        <h1 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-[#ECE7E0]">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Right Controls: Date Pill, Quick Action, Profile */}
      <div className="flex items-center space-x-3 md:space-x-4">
        <NotificationBell />
        {/* Date Display Pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-[#141414] border border-[#222222] text-[#8F877C] text-xs font-medium cursor-default">
          <CalendarIcon size={14} className="text-[#8F877C]" />
          <span>{formattedDate}</span>
          <ChevronDown size={12} className="text-[#645E56]" />
        </div>

        {/* Quick Add Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setQuickCreateOpen(!quickCreateOpen);
              setProfileOpen(false);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#540911] hover:bg-[#6D0C16] text-[#FFFFFF] text-xs font-medium transition-colors shadow-crimson-pill"
          >
            <Plus size={14} />
            <span className="hidden md:inline">Create</span>
          </button>

          {quickCreateOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setQuickCreateOpen(false)} />
              <div className="absolute right-0 mt-2 w-44 bg-[#141414] border border-[#222222] rounded-lg shadow-card-dark z-40 py-1 divide-y divide-[#1F1F1F]">
                <div className="py-1">
                  <Link
                    href="/goals?create=true"
                    onClick={() => setQuickCreateOpen(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 text-xs text-[#ECE7E0] hover:bg-[#1C1C1C] transition-colors"
                  >
                    <Target size={14} className="text-[#8B0D18]" />
                    <span>New Goal</span>
                  </Link>
                  <Link
                    href="/tasks?create=true"
                    onClick={() => setQuickCreateOpen(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 text-xs text-[#ECE7E0] hover:bg-[#1C1C1C] transition-colors"
                  >
                    <CheckSquare size={14} className="text-[#8B0D18]" />
                    <span>New Task</span>
                  </Link>
                  <Link
                    href="/habits?create=true"
                    onClick={() => setQuickCreateOpen(false)}
                    className="flex items-center space-x-2.5 px-3 py-2 text-xs text-[#ECE7E0] hover:bg-[#1C1C1C] transition-colors"
                  >
                    <RotateCcw size={14} className="text-[#8B0D18]" />
                    <span>New Habit</span>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Circle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setQuickCreateOpen(false);
            }}
            className="w-9 h-9 rounded-full bg-[#181818] border border-[#282828] hover:border-[#8B0D18] flex items-center justify-center text-xs font-medium text-[#ECE7E0] transition-colors"
            title={userName}
          >
            <UserIcon size={16} className="text-[#A09A92]" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-[#141414] border border-[#222222] rounded-lg shadow-card-dark z-40 py-1 divide-y divide-[#1F1F1F]">
                <div className="px-4 py-2.5">
                  <div className="text-xs font-semibold text-[#ECE7E0] truncate">{userName}</div>
                  <div className="text-[11px] text-[#8F877C] font-mono truncate">{userEmail}</div>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#1E1E1E] text-[#A39168] border border-[#2B2B2B] uppercase">
                    {userRole}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-xs text-[#ECE7E0] hover:bg-[#1C1C1C] transition-colors"
                  >
                    <UserIcon size={14} className="text-[#8F877C]" />
                    <span>Profile & Privacy</span>
                  </Link>
                </div>

                <div className="py-1">
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="w-full flex items-center space-x-2 px-4 py-2 text-xs text-red-400 hover:bg-[#200A0D] hover:text-red-300 transition-colors text-left"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
