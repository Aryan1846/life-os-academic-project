// ==============================================================================
// Life OS — Core TypeScript Type Definitions
// Source of truth: docs/SPEC.md & docs/ARCHITECTURE.md
// ==============================================================================

export type Role = 'user' | 'admin';

export interface PrivacySettings {
  share_goals: boolean;
  share_finance: boolean;
  share_health: boolean;
  share_career: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  role: Role;
  is_active: boolean;
  privacy_settings: PrivacySettings;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------------------
// Goals, Tasks, Habits
// ------------------------------------------------------------------------------
export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  status: GoalStatus;
  target_date?: string | null;
  progress: number; // 0 - 100
  created_at: string;
  updated_at: string;
}

export interface GoalWithStats extends Goal {
  total_tasks?: number;
  completed_tasks?: number;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export interface Task {
  id: string;
  user_id: string;
  goal_id?: string | null;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  frequency: HabitFrequency;
  target_count: number;
  current_streak: number;
  longest_streak: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  notes?: string | null;
}

// ------------------------------------------------------------------------------
// Personal Finance
// ------------------------------------------------------------------------------
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description?: string | null;
  transaction_date: string;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  alert_threshold: number; // e.g. 0.80
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------------------
// Health & Fitness
// ------------------------------------------------------------------------------
export interface HealthActivity {
  id: string;
  user_id: string;
  activity_type: string;
  duration_minutes?: number | null;
  calories_burned?: number | null;
  notes?: string | null;
  activity_date: string;
  created_at: string;
}

// ------------------------------------------------------------------------------
// Career, Education & Business
// ------------------------------------------------------------------------------
export type CareerItemType = 'skill' | 'certification' | 'milestone' | 'course' | 'project' | 'idea';
export type CareerItemStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned';

export interface CareerItem {
  id: string;
  user_id: string;
  type: CareerItemType;
  title: string;
  description?: string | null;
  status: CareerItemStatus;
  goal_id?: string | null;
  metadata: Record<string, unknown>;
  target_date?: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------------------
// Relationships
// ------------------------------------------------------------------------------
export interface Contact {
  id: string;
  user_id: string;
  name: string;
  relationship_type?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  contact_id: string;
  user_id: string;
  type: string;
  notes?: string | null;
  interaction_date: string;
  created_at: string;
}

// ------------------------------------------------------------------------------
// Calendar & Reminders
// ------------------------------------------------------------------------------
export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  is_all_day: boolean;
  recurrence_rule?: string | null;
  color?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  remind_at: string;
  entity_type?: 'event' | 'task' | 'contact' | 'habit' | null;
  entity_id?: string | null;
  is_sent: boolean;
  created_at: string;
}

// ------------------------------------------------------------------------------
// AI Decision Support (Deterministic + AI Qualitative)
// ------------------------------------------------------------------------------
export type DecisionStatus =
  | 'draft'
  | 'criteria_defined'
  | 'context_attached'
  | 'awaiting_input'
  | 'evaluating'
  | 'evaluated'
  | 'closed';

export interface DecisionAlternative {
  id: string;
  decision_id: string;
  title: string;
  description?: string | null;
  sort_order: number;
}

export interface DecisionCriterion {
  id: string;
  decision_id: string;
  name: string;
  weight: number; // 0.0 - 1.0 (normalized sum ≈ 1.0)
  constraint_rule?: string | null;
  direction?: 'benefit' | 'cost';
  hardConstraint?: { operator: '<=' | '>='; value: number } | null;
  softConstraint?: { operator: '<=' | '>='; value: number; penalty: number } | null;
}

export interface DeterministicScoreRecord {
  criterionScores: Record<string, number>; // criterion_id -> raw score (0-10)
  totalScore: number;                      // weighted sum
  rank: number;
}

export interface DecisionEvaluation {
  id: string;
  decision_id: string;
  version: number;
  ai_provider: string;
  ai_model: string;
  deterministic_scores: Record<string, DeterministicScoreRecord>; // alternative_id -> score
  ranking: { alternative_id: string; rank: number; total_score: number }[];
  ai_reasoning: string;
  pros_cons: Record<string, { pros: string[]; cons: string[] }>;
  trade_off_analysis?: string | null;
  evaluated_at: string;
}

export interface Decision {
  id: string;
  user_id: string;
  title: string;
  problem_description: string;
  status: DecisionStatus;
  context_snapshot?: Record<string, unknown> | null;
  final_choice?: string | null;
  outcome_notes?: string | null;
  created_at: string;
  updated_at: string;
  alternatives?: DecisionAlternative[];
  criteria?: DecisionCriterion[];
  evaluations?: DecisionEvaluation[];
}

// ------------------------------------------------------------------------------
// Notifications & Admin
// ------------------------------------------------------------------------------
export type NotificationType = 'budget_alert' | 'reminder' | 'task_due' | 'system';

export interface InAppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  is_read: boolean;
  entity_type?: string | null;
  entity_id?: string | null;
  created_at: string;
}

export interface DashboardStats {
  recentDecisions: { id: string; title: string; status: string; updated_at: string; latestVersion: number | null; leadingScore: number | null }[];
  lifeSummaries: { income: number; expenses: number; activityMinutes: number; averageSleep: number | null; careerActive: number; contacts: number; upcomingEvents: { title: string; start_time: string }[] };
  greeting: string;
  todayDate: string;
  activeGoals: GoalWithStats[];
  tasksDueToday: Task[];
  overdueTasks: Task[];
  recentTasks: Task[];
  habits: (Habit & { loggedToday: boolean; recentHistory: boolean[] })[];
  completionStats: {
    tasksCompletedToday: number;
    tasksDueTodayCount: number;
    tasksTotalCount: number;
    completionRate: number;
    activeGoalsCount: number;
    activeHabitsCount: number;
    totalStreakCount: number;
  };
  weeklyActivity: {
    day: string;
    date: string;
    tasksCompleted: number;
    habitsCompleted: number;
  }[];
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
}
