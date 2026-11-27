"use client";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Notice = { id: string; type: string; title: string; message: string | null; is_read: boolean; created_at: string };
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try { const response = await fetch("/api/notifications?limit=8", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setItems(body.notifications || []); setUnread(body.unread || 0); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load notifications"); }
  }, []);
  useEffect(() => { void reload(); const timer = window.setInterval(() => void reload(), 30000); return () => window.clearInterval(timer); }, [reload]);
  async function markRead(id: string) {
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_read: true }) });
    if (response.ok) { setItems(previous => previous.map(item => item.id === id ? { ...item, is_read: true } : item)); setUnread(previous => Math.max(0, previous - 1)); }
    else setError("Could not mark notification as read");
  }
  return <div className="relative"><button type="button" onClick={() => setOpen(!open)} aria-label={`Notifications, ${unread} unread`} className="relative rounded-lg border border-[#282828] bg-[#141414] p-2 text-[#A39168]"><Bell size={17} />{unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#8B0D18] px-1 text-[10px] text-white">{unread}</span>}</button>{open && <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-[#302727] bg-[#141414] p-3 shadow-2xl"><div className="flex justify-between"><h2 className="font-serif text-lg text-[#ECE7E0]">Notifications</h2><button className="text-xs text-[#A39168]" onClick={() => void reload()}>Refresh</button></div>{error && <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>}{items.length ? items.map(item => <div key={item.id} className="mt-3 border-t border-[#2A2424] pt-3"><p className={`text-sm ${item.is_read ? "text-[#8F877C]" : "text-[#ECE7E0]"}`}>{item.title}</p><p className="text-xs text-[#8F877C]">{item.type === "budget_alert" ? `Budget threshold reached · ${item.message}` : item.message}</p><p className="text-[10px] text-[#665E58]">{new Date(item.created_at).toLocaleString("en-IN")}</p>{!item.is_read && <button className="mt-1 text-xs text-[#A39168] hover:underline" onClick={() => void markRead(item.id)}>Mark read</button>}</div>) : <p className="mt-4 text-sm text-[#8F877C]">No notifications yet.</p>}<Link href="/notifications" onClick={() => setOpen(false)} className="mt-4 block border-t border-[#302727] pt-3 text-center text-xs text-[#A39168] hover:underline">Open notification center</Link></div>}</div>;
}
