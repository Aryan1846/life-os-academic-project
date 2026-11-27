"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  RotateCcw,
  Plus,
  Flame,
  Trophy,
  Check,
  MoreVertical,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import type { Habit } from "@/types";

interface EnrichedHabit extends Habit {
  isCompletedToday?: boolean;
  totalCompletions?: number;
  recentActivity?: { dateStr: string; dayLabel: string; isCompleted: boolean }[];
}

function HabitsContent() {
  const searchParams = useSearchParams();
  const [habits, setHabits] = useState<EnrichedHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<EnrichedHabit | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [targetCount, setTargetCount] = useState(1);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch("/api/habits");
      if (!res.ok) throw new Error("Failed to load habits");
      const data = await res.json();
      setHabits(data.habits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading habits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
    if (searchParams.get("create") === "true") {
      openCreateModal();
    }
  }, [fetchHabits, searchParams]);

  function openCreateModal() {
    setEditingHabit(null);
    setTitle("");
    setDescription("");
    setFrequency("daily");
    setTargetCount(1);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(habit: EnrichedHabit) {
    setEditingHabit(habit);
    setTitle(habit.title);
    setDescription(habit.description || "");
    setFrequency(habit.frequency);
    setTargetCount(habit.target_count || 1);
    setFormError(null);
    setIsModalOpen(true);
    setMenuOpenId(null);
  }

  async function toggleCheckIn(habitId: string, isCompletedToday: boolean) {
    // Optimistic toggle
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const newStatus = !isCompletedToday;
        const streakDelta = newStatus ? 1 : -1;
        return {
          ...h,
          isCompletedToday: newStatus,
          current_streak: Math.max(0, (h.current_streak || 0) + streakDelta),
        };
      })
    );

    try {
      if (isCompletedToday) {
        await fetch(`/api/habits/${habitId}/log`, { method: "DELETE" });
      } else {
        await fetch(`/api/habits/${habitId}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      }
      fetchHabits();
    } catch {
      fetchHabits();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    const payload = {
      title,
      description: description || null,
      frequency,
      target_count: Number(targetCount),
    };

    try {
      const url = editingHabit ? `/api/habits/${editingHabit.id}` : "/api/habits";
      const method = editingHabit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save habit");

      setIsModalOpen(false);
      fetchHabits();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error saving habit");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDeleteHabit(id: string) {
    if (!confirm("Are you sure you want to delete this habit and its historical logs?")) return;

    try {
      const res = await fetch(`/api/habits/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete habit");
      fetchHabits();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting habit");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header: Sub-Tabs & New Habit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1C1C] pb-4">
        {/* Module Sub-Tabs (Tasks | Habits) */}
        <div className="flex items-center space-x-6">
          <Link
            href="/tasks"
            className="text-xs font-medium pb-2 transition-colors relative text-[#8F877C] hover:text-[#ECE7E0]"
          >
            Tasks
          </Link>
          <Link
            href="/habits"
            className="text-xs font-medium pb-2 transition-colors relative text-[#ECE7E0] border-b-2 border-[#8B0D18]"
          >
            Habits
          </Link>
        </div>

        {/* New Habit Button */}
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#540911] hover:bg-[#6E0A13] text-white text-xs font-medium transition-colors shadow-crimson-pill self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>New Habit</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[#180A0C] border border-[#3E1116] text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Habit Cards Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#8B0D18] border-t-transparent animate-spin" />
        </div>
      ) : habits.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#111111] border border-[#1E1E1E] space-y-3">
          <RotateCcw size={32} className="mx-auto text-[#6E6862]" />
          <h3 className="font-serif text-base text-[#ECE7E0]">No habits established yet</h3>
          <p className="text-xs text-[#8F877C] max-w-sm mx-auto">
            Build discipline with recurring habits. Track deterministic daily streaks and weekly consistency.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#540911] text-white text-xs rounded-lg hover:bg-[#6E0A13] transition-colors shadow-crimson-pill"
          >
            Create Your First Habit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {habits.map((habit) => {
            const isDoneToday = !!habit.isCompletedToday;

            return (
              <div
                key={habit.id}
                className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5 shadow-card-dark flex flex-col justify-between space-y-5 relative group"
              >
                <div>
                  {/* Card Header: Title + Frequency + Options */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1C1113] border border-[#381116] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <RotateCcw size={15} className="text-[#8B0D18]" />
                      </div>
                      <div>
                        <h3 className="font-serif text-sm md:text-base font-medium text-[#ECE7E0] tracking-wide">
                          {habit.title}
                        </h3>
                        <span className="text-[10px] text-[#A39168] font-mono capitalize">
                          {habit.frequency}
                          {habit.target_count > 1 ? ` (${habit.target_count}x)` : ""}
                        </span>
                      </div>
                    </div>

                    {/* Context Menu Toggle */}
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === habit.id ? null : habit.id)}
                        className="p-1 text-[#6E6862] hover:text-[#ECE7E0] rounded transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {menuOpenId === habit.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setMenuOpenId(null)}
                          />
                          <div className="absolute right-0 mt-1 w-28 bg-[#181818] border border-[#2B2B2B] rounded-lg shadow-card-dark z-30 py-1 text-xs">
                            <button
                              onClick={() => openEditModal(habit)}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 text-[#ECE7E0] hover:bg-[#222222] text-left"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteHabit(habit.id)}
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
                  {habit.description && (
                    <p className="text-xs text-[#8F877C] mt-2.5 line-clamp-2 leading-relaxed">
                      {habit.description}
                    </p>
                  )}
                </div>

                {/* Streak Counter Cards */}
                <div className="grid grid-cols-2 gap-2.5 py-1">
                  {/* Current Streak */}
                  <div className="bg-[#141414] border border-[#1F1F1F] rounded-lg p-2.5 flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#250B0E] flex items-center justify-center flex-shrink-0">
                      <Flame size={15} className="text-[#B31222]" />
                    </div>
                    <div>
                      <div className="text-[10px] text-[#6E6862] uppercase font-mono">Streak</div>
                      <div className="text-xs font-serif font-bold text-[#ECE7E0]">
                        {habit.current_streak} {habit.current_streak === 1 ? "day" : "days"}
                      </div>
                    </div>
                  </div>

                  {/* Longest Streak */}
                  <div className="bg-[#141414] border border-[#1F1F1F] rounded-lg p-2.5 flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#1F1A12] flex items-center justify-center flex-shrink-0">
                      <Trophy size={15} className="text-[#A39168]" />
                    </div>
                    <div>
                      <div className="text-[10px] text-[#6E6862] uppercase font-mono">Best</div>
                      <div className="text-xs font-serif font-bold text-[#ECE7E0]">
                        {habit.longest_streak} {habit.longest_streak === 1 ? "day" : "days"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7-Day Completion Mini Activity Grid */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[#6E6862]">
                    <span>Past 7 Days Consistency</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {(habit.recentActivity || []).map((day, idx) => (
                      <div key={idx} className="flex flex-col items-center space-y-1 flex-1">
                        <div
                          className={`w-full h-3 rounded-[2px] transition-colors ${
                            day.isCompleted
                              ? "bg-[#8B0D18] shadow-crimson-bar"
                              : "bg-[#1E1E1E]"
                          }`}
                          title={`${day.dateStr}: ${day.isCompleted ? "Completed" : "Not logged"}`}
                        />
                        <span className="text-[9px] text-[#554F48] font-mono">
                          {day.dayLabel[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive Check-in Button */}
                <button
                  type="button"
                  onClick={() => toggleCheckIn(habit.id, isDoneToday)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center space-x-2 transition-all ${
                    isDoneToday
                      ? "bg-[#1E1113] border border-[#540911] text-[#E8A5AC] hover:bg-[#251216]"
                      : "bg-[#540911] hover:bg-[#6E0A13] text-white shadow-crimson-pill"
                  }`}
                >
                  {isDoneToday ? (
                    <>
                      <Check size={14} className="text-[#B31222]" />
                      <span>Completed Today (Click to Undo)</span>
                    </>
                  ) : (
                    <>
                      <Flame size={14} />
                      <span>Check In for Today</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Habit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-[#242424] rounded-xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202020] pb-3">
              <h3 className="font-serif text-lg font-medium text-[#ECE7E0]">
                {editingHabit ? "Edit Habit" : "Create New Habit"}
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
                  Habit Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Strength Workout"
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
                  placeholder="e.g. 45 minutes progressive resistance training"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] placeholder-[#5A544E] focus:outline-none focus:border-[#8B0D18]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#ECE7E0] mb-1">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) =>
                      setFrequency(e.target.value as "daily" | "weekly" | "monthly")
                    }
                    className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] focus:outline-none focus:border-[#8B0D18]"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#ECE7E0] mb-1">
                    Daily Target Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] focus:outline-none focus:border-[#8B0D18]"
                  />
                </div>
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
                  {formSubmitting ? "Saving..." : editingHabit ? "Update Habit" : "Create Habit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HabitsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-80 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#8B0D18] border-t-transparent animate-spin" />
        </div>
      }
    >
      <HabitsContent />
    </Suspense>
  );
}
