"use client";
import { RecordManager, type Field } from "@/components/phase3/record-manager";

const fields: Field[] = [
  { key: "type", label: "Type", kind: "select", options: ["skill", "certification", "milestone", "course", "project", "idea", "application"], required: true },
  { key: "title", label: "Title", required: true },
  { key: "status", label: "Status", kind: "select", options: ["planned", "in_progress", "completed", "abandoned"], required: true },
  { key: "goal_id", label: "Linked goal", source: "goals" },
  { key: "target_date", label: "Target date", kind: "date" },
  { key: "metadata.organization", label: "School, company or organization" },
  { key: "metadata.grade", label: "Grade or result" },
  { key: "metadata.study_plan", label: "Study plan", kind: "textarea" },
  { key: "metadata.application_stage", label: "Application stage" },
  { key: "metadata.skill_level", label: "Skill level" },
  { key: "metadata.business_notes", label: "Business progress" },
  { key: "description", label: "Description", kind: "textarea" },
];
export default function CareerPage() {
  return <RecordManager table="career_items" title="Career, Education & Business" intro="Track skills, courses, applications, professional goals and business projects." fields={fields} columns={[{ label: "Type", render: r => String(r.type) }, { label: "Title", render: r => String(r.title) }, { label: "Status", render: r => String(r.status).replaceAll("_", " ") }, { label: "Target", render: r => String(r.target_date || "—") }, { label: "Details", render: r => { const m = r.metadata as Record<string, string> | null; return [m?.organization, m?.grade, m?.application_stage].filter(Boolean).join(" · ") || "—"; } }]} summary={items => <div className="grid gap-4 sm:grid-cols-3">{["skill", "course", "application"].map(type => <div key={type} className="rounded-xl border border-[#292323] bg-[#111] p-5"><p className="text-xs capitalize text-[#A39168]">{type}s</p><p className="mt-2 font-serif text-xl text-[#ECE7E0]">{items.filter(i => i.type === type).length}</p></div>)}</div>} />;
}
