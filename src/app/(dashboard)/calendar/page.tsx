"use client";
import { RecordManager, type Field, type Row } from "@/components/phase3/record-manager";
import { useCallback, useEffect, useState } from "react";

const eventFields: Field[] = [{ key: "title", label: "Event", required: true }, { key: "start_time", label: "Start", kind: "datetime", required: true }, { key: "end_time", label: "End", kind: "datetime" }, { key: "is_all_day", label: "All day", kind: "select", options: ["false", "true"], required: true }, { key: "recurrence_rule", label: "Repeat", kind: "select", options: ["none", "daily", "weekly", "monthly"] }, { key: "description", label: "Description", kind: "textarea" }];
const reminderFields: Field[] = [{ key: "title", label: "Reminder", required: true }, { key: "remind_at", label: "Remind at", kind: "datetime", required: true }, { key: "entity_type", label: "Linked item type", kind: "select", options: ["event", "task", "contact"] }, { key: "entity_id", label: "Linked item", source: "linked" }];
type AgendaEntry = { date: string; title: string; type: string };
function recurringEvents(events: Row[], start: Date, end: Date): AgendaEntry[] {
  const list: AgendaEntry[] = [];
  for (const event of events) {
    const first = new Date(String(event.start_time));
    if (Number.isNaN(first.getTime())) continue;
    const repeat = String(event.recurrence_rule || "none");
    const date = new Date(first);
    if (repeat === "daily" || repeat === "weekly") {
      const interval = repeat === "daily" ? 1 : 7;
      const elapsed = Math.max(0, Math.floor((start.getTime() - first.getTime()) / 86400000 / interval) - 1);
      date.setUTCDate(first.getUTCDate() + elapsed * interval);
    } else if (repeat === "monthly" && date < start) {
      const elapsed = Math.max(0, (start.getUTCFullYear() - first.getUTCFullYear()) * 12 + start.getUTCMonth() - first.getUTCMonth() - 1);
      date.setUTCMonth(first.getUTCMonth() + elapsed);
    }
    for (let i = 0; i < 40 && date <= end; i++) {
      if (date >= start) list.push({ date: date.toISOString(), title: String(event.title), type: "Event" });
      if (repeat === "daily") date.setUTCDate(date.getUTCDate() + 1);
      else if (repeat === "weekly") date.setUTCDate(date.getUTCDate() + 7);
      else if (repeat === "monthly") date.setUTCMonth(date.getUTCMonth() + 1);
      else break;
    }
  }
  return list;
}
export default function CalendarPage() {
  const [events, setEvents] = useState<Row[]>([]);
  const [reminders, setReminders] = useState<Row[]>([]);
  const [deadlines, setDeadlines] = useState<AgendaEntry[]>([]);
  const [agendaError, setAgendaError] = useState("");
  const onEvents = useCallback((rows: Row[]) => setEvents(rows), []);
  const onReminders = useCallback((rows: Row[]) => setReminders(rows), []);
  useEffect(() => { void (async () => { try {
    const endpoints = ["/api/tasks", "/api/goals", "/api/life/career_items"];
    const responses = await Promise.all(endpoints.map(url => fetch(url)));
    if (responses.some(response => !response.ok)) throw new Error("Could not load linked deadlines");
    const [tasks, goals, career] = await Promise.all(responses.map(response => response.json()));
    setDeadlines([...(tasks.tasks || []).filter((item: Row) => item.due_date && item.status !== "done").map((item: Row) => ({ date: String(item.due_date), title: String(item.title), type: "Task" })), ...(goals.goals || []).filter((item: Row) => item.target_date && item.status === "active").map((item: Row) => ({ date: String(item.target_date), title: String(item.title), type: "Goal" })), ...(career.items || []).filter((item: Row) => item.target_date && item.status !== "completed").map((item: Row) => ({ date: String(item.target_date), title: String(item.title), type: "Career" }))]);
  } catch (error) { setAgendaError(error instanceof Error ? error.message : "Could not load deadlines"); } })(); }, []);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 30);
  const agenda = [...recurringEvents(events, start, end), ...deadlines.filter(item => new Date(item.date) >= start && new Date(item.date) <= end), ...reminders.filter(item => !item.is_sent && new Date(String(item.remind_at)) >= start && new Date(String(item.remind_at)) <= end).map(item => ({ date: String(item.remind_at), title: String(item.title), type: "Reminder" }))].sort((a, b) => a.date.localeCompare(b.date));
  return <div className="space-y-10"><section className="rounded-xl border border-[#292323] bg-[#111] p-5"><h1 className="font-serif text-2xl text-[#ECE7E0]">Agenda · next 30 days</h1>{agendaError && <p className="mt-3 text-sm text-red-400">{agendaError}</p>}{agenda.length ? <ul className="mt-4 space-y-2">{agenda.map((item, index) => <li key={`${item.type}-${item.date}-${index}`} className="flex flex-wrap justify-between gap-2 border-b border-[#292323] py-2 text-sm text-[#ECE7E0]"><span>{item.title} <small className="ml-2 text-[#A39168]">{item.type}</small></span><time className="text-[#8F877C]">{new Date(item.date).toLocaleString("en-IN")}</time></li>)}</ul> : <p className="mt-4 text-sm text-[#8F877C]">Nothing scheduled in the next 30 days.</p>}</section>
    <RecordManager table="events" title="Calendar events" intro="Schedule appointments and recurring events." fields={eventFields} onRows={onEvents} columns={[{ label: "Event", render: r => String(r.title) }, { label: "Starts", render: r => new Date(String(r.start_time)).toLocaleString("en-IN") }, { label: "Ends", render: r => r.end_time ? new Date(String(r.end_time)).toLocaleString("en-IN") : "—" }, { label: "Repeat", render: r => String(r.recurrence_rule || "none") }]} />
    <RecordManager table="reminders" title="Reminders" intro="Receive in-app alerts for events, tasks and contact follow-ups." fields={reminderFields} onRows={onReminders} columns={[{ label: "Reminder", render: r => String(r.title) }, { label: "Scheduled", render: r => new Date(String(r.remind_at)).toLocaleString("en-IN") }, { label: "Linked", render: r => String(r.entity_type || "—") }, { label: "Status", render: r => r.is_sent ? "Delivered" : "Pending" }]} /></div>;
}
