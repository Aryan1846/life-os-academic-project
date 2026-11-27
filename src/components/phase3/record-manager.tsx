"use client";

import { useCallback, useEffect, useState } from "react";

export type Row = Record<string, unknown> & { id: string };
export type Field = { key: string; label: string; kind?: "text" | "textarea" | "number" | "date" | "datetime" | "select" | "tags"; required?: boolean; options?: string[]; source?: "goals" | "contacts" | "events" | "tasks" | "linked"; step?: string };
type Props = { table: string; title: string; intro: string; fields: Field[]; columns: { label: string; render: (row: Row) => React.ReactNode }[]; summary?: (items: Row[]) => React.ReactNode; onRows?: (items: Row[]) => void };

function displayValue(value: unknown) { return value == null ? "" : String(value); }
function initial(fields: Field[]) { return Object.fromEntries(fields.map(f => [f.key, f.key === "entity_type" ? "" : f.kind === "select" ? f.options?.[0] || "" : f.kind === "date" ? new Date().toISOString().slice(0, 10) : ""])); }
function getValue(row: Row, key: string): unknown { const [head, child] = key.split("."); return child ? (row[head] as Record<string, unknown> | null)?.[child] : row[key]; }

export function RecordManager({ table, title, intro, fields, columns, summary, onRows }: Props) {
  const [items, setItems] = useState<Row[]>([]);
  const [links, setLinks] = useState<Record<string, Row[]>>({});
  const [values, setValues] = useState<Record<string, string>>(() => initial(fields));
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const reload = useCallback(async () => {
    try {
      const response = await fetch(`/api/life/${table}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load records");
      setItems(body.items || []); onRows?.(body.items || []); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load records"); }
    finally { setLoading(false); }
  }, [table, onRows]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const sources = [...new Set(fields.flatMap(f => f.source === "linked" ? ["events", "tasks", "contacts"] as const : f.source ? [f.source] : []))];
    void Promise.all(sources.map(async source => {
      const response = await fetch(source === "goals" || source === "tasks" ? `/api/${source}` : `/api/life/${source}`);
      const body = await response.json();
      if (response.ok) setLinks(previous => ({ ...previous, [source]: body.items || body[source] || [] }));
    }));
  }, [fields]);

  function start(row?: Row) {
    setEditing(row?.id || null);
    setValues(row ? Object.fromEntries(fields.map(f => [f.key, f.kind === "datetime" && getValue(row, f.key) ? String(getValue(row, f.key)).slice(0, 16) : f.kind === "tags" ? ((getValue(row, f.key) as string[]) || []).join(", ") : displayValue(getValue(row, f.key))])) : initial(fields));
    setFormError(""); setOpen(true);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setFormError("");
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = values[field.key] ?? "";
      const value = field.key === "is_all_day" ? raw === "true" : field.kind === "number" ? (raw === "" ? null : Number(raw)) : field.kind === "tags" ? raw.split(",").map(t => t.trim()).filter(Boolean) : field.kind === "datetime" ? (raw ? new Date(raw).toISOString() : null) : raw || null;
      const [head, child] = field.key.split(".");
      if (child) { payload[head] = { ...(payload[head] as Record<string, unknown> || {}), [child]: value }; }
      else payload[head] = value;
    }
    try {
      const response = await fetch(`/api/life/${table}${editing ? `/${editing}` : ""}`, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error === "Validation failed" ? JSON.stringify(body.details?.fieldErrors || body.details) : body.error);
      setOpen(false); await reload();
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Could not save record"); }
    finally { setSaving(false); }
  }
  async function remove(row: Row) {
    if (!window.confirm("Delete this record?")) return;
    try {
      const response = await fetch(`/api/life/${table}/${row.id}`, { method: "DELETE" });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete record"); }
  }
  return <section className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#2A2424] pb-5"><div><p className="text-xs uppercase tracking-[0.3em] text-[#A39168]">Life OS</p><h1 className="mt-2 font-serif text-3xl text-[#ECE7E0]">{title}</h1><p className="mt-2 text-sm text-[#8F877C]">{intro}</p></div><button className="rounded-lg bg-[#7D101B] px-4 py-2 text-sm text-white hover:bg-[#9D1925]" onClick={() => start()}>Add record</button></header>
    {!loading && !error && summary?.(items)}
    {error && <div role="alert" className="rounded-lg border border-red-900 p-4 text-sm text-red-300">{error} <button className="underline" onClick={() => void reload()}>Retry</button></div>}
    {loading ? <p className="text-sm text-[#8F877C]">Loading records…</p> : items.length === 0 ? <p className="rounded-xl border border-[#2A2424] bg-[#111] p-8 text-sm text-[#8F877C]">No records yet. Add the first one to begin.</p> : <div className="overflow-x-auto rounded-xl border border-[#252020] bg-[#111]"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-[#252020] text-xs uppercase tracking-wider text-[#8F877C]"><tr>{columns.map(c => <th key={c.label} className="px-4 py-3 font-medium">{c.label}</th>)}<th className="px-4 py-3">Actions</th></tr></thead><tbody>{items.map(row => <tr key={row.id} className="border-b border-[#201C1C] text-[#ECE7E0]">{columns.map(c => <td key={c.label} className="px-4 py-3">{c.render(row)}</td>)}<td className="whitespace-nowrap px-4 py-3"><button className="mr-3 text-[#A39168] hover:underline" onClick={() => start(row)}>Edit</button><button className="text-red-400 hover:underline" onClick={() => void remove(row)}>Delete</button></td></tr>)}</tbody></table></div>}
    {open && <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/80 p-4"><div className="w-full max-w-xl rounded-xl border border-[#362B2B] bg-[#141414] p-6 shadow-2xl"><div className="flex justify-between"><h2 className="font-serif text-xl text-[#ECE7E0]">{editing ? "Edit" : "Add"} {title.toLowerCase()}</h2><button onClick={() => setOpen(false)} className="text-[#9B9290]">Close</button></div><form onSubmit={e => void save(e)} className="mt-5 grid max-h-[75vh] grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-2">{fields.map(field => <label key={field.key} className={`text-xs text-[#B4AAA0] ${field.kind === "textarea" ? "sm:col-span-2" : ""}`}>{field.label}{field.required && " *"}{field.kind === "textarea" ? <textarea className="mt-1 w-full rounded-md border border-[#363030] bg-[#0B0B0B] p-2 text-sm text-white" value={values[field.key] || ""} onChange={e => setValues({ ...values, [field.key]: e.target.value })} /> : field.kind === "select" || field.source ? <select required={field.required} className="mt-1 w-full rounded-md border border-[#363030] bg-[#0B0B0B] p-2 text-sm text-white" value={values[field.key] || ""} onChange={e => setValues({ ...values, [field.key]: e.target.value, ...(field.key === "entity_type" ? { entity_id: "" } : {}) })}><option value="">Select…</option>{field.source ? (links[field.source === "linked" ? `${values.entity_type || ""}s` : field.source] || []).map(row => <option key={row.id} value={row.id}>{String(row.title || row.name)}</option>) : field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select> : <input required={field.required} type={field.kind === "datetime" ? "datetime-local" : field.kind === "tags" ? "text" : field.kind || "text"} min={field.kind === "number" ? "0" : undefined} step={field.step} className="mt-1 w-full rounded-md border border-[#363030] bg-[#0B0B0B] p-2 text-sm text-white" value={values[field.key] || ""} onChange={e => setValues({ ...values, [field.key]: e.target.value })} />}</label>)}{formError && <p role="alert" className="sm:col-span-2 text-sm text-red-400">{formError}</p>}<div className="sm:col-span-2 flex justify-end gap-3"><button type="button" className="px-3 py-2 text-sm text-[#A39168]" onClick={() => setOpen(false)}>Cancel</button><button disabled={saving} className="rounded-md bg-[#7D101B] px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button></div></form></div></div>}
  </section>;
}
