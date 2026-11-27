"use client";
import { RecordManager, type Field, type Row } from "@/components/phase3/record-manager";
import { useCallback, useState } from "react";

const contactFields: Field[] = [{ key: "name", label: "Name", required: true }, { key: "relationship_type", label: "Relationship" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "tags", label: "Tags (comma separated)", kind: "tags" }, { key: "notes", label: "Notes", kind: "textarea" }];
const interactionFields: Field[] = [{ key: "contact_id", label: "Contact", source: "contacts", required: true }, { key: "type", label: "Interaction type", kind: "select", options: ["call", "meeting", "message", "email", "other"], required: true }, { key: "interaction_date", label: "Date", kind: "date", required: true }, { key: "notes", label: "Notes", kind: "textarea" }];
export default function RelationshipsPage() {
  const [contacts, setContacts] = useState<Row[]>([]);
  const onContacts = useCallback((rows: Row[]) => setContacts(rows), []);
  return <div className="space-y-10"><RecordManager table="contacts" title="Relationships" intro="Keep your personal and professional network organized." fields={contactFields} onRows={onContacts} columns={[{ label: "Name", render: r => String(r.name) }, { label: "Relationship", render: r => String(r.relationship_type || "—") }, { label: "Email", render: r => String(r.email || "—") }, { label: "Tags", render: r => ((r.tags as string[]) || []).join(", ") || "—" }, { label: "Notes", render: r => String(r.notes || "—") }]} summary={items => <p className="text-sm text-[#A39168]">{items.length} contacts</p>} />
    <RecordManager table="interactions" title="Interaction history" intro="Log calls, meetings and messages. Schedule follow-ups from Calendar." fields={interactionFields} columns={[{ label: "Date", render: r => String(r.interaction_date) }, { label: "Contact", render: r => String(contacts.find(c => c.id === r.contact_id)?.name || "Deleted contact") }, { label: "Type", render: r => String(r.type) }, { label: "Notes", render: r => String(r.notes || "—") }]} /></div>;
}
