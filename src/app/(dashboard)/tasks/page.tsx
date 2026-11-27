"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckSquare,
  Plus,
  Calendar as CalendarIcon,
  Check,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Target,
} from "lucide-react";
import type { Task, Goal } from "@/types";

function TasksContent() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter view: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed'
  const [activeFilter, setActiveFilter] = useState<
    "all" | "today" | "upcoming" | "overdue" | "completed"
  >("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState("");
  const [goalId, setGoalId] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const url =
        activeFilter === "all"
          ? "/api/tasks"
          : `/api/tasks?view=${activeFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading tasks");
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchGoals();
    if (searchParams.get("create") === "true") {
      openCreateModal();
    }
  }, [fetchTasks, fetchGoals, searchParams]);

  function openCreateModal() {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setGoalId("");
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setDueDate(task.due_date ? task.due_date.slice(0, 16) : "");
    setGoalId(task.goal_id || "");
    setFormError(null);
    setIsModalOpen(true);
    setMenuOpenId(null);
  }

  // Instant optimistic toggle
  async function toggleStatus(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
    } catch {
      fetchTasks();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    const payload = {
      title,
      description: description || null,
      priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      goal_id: goalId || null,
    };

    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : "/api/tasks";
      const method = editingTask ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save task");

      setIsModalOpen(false);
      fetchTasks();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error saving task");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDeleteTask(id: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      fetchTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting task");
    }
  }

  function formatTaskDate(dateStr?: string | null): { text: string; isOverdue: boolean } {
    if (!dateStr) return { text: "No due date", isOverdue: false };
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) return { text: "Today", isOverdue: false };

    const isOverdue = date < now;
    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return { text: formatted, isOverdue };
  }

  return (
    <div className="space-y-6">
      {/* Top Header: Navigation Sub-Tabs & Add Task Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1C1C] pb-4">
        {/* Module Sub-Tabs (Tasks | Habits) */}
        <div className="flex items-center space-x-6">
          <Link
            href="/tasks"
            className="text-xs font-medium pb-2 transition-colors relative text-[#ECE7E0] border-b-2 border-[#8B0D18]"
          >
            Tasks
          </Link>
          <Link
            href="/habits"
            className="text-xs font-medium pb-2 transition-colors relative text-[#8F877C] hover:text-[#ECE7E0]"
          >
            Habits
          </Link>
        </div>

        {/* Add Task Button */}
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#540911] hover:bg-[#6E0A13] text-white text-xs font-medium transition-colors shadow-crimson-pill self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Capsule Pill Filters Matching Screenshot */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {(["all", "today", "upcoming", "overdue", "completed"] as const).map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                isActive
                  ? "bg-[#540911] text-white shadow-crimson-pill"
                  : "bg-[#141414] text-[#8F877C] hover:text-[#ECE7E0] hover:bg-[#1A1A1A] border border-[#222222]"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[#180A0C] border border-[#3E1116] text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Task List Table */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#8B0D18] border-t-transparent animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#111111] border border-[#1E1E1E] space-y-3">
          <CheckSquare size={32} className="mx-auto text-[#6E6862]" />
          <h3 className="font-serif text-base text-[#ECE7E0]">No tasks in this view</h3>
          <p className="text-xs text-[#8F877C] max-w-sm mx-auto">
            Stay organized and maintain momentum by creating prioritized daily tasks.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#540911] text-white text-xs rounded-lg hover:bg-[#6E0A13] transition-colors shadow-crimson-pill"
          >
            Create Your First Task
          </button>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl divide-y divide-[#181818] shadow-card-dark overflow-hidden">
          {tasks.map((task) => {
            const isDone = task.status === "done";
            const dateInfo = formatTaskDate(task.due_date);

            return (
              <div
                key={task.id}
                className="px-4 py-3.5 flex items-center justify-between hover:bg-[#141414] transition-colors group"
              >
                {/* Left: Checkbox & Title */}
                <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-4">
                  <button
                    type="button"
                    onClick={() => toggleStatus(task.id, task.status)}
                    className={`w-4 h-4 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
                      isDone
                        ? "bg-[#8B0D18] text-white"
                        : "border border-[#333333] group-hover:border-[#8B0D18] bg-[#161616]"
                    }`}
                  >
                    {isDone && <Check size={11} strokeWidth={3} />}
                  </button>

                  <div className="flex flex-col min-w-0">
                    <span
                      onClick={() => toggleStatus(task.id, task.status)}
                      className={`text-xs tracking-normal cursor-pointer transition-colors truncate select-none ${
                        isDone
                          ? "line-through text-[#666059]"
                          : "text-[#ECE7E0] group-hover:text-white"
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.description && (
                      <span className="text-[11px] text-[#6E6862] truncate mt-0.5">
                        {task.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Priority Pill, Due Date & Context Menu */}
                <div className="flex items-center space-x-4 flex-shrink-0">
                  {/* Priority Pill */}
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-medium uppercase font-mono tracking-wider ${
                      task.priority === "urgent" || task.priority === "high"
                        ? "bg-[#380E12] text-[#E87A82] border border-[#59141B]"
                        : task.priority === "medium"
                        ? "bg-[#2E1E0E] text-[#D4A86A] border border-[#4A3216]"
                        : "bg-[#181818] text-[#8F877C] border border-[#262626]"
                    }`}
                  >
                    {task.priority}
                  </span>

                  {/* Due Date */}
                  <div className="flex items-center space-x-1.5 text-xs font-mono">
                    <CalendarIcon
                      size={12}
                      className={
                        dateInfo.isOverdue && !isDone
                          ? "text-[#8B0D18]"
                          : "text-[#6E6862]"
                      }
                    />
                    <span
                      className={
                        dateInfo.isOverdue && !isDone
                          ? "text-red-400 font-semibold"
                          : "text-[#8F877C]"
                      }
                    >
                      {dateInfo.text}
                    </span>
                  </div>

                  {/* Context Menu Toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === task.id ? null : task.id)}
                      className="p-1 text-[#6E6862] hover:text-[#ECE7E0] rounded transition-colors"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {menuOpenId === task.id && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setMenuOpenId(null)}
                        />
                        <div className="absolute right-0 mt-1 w-28 bg-[#181818] border border-[#2B2B2B] rounded-lg shadow-card-dark z-30 py-1 text-xs">
                          <button
                            onClick={() => openEditModal(task)}
                            className="w-full flex items-center space-x-2 px-3 py-1.5 text-[#ECE7E0] hover:bg-[#222222] text-left"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
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
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-[#242424] rounded-xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202020] pb-3">
              <h3 className="font-serif text-lg font-medium text-[#ECE7E0]">
                {editingTask ? "Edit Task" : "Add Task"}
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
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finish project proposal"
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
                  placeholder="Additional context or checklist items..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] placeholder-[#5A544E] focus:outline-none focus:border-[#8B0D18]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#ECE7E0] mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as "low" | "medium" | "high" | "urgent")
                    }
                    className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] focus:outline-none focus:border-[#8B0D18]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#ECE7E0] mb-1">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] focus:outline-none focus:border-[#8B0D18]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#ECE7E0] mb-1">
                  Linked Goal (Optional)
                </label>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg text-xs text-[#ECE7E0] focus:outline-none focus:border-[#8B0D18]"
                >
                  <option value="">No goal attached</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.category || "General"})
                    </option>
                  ))}
                </select>
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
                  {formSubmitting ? "Saving..." : editingTask ? "Update Task" : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="h-80 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#8B0D18] border-t-transparent animate-spin" />
        </div>
      }
    >
      <TasksContent />
    </Suspense>
  );
}
