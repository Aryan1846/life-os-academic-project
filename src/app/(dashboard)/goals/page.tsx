"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Target,
  Plus,
  MoreVertical,
  Calendar as CalendarIcon,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  CheckSquare,
} from "lucide-react";
import type { GoalWithStats } from "@/types";

function GoalsContent() {
  const searchParams = useSearchParams();
  const [goals, setGoals] = useState<GoalWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'all' | 'in_progress' | 'completed'
  const [activeTab, setActiveTab] = useState<"all" | "in_progress" | "completed">("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithStats | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Personal");
  const [targetDate, setTargetDate] = useState("");
  const [progress, setProgress] = useState(0);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to load goals");
      const data = await res.json();
      setGoals(data.goals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
    if (searchParams.get("create") === "true") {
      openCreateModal();
    }
  }, [fetchGoals, searchParams]);

  function openCreateModal() {
    setEditingGoal(null);
    setTitle("");
    setDescription("");
    setCategory("Personal");
    setTargetDate("");
    setProgress(0);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(goal: GoalWithStats) {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || "");
    setCategory(goal.category || "Personal");
    setTargetDate(goal.target_date || "");
    setProgress(goal.progress || 0);
    setFormError(null);
    setIsModalOpen(true);
    setMenuOpenId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    const payload = {
      title,
      description: description || null,
      category,
      target_date: targetDate || null,
      progress: Number(progress),
      status: Number(progress) >= 100 ? "completed" : "active",
    };

    try {
      const url = editingGoal ? `/api/goals/${editingGoal.id}` : "/api/goals";
      const method = editingGoal ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save goal");

      setIsModalOpen(false);
      fetchGoals();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save goal");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDeleteGoal(id: string) {
    if (!confirm("Are you sure you want to delete this goal? Linked tasks will not be deleted.")) return;

    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete goal");
      fetchGoals();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting goal");
    }
  }

  async function handleQuickProgressUpdate(id: string, newProgress: number) {
    const clamped = Math.max(0, Math.min(100, newProgress));
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, progress: clamped, status: clamped >= 100 ? "completed" : "active" }
          : g
      )
    );

    try {
      await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: clamped,
          status: clamped >= 100 ? "completed" : "active",
        }),
      });
      fetchGoals();
    } catch {
      fetchGoals();
    }
  }

  // Filter goals by tab
  const filteredGoals = goals.filter((g) => {
    if (activeTab === "in_progress") return g.status === "active";
    if (activeTab === "completed") return g.status === "completed";
    return true; // 'all'
  });

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#8B0D18] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls: Filter Tabs & New Goal Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1C1C] pb-4">
        {/* Filter Tabs */}
        <div className="flex items-center space-x-6">
          <button
            onClick={() => setActiveTab("all")}
            className={`text-xs font-medium pb-2 transition-colors relative ${
              activeTab === "all"
                ? "text-[#ECE7E0] border-b-2 border-[#8B0D18]"
                : "text-[#8F877C] hover:text-[#ECE7E0]"
            }`}
          >
            All Goals
          </button>
          <button
            onClick={() => setActiveTab("in_progress")}
            className={`text-xs font-medium pb-2 transition-colors relative ${
              activeTab === "in_progress"
                ? "text-[#ECE7E0] border-b-2 border-[#8B0D18]"
                : "text-[#8F877C] hover:text-[#ECE7E0]"
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`text-xs font-medium pb-2 transition-colors relative ${
              activeTab === "completed"
                ? "text-[#ECE7E0] border-b-2 border-[#8B0D18]"
                : "text-[#8F877C] hover:text-[#ECE7E0]"
            }`}
          >
            Completed
          </button>
        </div>

        {/* New Goal Button */}
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#540911] hover:bg-[#6E0A13] text-white text-xs font-medium transition-colors shadow-crimson-pill self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>New Goal</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[#180A0C] border border-[#3E1116] text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Goals 2-Column Grid Matching Reference */}
      {filteredGoals.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#111111] border border-[#1E1E1E] space-y-3">
          <Target size={32} className="mx-auto text-[#6E6862]" />
          <h3 className="font-serif text-base text-[#ECE7E0]">No goals found in this view</h3>
          <p className="text-xs text-[#8F877C] max-w-sm mx-auto">
            Establish meaningful objectives to direct your daily tasks and long-term focus.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#540911] text-white text-xs rounded-lg hover:bg-[#6E0A13] transition-colors shadow-crimson-pill"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredGoals.map((goal) => (
            <div
              key={goal.id}
              className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5 shadow-card-dark flex flex-col justify-between space-y-4 relative group"
            >
              <div>
                {/* Header: Icon + Title + Menu */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1C1113] border border-[#381116] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Target size={16} className="text-[#8B0D18]" />
                    </div>
                    <div>
                      <h3 className="font-serif text-sm md:text-base font-medium text-[#ECE7E0] tracking-wide">
                        {goal.title}
                      </h3>
                      {goal.category && (
                        <span className="text-[10px] text-[#A39168] font-mono">
                          {goal.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Context Menu Toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === goal.id ? null : goal.id)}
                      className="p-1 text-[#6E6862] hover:text-[#ECE7E0] rounded transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {menuOpenId === goal.id && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setMenuOpenId(null)}
                        />
                        <div className="absolute right-0 mt-1 w-32 bg-[#181818] border border-[#2B2B2B] rounded-lg shadow-card-dark z-30 py-1 text-xs">
                          <button
                            onClick={() => openEditModal(goal)}
                            className="w-full flex items-center space-x-2 px-3 py-1.5 text-[#ECE7E0] hover:bg-[#222222] text-left"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="w-full flex items-center space-x-2 px-3 py-1.5 text-red-400 hover:bg-[#250F12] text-left"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Description */}
                {goal.description && (
                  <p className="text-xs text-[#8F877C] mt-2.5 line-clamp-2 leading-relaxed">
                    {goal.description}
                  </p>
                )}
              </div>

              {/* Progress Bar + Percentage */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#6E6862]">Progress</span>
                  <span className="font-mono text-xs text-[#ECE7E0]">{goal.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#1C1C1C] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#8B0D18] to-[#B31222] rounded-full shadow-crimson-bar transition-all duration-300"
                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                  />
                </div>

                {/* Quick Progress Buttons */}
                <div className="flex items-center justify-end space-x-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {[25, 50, 75, 100].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleQuickProgressUpdate(goal.id, step)}
                      className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                        goal.progress === step
                          ? "bg-[#8B0D18] text-white border-[#8B0D18]"
                          : "bg-[#161616] text-[#8F877C] border-[#252525] hover:text-white hover:border-[#8B0D18]"
                      }`}
                    >
                      {step}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Meta: Target Date & Task Counts */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1C1C1C] text-[11px] text-[#8F877C]">
                <div className="flex items-center space-x-1.5">
                  <CalendarIcon size={12} className="text-[#6E6862]" />
                  <span>
                    {goal.target_date
                      ? `Target: ${new Date(goal.target_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`
                      : "No deadline"}
                  </span>
                </div>

                {goal.total_tasks !== undefined && goal.total_tasks > 0 && (
                  <div className="flex items-center space-x-1 text-[#A39168] font-mono">
                    <CheckSquare size={12} />
                    <span>
                      {goal.completed_tasks}/{goal.total_tasks} tasks
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-[#242424] rounded-xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202020] pb-3">
              <h3 className="font-serif text-lg font-medium text-[#ECE7E0]">
                {editingGoal ? "Edit Goal" : "Create New Goal"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#6E6862] hover:text-[#ECE7E0]"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded bg-[#200A0D] border border-[#4A141A] text-red-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#ECE7E0] mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Build a stronger body"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] placeholder-[#5A544E] focus:outline-none focus:border-[#8B0D18]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#ECE7E0] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Reach 12% body fat and lift consistently"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] placeholder-[#5A544E] focus:outline-none focus:border-[#8B0D18]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#ECE7E0] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] focus:outline-none focus:border-[#8B0D18]"
                  >
                    <option value="Health">Health</option>
                    <option value="Career">Career</option>
                    <option value="Finance">Finance</option>
                    <option value="Personal">Personal</option>
                    <option value="Education">Education</option>
                    <option value="Relationships">Relationships</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#ECE7E0] mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] focus:outline-none focus:border-[#8B0D18]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#ECE7E0]">Progress ({progress}%)</label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-[#8B0D18] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#202020]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#2A2A2A] text-xs text-[#8F877C] hover:text-[#ECE7E0] hover:bg-[#1E1E1E] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#540911] hover:bg-[#6E0A13] text-white text-xs font-medium transition-colors shadow-crimson-pill disabled:opacity-50"
                >
                  {formSubmitting ? "Saving..." : editingGoal ? "Update Goal" : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-80 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#8B0D18] border-t-transparent animate-spin" />
        </div>
      }
    >
      <GoalsContent />
    </Suspense>
  );
}
