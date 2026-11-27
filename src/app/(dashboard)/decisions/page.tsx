"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { decisionInputSchema, type DecisionInput } from "@/lib/decision/schema";
import { analysisSchema, type DecisionAnalysis } from "@/lib/ai/decision-evaluator";

type Summary = { id: string; title: string; status: string; updated_at: string; last_error: string | null };
type Decision = Summary & { problem_description: string; input_snapshot: DecisionInput; context_snapshot: Record<string, unknown> | null; final_choice: string | null; outcome_notes: string | null };
type Evaluation = { id: string; version: number; ai_provider: string; ai_model: string; deterministic_scores: Record<string, { criterionScores: Record<string, number>; totalScore: number; rank: number }>; ranking: { alternative_id: string; rank: number; total_score: number }[]; analysis: DecisionAnalysis; sensitivity: { criterionId: string; currentWeight: number; tippingWeight: number | null; competingAlternativeId: string | null }[]; excluded: Record<string, string[]>; penalties: Record<string, string[]>; normalized_weights: Record<string, number>; input_snapshot: DecisionInput; final_choice: string | null; outcome_notes: string | null; evaluated_at: string };
type Detail = { decision: Decision; evaluations: Evaluation[] };
const blank = (): DecisionInput => ({ title: "", problemDescription: "", alternatives: [], criteria: [], scores: [], contextAreas: [], consentExternal: false });
const panel = "rounded-xl border border-[#302626] bg-[#111] p-5";
const field = "w-full rounded-lg border border-[#3D3232] bg-[#1B1B1B] px-3 py-2 text-sm text-[#ECE7E0] outline-none focus:border-[#8B0D18]";
const button = "rounded-lg bg-[#7D101B] px-4 py-2 text-sm text-white transition-colors hover:bg-[#A21324] disabled:opacity-40";
const subtle = "rounded-lg border border-[#453333] px-3 py-2 text-sm text-[#CDBEB6] hover:bg-[#251719] disabled:opacity-40";
const areas = ["goals", "finance", "health", "career"] as const;
const scoreValue = (value: string): number | string => value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : value.trim().toLowerCase();
function streamingNarrative(raw: string): string {
  const marker = /"reasoning"\s*:\s*"/.exec(raw);
  if (!marker) return "Receiving structured analysis…";
  let text = ""; let escaped = false;
  for (const char of raw.slice(marker.index + marker[0].length)) {
    if (escaped) { text += char === "n" ? "\n" : char; escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (char === '"') break;
    text += char;
  }
  return text || "Receiving reasoning…";
}

export default function DecisionsPage() {
  const [list, setList] = useState<Summary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [input, setInput] = useState<DecisionInput>(blank);
  const [step, setStep] = useState(0);
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [streamPreview, setStreamPreview] = useState("");

  const loadList = useCallback(async () => {
    const response = await fetch("/api/decisions", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load decisions");
    setList(body.decisions || []);
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    const response = await fetch(`/api/decisions/${id}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Could not load decision");
    const next = body as Detail;
    setDetail(next);
    const parsedInput = decisionInputSchema.safeParse(next.decision.input_snapshot);
    setInput(parsedInput.success ? parsedInput.data : { ...blank(), title: next.decision.title, problemDescription: next.decision.problem_description });
    setVersion(next.evaluations[0]?.version ?? null);
    setStep(next.decision.status === "evaluated" || next.decision.status === "closed" ? 4 : next.decision.status === "context_attached" || next.decision.status === "evaluating" ? 3 : 0);
  }, []);
  useEffect(() => { void (async () => { try { await loadList(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load decisions"); } finally { setLoading(false); } })(); }, [loadList]);
  async function open(id: string) { setLoading(true); setError(""); try { setSelected(id); await loadDetail(id); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load decision"); } finally { setLoading(false); } }
  function startNew() { setSelected(null); setDetail(null); setInput(blank()); setVersion(null); setStep(0); setError(""); }
  async function saveDraft() {
    const checked = decisionInputSchema.safeParse(input);
    if (!checked.success) { setError(checked.error.issues[0]?.message || "Complete the decision fields"); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(selected ? `/api/decisions/${selected}` : "/api/decisions", { method: selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selected ? { action: "save", input } : input) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save draft");
      const id = selected || body.decision.id;
      setSelected(id);
      await Promise.all([loadList(), loadDetail(id)]);
      setStep(3);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save draft"); }
    finally { setBusy(false); }
  }
  async function action(name: "prepare" | "revise" | "close", finalChoice?: string) {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/decisions/${selected}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, ...(name === "close" ? { finalChoice, outcomeNotes: detail?.decision.outcome_notes || "" } : {}) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Decision action failed");
      await Promise.all([loadList(), loadDetail(selected)]);
      if (name === "revise") setStep(0);
      if (name === "prepare") setStep(3);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Decision action failed"); }
    finally { setBusy(false); }
  }
  async function evaluate() {
    if (!selected) return;
    setBusy(true); setError(""); setStreamPreview("");
    try {
      const response = await fetch(`/api/decisions/${selected}/evaluate?stream=1`, { method: "POST" });
      if (!response.ok || !response.body) throw new Error("Could not start evaluation stream");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ""; let completed = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";
        for (const frame of frames) {
          const event = frame.match(/^event: (.+)$/m)?.[1];
          const json = frame.match(/^data: (.+)$/m)?.[1];
          if (!json) continue;
          const payload = JSON.parse(json);
          if (event === "token") setStreamPreview(previous => previous + String(payload.text || ""));
          if (event === "error") throw new Error(payload.error || "Evaluation failed");
          if (event === "done") completed = true;
        }
      }
      if (!completed) throw new Error("Evaluation stream ended before completion");
      await Promise.all([loadList(), loadDetail(selected)]);
      setStep(4);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Evaluation failed"); await loadDetail(selected).catch(() => undefined); }
    finally { setBusy(false); }
  }
  function addAlternative() { setInput(previous => ({ ...previous, alternatives: [...previous.alternatives, { id: crypto.randomUUID(), title: "", description: "" }] })); }
  function addCriterion() { setInput(previous => ({ ...previous, criteria: [...previous.criteria, { id: crypto.randomUUID(), name: "", weight: 1, direction: "benefit", hardConstraint: null, softConstraint: null }] })); }
  function setScore(alternativeId: string, criterionId: string, fieldName: "score" | "rawValue", value: string) {
    setInput(previous => {
      const key = (item: DecisionInput["scores"][number]) => item.alternativeId === alternativeId && item.criterionId === criterionId;
      const current = previous.scores.find(key) || { alternativeId, criterionId, score: "" };
      const updated = { ...current, [fieldName]: fieldName === "score" ? scoreValue(value) : value.trim() === "" ? undefined : Number(value) };
      return { ...previous, scores: [...previous.scores.filter(item => !key(item)), updated] };
    });
  }
  const editAllowed = !detail || ["draft", "criteria_defined"].includes(detail.decision.status);
  const dirty = !!detail && JSON.stringify(input) !== JSON.stringify(decisionInputSchema.safeParse(detail.decision.input_snapshot).success ? decisionInputSchema.parse(detail.decision.input_snapshot) : detail.decision.input_snapshot);
  const candidate = detail?.evaluations.find(item => item.version === version);
  const evaluation = candidate && decisionInputSchema.safeParse(candidate.input_snapshot).success && analysisSchema.safeParse(candidate.analysis).success ? candidate : null;
  const evaluatedInput = evaluation?.input_snapshot || input;
  const names = Object.fromEntries(evaluatedInput.alternatives.map(item => [item.id, item.title]));
  function weightedCell(alternativeId: string, criterion: DecisionInput["criteria"][number]) {
    const raw = evaluation?.deterministic_scores[alternativeId]?.criterionScores[criterion.id];
    if (raw == null) return "—";
    let effective = criterion.direction === "cost" ? 10 - raw : raw;
    const measured = evaluatedInput.scores.find(item => item.alternativeId === alternativeId && item.criterionId === criterion.id)?.rawValue ?? raw;
    if (criterion.softConstraint) {
      const passes = criterion.softConstraint.operator === "<=" ? measured <= criterion.softConstraint.value : measured >= criterion.softConstraint.value;
      if (!passes) effective = Math.max(0, effective - criterion.softConstraint.penalty);
    }
    const weight = evaluation?.normalized_weights[criterion.id] || 0;
    return `${raw} → ${effective.toFixed(1)} × ${weight.toFixed(2)} = ${(effective * weight).toFixed(2)}`;
  }

  return <div className="space-y-6 pb-12 text-[#ECE7E0]">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.3em] text-[#A39168]">Life OS · Advisory</p><h1 className="mt-2 font-serif text-3xl">Decision Support</h1><p className="mt-2 text-sm text-[#9C9188]">Your scores determine the ranking. AI explains trade-offs and uncertainty.</p></div><button className={button} onClick={startNew}>New decision</button></header>
    {error && <p role="alert" className="rounded-lg border border-red-900 bg-[#240E11] p-4 text-sm text-red-300">{error}</p>}
    {loading && <p className="text-sm text-[#9C9188]">Loading decisions…</p>}
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className={panel}><h2 className="font-serif text-lg">History</h2><div className="mt-4 space-y-2">{list.length ? list.map(item => <button key={item.id} onClick={() => void open(item.id)} className={`w-full rounded-lg border p-3 text-left text-sm ${selected === item.id ? "border-[#8B0D18] bg-[#261316]" : "border-[#302626] bg-[#181818]"}`}><span className="block font-medium">{item.title}</span><span className="mt-1 block text-xs capitalize text-[#A39168]">{item.status.replaceAll("_", " ")}</span><time className="text-xs text-[#776D67]">{new Date(item.updated_at).toLocaleDateString("en-IN")}</time></button>) : <p className="text-sm text-[#8F877C]">No decisions yet.</p>}</div></aside>
      <main className="min-w-0 space-y-5">
        <nav aria-label="Decision steps" className="flex flex-wrap gap-2">{["Problem", "Alternatives", "Criteria & scores", "Privacy & review", "Results"].map((label, index) => <button key={label} onClick={() => setStep(index)} className={`rounded-full px-3 py-1 text-xs ${step === index ? "bg-[#7D101B] text-white" : "border border-[#3D3232] text-[#B4AAA0]"}`}>{index + 1}. {label}</button>)}</nav>
        {step === 0 && <section className={panel}><h2 className="font-serif text-xl">Define the problem</h2><label className="mt-5 block text-sm">Decision title<input className={`${field} mt-2`} value={input.title} disabled={!editAllowed} maxLength={160} onChange={event => setInput({ ...input, title: event.target.value })} /></label><label className="mt-4 block text-sm">What choice are you making?<textarea className={`${field} mt-2 min-h-32`} value={input.problemDescription} disabled={!editAllowed} maxLength={3000} onChange={event => setInput({ ...input, problemDescription: event.target.value })} /></label><button className={`${button} mt-5`} onClick={() => setStep(1)}>Continue</button></section>}
        {step === 1 && <section className={panel}><h2 className="font-serif text-xl">Alternatives</h2><p className="mt-2 text-xs text-[#9C9188]">Add at least two options. Each needs a distinct title.</p><div className="mt-4 space-y-4">{input.alternatives.map((item, index) => <div key={item.id} className="rounded-lg border border-[#302626] p-3"><div className="flex gap-2"><input aria-label={`Alternative ${index + 1} title`} className={field} placeholder={`Option ${index + 1}`} value={item.title} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, alternatives: previous.alternatives.map(alt => alt.id === item.id ? { ...alt, title: event.target.value } : alt) }))} /><button disabled={!editAllowed} className={subtle} onClick={() => setInput(previous => ({ ...previous, alternatives: previous.alternatives.filter(alt => alt.id !== item.id), scores: previous.scores.filter(score => score.alternativeId !== item.id) }))}>Remove</button></div><textarea aria-label={`Alternative ${index + 1} description`} className={`${field} mt-2`} placeholder="Evidence, assumptions or details" value={item.description} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, alternatives: previous.alternatives.map(alt => alt.id === item.id ? { ...alt, description: event.target.value } : alt) }))} /></div>)}</div><div className="mt-4 flex gap-3"><button disabled={!editAllowed || input.alternatives.length >= 12} className={subtle} onClick={addAlternative}>Add alternative</button><button className={button} onClick={() => setStep(2)}>Continue</button></div></section>}
        {step === 2 && <section className={panel}><h2 className="font-serif text-xl">Criteria and scores</h2><p className="mt-2 text-xs text-[#9C9188]">Weights are normalized to 100%. Cost scores are inverted; lower is better. Enter 0–10, Low/Medium/High, or likert:1–5.</p><div className="mt-4 space-y-4">{input.criteria.map((criterion, index) => <div key={criterion.id} className="rounded-lg border border-[#302626] p-4"><div className="grid gap-2 sm:grid-cols-[1fr_100px_120px_auto]"><input aria-label={`Criterion ${index + 1} name`} className={field} placeholder="Criterion" value={criterion.name} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, criteria: previous.criteria.map(item => item.id === criterion.id ? { ...item, name: event.target.value } : item) }))} /><input aria-label={`Criterion ${index + 1} weight`} className={field} type="number" min="0" max="100" step="0.1" value={criterion.weight} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, criteria: previous.criteria.map(item => item.id === criterion.id ? { ...item, weight: Number(event.target.value) } : item) }))} /><select aria-label={`Criterion ${index + 1} direction`} className={field} value={criterion.direction} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, criteria: previous.criteria.map(item => item.id === criterion.id ? { ...item, direction: event.target.value as "benefit" | "cost" } : item) }))}><option value="benefit">Benefit</option><option value="cost">Cost</option></select><button disabled={!editAllowed} className={subtle} onClick={() => setInput(previous => ({ ...previous, criteria: previous.criteria.filter(item => item.id !== criterion.id), scores: previous.scores.filter(score => score.criterionId !== criterion.id) }))}>Remove</button></div><label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={!!criterion.hardConstraint} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, criteria: previous.criteria.map(item => item.id === criterion.id ? { ...item, hardConstraint: event.target.checked ? { operator: "<=", value: 0 } : null } : item) }))} />Hard constraint on measured value</label>{criterion.hardConstraint && <div className="mt-2 flex gap-2"><select aria-label={`${criterion.name} constraint operator`} className={field} value={criterion.hardConstraint.operator} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, criteria: previous.criteria.map(item => item.id === criterion.id ? { ...item, hardConstraint: { ...item.hardConstraint!, operator: event.target.value as "<=" | ">=" } } : item) }))}><option value="<=">At most</option><option value=">=">At least</option></select><input aria-label={`${criterion.name} constraint threshold`} className={field} type="number" value={criterion.hardConstraint.value} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, criteria: previous.criteria.map(item => item.id === criterion.id ? { ...item, hardConstraint: { ...item.hardConstraint!, value: Number(event.target.value) } } : item) }))} /></div>}<label className="mt-3 flex items-center gap-2 text-xs"><input type="checkbox" checked={!!criterion.softConstraint} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, criteria: previous.criteria.map(item => item.id === criterion.id ? { ...item, softConstraint: event.target.checked ? { operator: "<=", value: 0, penalty: 1 } : null } : item) }))} />Soft constraint with score penalty</label>{criterion.softConstraint && <div className="mt-2 grid gap-2 sm:grid-cols-3"><select aria-label={`${criterion.name} soft operator`} className={field} value={criterion.softConstraint.operator} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, criteria: previous.criteria.map(item => item.id === criterion.id ? { ...item, softConstraint: { ...item.softConstraint!, operator: event.target.value as "<=" | ">=" } } : item) }))}><option value="<=">At most</option><option value=">=">At least</option></select><input aria-label={`${criterion.name} soft threshold`} className={field} type="number" value={criterion.softConstraint.value} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, criteria: previous.criteria.map(item => item.id === criterion.id ? { ...item, softConstraint: { ...item.softConstraint!, value: Number(event.target.value) } } : item) }))} /><input aria-label={`${criterion.name} soft penalty`} className={field} type="number" min="0" max="10" step="0.1" value={criterion.softConstraint.penalty} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, criteria: previous.criteria.map(item => item.id === criterion.id ? { ...item, softConstraint: { ...item.softConstraint!, penalty: Number(event.target.value) } } : item) }))} /></div>}</div>)}</div><button disabled={!editAllowed || input.criteria.length >= 12} className={`${subtle} mt-4`} onClick={addCriterion}>Add criterion</button><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[540px] text-left text-xs"><thead><tr><th className="p-2">Alternative</th>{input.criteria.map(criterion => <th className="p-2" key={criterion.id}>{criterion.name || "Criterion"}</th>)}</tr></thead><tbody>{input.alternatives.map(alt => <tr key={alt.id} className="border-t border-[#302626]"><th className="p-2">{alt.title || "Untitled"}</th>{input.criteria.map(criterion => { const score = input.scores.find(item => item.alternativeId === alt.id && item.criterionId === criterion.id); return <td key={criterion.id} className="p-2"><input aria-label={`${alt.title} ${criterion.name} score`} className={field} placeholder="0–10 or Low/High" value={score?.score ?? ""} disabled={!editAllowed} onChange={event => setScore(alt.id, criterion.id, "score", event.target.value)} />{(criterion.hardConstraint || criterion.softConstraint) && <input aria-label={`${alt.title} ${criterion.name} measured value`} className={`${field} mt-1`} type="number" placeholder="Measured value" value={score?.rawValue ?? ""} disabled={!editAllowed} onChange={event => setScore(alt.id, criterion.id, "rawValue", event.target.value)} />}</td>; })}</tr>)}</tbody></table></div><button className={`${button} mt-5`} onClick={() => setStep(3)}>Review</button></section>}
        {step === 3 && <section className={panel}><h2 className="font-serif text-xl">Privacy and review</h2><p className="mt-2 text-sm text-[#B4AAA0]">Only selected summaries permitted by your Settings privacy switches can be attached. External AI receives the decision text and scores; personal context is sent only with explicit consent.</p><div className="mt-4 flex flex-wrap gap-4">{areas.map(area => <label key={area} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={input.contextAreas.includes(area)} disabled={!editAllowed} onChange={event => setInput(previous => ({ ...previous, contextAreas: event.target.checked ? [...previous.contextAreas, area] : previous.contextAreas.filter(item => item !== area) }))} />{area}</label>)}</div><label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={input.consentExternal} disabled={!editAllowed} onChange={event => setInput({ ...input, consentExternal: event.target.checked })} />I explicitly consent to sending the selected, privacy-permitted personal summaries to the configured external AI provider.</label><div className="mt-5 space-y-1 rounded-lg border border-[#302626] p-4 text-sm text-[#B4AAA0]"><p><b>Problem:</b> {input.problemDescription || "Not entered"}</p><p><b>Alternatives:</b> {input.alternatives.map(item => item.title).join(", ") || "None"}</p><p><b>Criteria:</b> {input.criteria.map(item => `${item.name} (${item.weight}, ${item.direction}${item.hardConstraint ? `, hard ${item.hardConstraint.operator} ${item.hardConstraint.value}` : ""})`).join("; ") || "None"}</p><p><b>Scores entered:</b> {input.scores.length} of {input.alternatives.length * input.criteria.length}</p><p><b>Context:</b> {input.contextAreas.join(", ") || "None"}</p></div>{detail?.decision.context_snapshot && <p className="mt-3 text-xs text-[#A39168]">Prepared context: {JSON.stringify(detail.decision.context_snapshot)}</p>}{detail?.decision.last_error && <p className="mt-3 text-sm text-red-300">Previous attempt: {detail.decision.last_error}</p>}{busy && streamPreview && <div className="mt-4 rounded-lg border border-[#4A3030] bg-[#1A1515] p-3"><p className="text-xs text-[#A39168]">Streaming reasoning · unverified until complete</p><p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-sm text-[#B4AAA0]">{streamingNarrative(streamPreview)}</p></div>}<div className="mt-5 flex flex-wrap gap-3">{editAllowed && <button disabled={busy} className={subtle} onClick={() => void saveDraft()}>{busy ? "Saving…" : "Save draft"}</button>}{detail?.decision.status === "criteria_defined" && <button disabled={busy || dirty} title={dirty ? "Save changes before preparing" : "Review permitted context"} className={button} onClick={() => void action("prepare")}>Prepare context</button>}{detail?.decision.status === "context_attached" && <button disabled={busy} className={button} onClick={() => void evaluate()}>{busy ? "Evaluating…" : "Evaluate decision"}</button>}{detail && !editAllowed && detail.decision.status !== "evaluating" && <button disabled={busy} className={subtle} onClick={() => void action("revise")}>Revise inputs</button>}{detail?.decision.status === "evaluating" && <button disabled={busy} className={subtle} onClick={() => void evaluate()}>Retry interrupted evaluation after 90 seconds</button>}</div></section>}
        {step === 4 && <section className="space-y-5">{evaluation ? <><div className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.25em] text-[#A39168]">Advisory only · You make the final choice</p><h2 className="mt-2 font-serif text-2xl">Evaluation results</h2></div><select aria-label="Evaluation version" className={field + " w-auto"} value={version ?? ""} onChange={event => setVersion(Number(event.target.value))}>{detail?.evaluations.map(item => <option key={item.id} value={item.version}>Version {item.version} · {new Date(item.evaluated_at).toLocaleDateString("en-IN")}</option>)}</select></div><p className="mt-3 text-xs text-[#9C9188]">{evaluation.ai_provider === "mock" ? "Simulated local evaluation · no external AI used" : `${evaluation.ai_provider} · ${evaluation.ai_model}`}</p>{evaluation.final_choice && <p className="mt-3 text-sm text-[#A39168]">Recorded choice for this version: {names[evaluation.final_choice] || evaluation.final_choice}{evaluation.outcome_notes ? ` · ${evaluation.outcome_notes}` : ""}</p>}{evaluation.ranking.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{evaluation.ranking.map(item => <div key={item.alternative_id} className="rounded-lg border border-[#4A3030] bg-[#1B1515] p-4"><p className="text-xs text-[#A39168]">Rank {item.rank}</p><p className="mt-1 font-serif text-lg">{names[item.alternative_id]}</p><p className="mt-2 text-2xl">{item.total_score.toFixed(2)} <span className="text-xs text-[#8F877C]">/ 10</span></p></div>)}</div> : <p className="mt-4 text-sm text-red-300">No alternative passes every hard constraint.</p>}</div><div className={panel}><h3 className="font-serif text-lg">Score comparison</h3><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={evaluation.ranking.map(item => ({ name: names[item.alternative_id], score: item.total_score }))}><CartesianGrid stroke="#302626" /><XAxis dataKey="name" tick={{ fill: "#9C9188", fontSize: 11 }} /><YAxis domain={[0, 10]} tick={{ fill: "#9C9188" }} /><Tooltip contentStyle={{ background: "#181818", border: "1px solid #4A3030" }} /><Bar dataKey="score" fill="#8B0D18" /></BarChart></ResponsiveContainer></div></div><div className={panel}><h3 className="font-serif text-lg">Criteria comparison matrix</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr><th className="p-2">Alternative</th>{evaluatedInput.criteria.map(item => <th key={item.id} className="p-2">{item.name}<span className="block text-xs text-[#8F877C]">{Math.round((evaluation.normalized_weights[item.id] || 0) * 100)}% · {item.direction}</span></th>)}</tr></thead><tbody>{evaluatedInput.alternatives.map(alt => <tr key={alt.id} className="border-t border-[#302626]"><th className="p-2">{alt.title}</th>{evaluatedInput.criteria.map(criterion => <td key={criterion.id} className="p-2">{weightedCell(alt.id, criterion)}</td>)}</tr>)}</tbody></table></div></div><div className={panel}><h3 className="font-serif text-lg">Sensitivity and constraints</h3><div className="mt-3 space-y-2 text-sm text-[#B4AAA0]">{evaluation.sensitivity.map(item => <p key={item.criterionId}>{evaluatedInput.criteria.find(criterion => criterion.id === item.criterionId)?.name}: current {Math.round(item.currentWeight * 100)}%; {item.tippingWeight == null ? "no ranking change found within 0–100%" : `a tie with ${names[item.competingAlternativeId || ""]} occurs near ${Math.round(item.tippingWeight * 100)}%`}</p>)}{Object.entries(evaluation.excluded).map(([id, reasons]) => <p key={id} className="text-red-300">{names[id]} excluded: {reasons.join("; ")}</p>)}{Object.entries(evaluation.penalties || {}).map(([id, reasons]) => <p key={`penalty-${id}`} className="text-[#A39168]">{names[id]} soft penalty: {reasons.join("; ")}</p>)}</div></div><div className={panel}><h3 className="font-serif text-lg">Qualitative analysis</h3><p className="mt-3 whitespace-pre-wrap text-sm text-[#C9BEB5]">{evaluation.analysis.reasoning}</p><h4 className="mt-5 text-sm font-semibold text-[#A39168]">Trade-offs</h4><p className="mt-2 text-sm text-[#C9BEB5]">{evaluation.analysis.tradeOffAnalysis}</p><h4 className="mt-5 text-sm font-semibold text-[#A39168]">Advisory recommendation</h4><p className="mt-2 text-sm text-[#C9BEB5]">{evaluation.analysis.recommendation}</p><div className="mt-5 grid gap-4 md:grid-cols-2">{evaluation.analysis.alternatives.map(item => <div key={item.id} className="rounded-lg border border-[#302626] p-3"><p className="font-serif">{names[item.id]}</p><p className="mt-2 text-xs text-[#A39168]">Strengths</p><ul className="list-inside list-disc text-sm text-[#B4AAA0]">{item.strengths.map((text, index) => <li key={index}>{text}</li>)}</ul><p className="mt-2 text-xs text-[#A39168]">Weaknesses</p><ul className="list-inside list-disc text-sm text-[#B4AAA0]">{item.weaknesses.map((text, index) => <li key={index}>{text}</li>)}</ul></div>)}</div><div className="mt-5 grid gap-4 md:grid-cols-3">{[["Risks", evaluation.analysis.risks], ["Uncertainty", evaluation.analysis.uncertainties], ["Next steps", evaluation.analysis.nextSteps]].map(([label, values]) => <div key={String(label)}><h4 className="text-sm text-[#A39168]">{label as string}</h4><ul className="mt-2 list-inside list-disc text-sm text-[#B4AAA0]">{(values as string[]).map((text, index) => <li key={index}>{text}</li>)}</ul></div>)}</div></div>{detail?.decision.status === "evaluated" && <div className={panel}><h3 className="font-serif text-lg">Close this decision</h3><p className="mt-2 text-xs text-[#9C9188]">Your final choice can differ from the advisory ranking.</p><select aria-label="Final choice" className={`${field} mt-3`} value={detail.decision.final_choice || ""} onChange={event => setDetail(previous => previous ? { ...previous, decision: { ...previous.decision, final_choice: event.target.value } } : previous)}><option value="">Select your choice</option>{input.alternatives.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select><textarea aria-label="Outcome notes" className={`${field} mt-3`} placeholder="Why did you choose it?" value={detail.decision.outcome_notes || ""} onChange={event => setDetail(previous => previous ? { ...previous, decision: { ...previous.decision, outcome_notes: event.target.value } } : previous)} /><button disabled={busy || !detail.decision.final_choice} className={`${button} mt-3`} onClick={() => void action("close", detail.decision.final_choice || undefined)}>Close decision</button></div>}{detail?.decision.status === "closed" && <p className="text-sm text-[#A39168]">Closed with {names[detail.decision.final_choice || ""] || "your chosen alternative"}. {detail.decision.outcome_notes}</p>}{detail && ["evaluated", "closed"].includes(detail.decision.status) && <button className={subtle} onClick={() => void action("revise")}>Reopen and revise</button>}</> : <div className={panel}><p className="text-sm text-[#8F877C]">No evaluation yet. Complete the wizard to see results.</p></div>}</section>}
      </main>
    </div>
  </div>;
}
