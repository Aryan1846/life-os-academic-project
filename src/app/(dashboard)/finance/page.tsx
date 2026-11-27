"use client";
import { RecordManager, type Field, type Row } from "@/components/phase3/record-manager";
import { useCallback, useMemo, useState } from "react";

const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
const txFields: Field[] = [
  { key: "type", label: "Type", kind: "select", options: ["expense", "income"], required: true },
  { key: "category", label: "Category", required: true },
  { key: "amount", label: "Amount (INR)", kind: "number", step: "0.01", required: true },
  { key: "transaction_date", label: "Date", kind: "date", required: true },
  { key: "description", label: "Description" },
];
const budgetFields: Field[] = [
  { key: "category", label: "Category", required: true },
  { key: "monthly_limit", label: "Monthly limit (INR)", kind: "number", step: "0.01", required: true },
  { key: "alert_threshold", label: "Alert threshold (0.01–1)", kind: "number", step: "0.01", required: true },
];
export default function FinancePage() {
  const [transactions, setTransactions] = useState<Row[]>([]);
  const [budgets, setBudgets] = useState<Row[]>([]);
  const onTransactions = useCallback((rows: Row[]) => setTransactions(rows), []);
  const onBudgets = useCallback((rows: Row[]) => setBudgets(rows), []);
  const month = new Date().toISOString().slice(0, 7);
  const monthRows = useMemo(() => transactions.filter(t => String(t.transaction_date).startsWith(month)), [transactions, month]);
  const income = monthRows.filter(t => t.type === "income").reduce((n, t) => n + Number(t.amount), 0);
  const expense = monthRows.filter(t => t.type === "expense").reduce((n, t) => n + Number(t.amount), 0);
  const byCategory = Object.entries(monthRows.filter(t => t.type === "expense").reduce<Record<string, number>>((acc, t) => { const key = String(t.category); acc[key] = (acc[key] || 0) + Number(t.amount); return acc; }, {})).sort((a, b) => b[1] - a[1]);
  return <div className="space-y-10"><RecordManager table="transactions" title="Finance" intro="Track income and spending in Indian rupees." fields={txFields} onRows={onTransactions} columns={[{ label: "Date", render: r => String(r.transaction_date) }, { label: "Type", render: r => String(r.type) }, { label: "Category", render: r => String(r.category) }, { label: "Amount", render: r => money(Number(r.amount)) }, { label: "Description", render: r => String(r.description || "—") }]} summary={() => <div className="grid gap-4 sm:grid-cols-3">{[["Income this month", income], ["Expenses this month", expense], ["Net this month", income - expense]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-[#292323] bg-[#111] p-5"><p className="text-xs text-[#A39168]">{label}</p><p className="mt-2 font-serif text-xl text-[#ECE7E0]">{money(Number(value))}</p></div>)}</div>} />
    <section className="rounded-xl border border-[#292323] bg-[#111] p-5"><h2 className="font-serif text-xl text-[#ECE7E0]">Spending by category · {month}</h2>{byCategory.length ? <ul className="mt-4 space-y-2">{byCategory.map(([name, total]) => <li key={name} className="flex justify-between border-b border-[#292323] py-2 text-sm text-[#B9B0A8]"><span>{name}</span><span>{money(total)}</span></li>)}</ul> : <p className="mt-3 text-sm text-[#8F877C]">No expenses this month.</p>}</section>
    <RecordManager table="budgets" title="Budgets" intro="Set monthly limits and receive threshold alerts." fields={budgetFields} onRows={onBudgets} columns={[{ label: "Category", render: r => String(r.category) }, { label: "Limit", render: r => money(Number(r.monthly_limit)) }, { label: "Spent this month", render: r => money(byCategory.find(([name]) => name.toLowerCase() === String(r.category).toLowerCase())?.[1] || 0) }, { label: "Status", render: r => { const spent = byCategory.find(([name]) => name.toLowerCase() === String(r.category).toLowerCase())?.[1] || 0; const ratio = spent / Number(r.monthly_limit); return <span className={ratio >= Number(r.alert_threshold) ? "text-red-400" : "text-[#A39168]"}>{Math.round(ratio * 100)}% used</span>; } }]} summary={() => <p className="text-sm text-[#8F877C]">{budgets.length} active category {budgets.length === 1 ? "limit" : "limits"}</p>} /></div>;
}
