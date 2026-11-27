"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  Plus,
  Target,
  CheckSquare,
  RotateCcw,
  Check,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardStats, Task, TaskStatus, GoalWithStats, Habit } from "@/types";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to load dashboard data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Toggle task status with optimistic UI
  async function toggleTaskStatus(taskId: string, currentStatus: string) {
    const newStatus: TaskStatus = currentStatus === "done" ? "todo" : "done";

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const updateTasks = (list: Task[]) =>
        list.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
      return {
        ...prev,
        tasksDueToday: updateTasks(prev.tasksDueToday),
        overdueTasks: updateTasks(prev.overdueTasks),
        recentTasks: updateTasks(prev.recentTasks),
      };
    });

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchStats();
    } catch {
      fetchStats();
    }
  }

  // Toggle habit completion for today
  async function toggleHabitLog(habitId: string, isLogged: boolean) {
    try {
      if (isLogged) {
        await fetch(`/api/habits/${habitId}/log`, { method: "DELETE" });
      } else {
        await fetch(`/api/habits/${habitId}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      }
      fetchStats();
    } catch {
      fetchStats();
    }
  }

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#8B0D18] border-t-transparent animate-spin" />
          <span className="font-serif text-xs text-[#8F877C] tracking-widest uppercase">
            Loading Life OS...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-xl bg-[#121212] border border-[#222222] text-center max-w-lg mx-auto mt-12">
        <p className="text-red-400 text-sm mb-4">{error || "Failed to load dashboard metrics"}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-[#540911] text-white text-xs rounded-lg hover:bg-[#6E0A13] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Prepare chart data
  const chartData = data.weeklyActivity.map((w) => ({
    name: w.day,
    value: w.tasksCompleted + w.habitsCompleted,
  }));

  // Tasks due today or priority tasks
  const displayTasks =
    data.tasksDueToday.length > 0
      ? data.tasksDueToday
      : data.recentTasks.length > 0
      ? data.recentTasks.slice(0, 4)
      : [];

  const completedTodayCount = displayTasks.filter((t) => t.status === "done").length;
  const totalDisplayTasksCount = displayTasks.length;

  return (
    <div className="space-y-6">
      {/* 6-Card Bento Grid Matching Reference Image */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CARD 1: Today's Priorities */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5 flex flex-col justify-between shadow-card-dark min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-medium text-[#ECE7E0] tracking-wide">
                Today&apos;s Priorities
              </h2>
              <span className="text-xs text-[#8F877C] font-mono">
                {completedTodayCount} / {totalDisplayTasksCount || 0}
              </span>
            </div>

            {displayTasks.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-[#6E6862]">No priorities set for today.</p>
                <Link
                  href="/tasks?create=true"
                  className="inline-flex items-center space-x-1 text-xs text-[#B31222] hover:underline"
                >
                  <Plus size={13} />
                  <span>Add a priority task</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {displayTasks.slice(0, 4).map((task) => {
                  const isDone = task.status === "done";
                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleTaskStatus(task.id, task.status)}
                      className="flex items-center space-x-3 cursor-pointer group"
                    >
                      {/* Crimson Checkbox */}
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
                          isDone
                            ? "bg-[#8B0D18] text-white"
                            : "border border-[#333333] group-hover:border-[#8B0D18] bg-[#161616]"
                        }`}
                      >
                        {isDone && <Check size={11} strokeWidth={3} />}
                      </div>

                      {/* Task Title */}
                      <span
                        className={`text-xs tracking-normal transition-colors select-none ${
                          isDone
                            ? "line-through text-[#666059]"
                            : "text-[#ECE7E0] group-hover:text-white"
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: Goals Progress */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5 flex flex-col justify-between shadow-card-dark min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-medium text-[#ECE7E0] tracking-wide">
                Goals Progress
              </h2>
              <span className="text-xs text-[#8F877C]">
                {data.activeGoals.length} {data.activeGoals.length === 1 ? "goal" : "goals"}
              </span>
            </div>

            {data.activeGoals.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-[#6E6862]">No active goals defined.</p>
                <Link
                  href="/goals?create=true"
                  className="inline-flex items-center space-x-1 text-xs text-[#B31222] hover:underline"
                >
                  <Plus size={13} />
                  <span>Define your first goal</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data.activeGoals.slice(0, 3).map((goal: GoalWithStats) => (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#ECE7E0] font-normal truncate max-w-[190px]">
                        {goal.title}
                      </span>
                      <span className="text-[#8F877C] font-mono text-[11px]">
                        {goal.progress}%
                      </span>
                    </div>
                    {/* Deep Crimson Progress Bar */}
                    <div className="w-full h-1.5 bg-[#1C1C1C] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#8B0D18] to-[#B31222] rounded-full transition-all duration-500 shadow-crimson-bar"
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: Habit Consistency */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5 flex flex-col justify-between shadow-card-dark min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-medium text-[#ECE7E0] tracking-wide">
                Habit Consistency
              </h2>
              <span className="text-xs text-[#8F877C]">This month ▾</span>
            </div>

            {data.habits.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-[#6E6862]">No habits configured yet.</p>
                <Link
                  href="/habits?create=true"
                  className="inline-flex items-center space-x-1 text-xs text-[#B31222] hover:underline"
                >
                  <Plus size={13} />
                  <span>Establish a habit</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                {/* Circular Gauge */}
                <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    {/* Background track */}
                    <path
                      className="text-[#1E1E1E]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Crimson fill track */}
                    <path
                      className="text-[#8B0D18]"
                      strokeDasharray={`${Math.max(data.completionStats.completionRate || 50, 10)}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="font-serif text-base font-bold text-[#ECE7E0]">
                      {data.completionStats.completionRate || 75}%
                    </span>
                    <span className="text-[9px] text-[#8F877C] font-mono">
                      {data.completionStats.tasksCompletedToday} / {data.completionStats.tasksTotalCount || 10}
                    </span>
                  </div>
                </div>

                {/* Habit Streak Square Mini-Bars */}
                <div className="flex-1 space-y-2">
                  {data.habits.slice(0, 4).map((h) => (
                    <div
                      key={h.id}
                      onClick={() => toggleHabitLog(h.id, h.loggedToday)}
                      className="flex items-center justify-between cursor-pointer group"
                      title={h.loggedToday ? "Completed today (click to undo)" : "Click to check in today"}
                    >
                      <span className="text-[11px] text-[#ECE7E0] group-hover:text-white truncate max-w-[70px]">
                        {h.title}
                      </span>
                      {/* 7 Square blocks */}
                      <div className="flex items-center space-x-1">
                        {(h.recentHistory || [false, false, false, false, false, false, false]).map(
                          (completed, idx) => (
                            <div
                              key={idx}
                              className={`w-2 h-2.5 rounded-[1px] transition-colors ${
                                completed
                                  ? "bg-[#8B0D18]"
                                  : "bg-[#202020]"
                              }`}
                            />
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: Weekly Activity Line Chart */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5 flex flex-col justify-between shadow-card-dark min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-lg font-medium text-[#ECE7E0] tracking-wide">
                Weekly Activity
              </h2>
              <span className="text-xs text-[#8F877C]">Focused time ▾</span>
            </div>

            <div className="h-36 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="crimsonGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B0D18" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8B0D18" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    stroke="#5A544D"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: "#222222" }}
                  />
                  <YAxis
                    stroke="#5A544D"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: "#222222" }}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161616",
                      borderColor: "#2B2B2B",
                      borderRadius: 6,
                      fontSize: 11,
                      color: "#ECE7E0",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#B31222"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#crimsonGradient)"
                    dot={{ fill: "#FF334B", r: 2.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* CARD 5: Upcoming Deadlines */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5 flex flex-col justify-between shadow-card-dark min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-medium text-[#ECE7E0] tracking-wide">
                Upcoming Deadlines
              </h2>
              <span className="text-xs text-[#8F877C]">Next 7 days</span>
            </div>

            {data.tasksDueToday.length === 0 && data.overdueTasks.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-[#6E6862]">No deadlines in the next 7 days.</p>
                <Link
                  href="/tasks"
                  className="inline-flex items-center space-x-1 text-xs text-[#8F877C] hover:text-[#ECE7E0]"
                >
                  <span>View all scheduled tasks</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Overdue alert if any */}
                {data.overdueTasks.slice(0, 2).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs group">
                    <div className="flex items-center space-x-2.5 truncate max-w-[210px]">
                      <CalendarIcon size={14} className="text-[#8B0D18] flex-shrink-0" />
                      <span className="text-red-400 font-mono text-[11px] flex-shrink-0">Overdue</span>
                      <span className="text-[#ECE7E0] truncate">{t.title}</span>
                    </div>
                    <ChevronRight size={13} className="text-[#6E6862] group-hover:text-white" />
                  </div>
                ))}

                {/* Today's upcoming */}
                {data.tasksDueToday.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs group">
                    <div className="flex items-center space-x-2.5 truncate max-w-[210px]">
                      <CalendarIcon size={14} className="text-[#8F877C] flex-shrink-0" />
                      <span className="text-[#8F877C] font-mono text-[11px] flex-shrink-0">Today</span>
                      <span className="text-[#ECE7E0] truncate">{t.title}</span>
                    </div>
                    <ChevronRight size={13} className="text-[#6E6862] group-hover:text-white" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CARD 6: Task Completion */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-5 flex flex-col justify-between shadow-card-dark min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-medium text-[#ECE7E0] tracking-wide">
                Task Completion
              </h2>
              <span className="text-xs text-[#8F877C]">This week ▾</span>
            </div>

            <div className="space-y-3 py-2">
              <div className="font-serif text-4xl font-bold text-[#ECE7E0]">
                {data.completionStats.completionRate}%
              </div>
              <div className="text-xs text-[#8F877C] font-mono">
                {data.completionStats.tasksCompletedToday} / {data.completionStats.tasksTotalCount || 1} tasks
              </div>
              {/* Crimson Horizontal Progress Bar */}
              <div className="w-full h-2 bg-[#1C1C1C] rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-gradient-to-r from-[#8B0D18] to-[#B31222] rounded-full shadow-crimson-bar transition-all duration-500"
                  style={{ width: `${Math.min(data.completionStats.completionRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/finance" className="rounded-xl border border-[#1E1E1E] bg-[#111] p-5"><h2 className="font-serif text-lg text-[#ECE7E0]">Finance</h2><p className="mt-3 text-xs text-[#A39168]">This month</p><p className="mt-1 text-sm text-[#ECE7E0]">Income {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(data.lifeSummaries.income)}</p><p className="text-sm text-[#ECE7E0]">Expenses {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(data.lifeSummaries.expenses)}</p></Link>
        <Link href="/health" className="rounded-xl border border-[#1E1E1E] bg-[#111] p-5"><h2 className="font-serif text-lg text-[#ECE7E0]">Health</h2><p className="mt-3 text-sm text-[#ECE7E0]">{data.lifeSummaries.activityMinutes} exercise minutes this month</p><p className="text-sm text-[#8F877C]">Average sleep: {data.lifeSummaries.averageSleep == null ? "No logs" : `${data.lifeSummaries.averageSleep.toFixed(1)} h`}</p></Link>
        <Link href="/career" className="rounded-xl border border-[#1E1E1E] bg-[#111] p-5"><h2 className="font-serif text-lg text-[#ECE7E0]">Career</h2><p className="mt-3 text-sm text-[#ECE7E0]">{data.lifeSummaries.careerActive} active items</p></Link>
        <Link href="/relationships" className="rounded-xl border border-[#1E1E1E] bg-[#111] p-5"><h2 className="font-serif text-lg text-[#ECE7E0]">Relationships</h2><p className="mt-3 text-sm text-[#ECE7E0]">{data.lifeSummaries.contacts} contacts</p></Link>
      </div>
      <div className="rounded-xl border border-[#1E1E1E] bg-[#111] p-5"><Link href="/calendar" className="font-serif text-lg text-[#ECE7E0] hover:text-[#A39168]">Upcoming events</Link>{data.lifeSummaries.upcomingEvents.length ? <ul className="mt-3 space-y-2 text-sm text-[#8F877C]">{data.lifeSummaries.upcomingEvents.map(event => <li key={`${event.title}-${event.start_time}`}>{event.title} · {new Date(event.start_time).toLocaleString("en-IN")}</li>)}</ul> : <p className="mt-3 text-sm text-[#8F877C]">No upcoming events.</p>}</div>
      <div className="rounded-xl border border-[#1E1E1E] bg-[#111] p-5"><Link href="/decisions" className="font-serif text-lg text-[#ECE7E0] hover:text-[#A39168]">Recent decisions</Link>{data.recentDecisions.length ? <ul className="mt-3 space-y-3 text-sm">{data.recentDecisions.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-[#282323] pb-2"><span className="text-[#ECE7E0]">{item.title}</span><span className="capitalize text-[#A39168]">{item.status.replaceAll("_", " ")}{item.latestVersion != null ? ` · v${item.latestVersion}${item.leadingScore != null ? ` · lead ${item.leadingScore.toFixed(2)}/10` : ""}` : ""}</span></li>)}</ul> : <p className="mt-3 text-sm text-[#8F877C]">No decisions yet.</p>}</div>
    </div>
  );
}
