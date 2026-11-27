// Explicit export allowlist. Auth credentials, admin settings and audit records are never queried.
export const personalExportTables = {
  goals: "id,title,description,category,status,target_date,progress,completed_at,created_at,updated_at",
  tasks: "id,goal_id,title,description,priority,status,due_date,completed_at,created_at,updated_at",
  habits: "id,title,description,frequency,target_count,current_streak,longest_streak,is_active,created_at,updated_at",
  habit_logs: "id,habit_id,completed_at,notes",
  transactions: "id,type,category,amount,description,transaction_date,created_at",
  budgets: "id,category,monthly_limit,alert_threshold,created_at,updated_at",
  health_activities: "id,activity_type,duration_minutes,calories_burned,sleep_hours,metric_value,metric_unit,notes,activity_date,created_at",
  career_items: "id,type,title,description,status,goal_id,metadata,target_date,completed_at,created_at,updated_at",
  contacts: "id,name,relationship_type,email,phone,notes,tags,created_at,updated_at",
  interactions: "id,contact_id,type,notes,interaction_date,created_at",
  events: "id,title,description,start_time,end_time,is_all_day,recurrence_rule,color,created_at,updated_at",
  reminders: "id,title,remind_at,entity_type,entity_id,is_sent,created_at",
  notifications: "id,type,title,message,is_read,entity_type,entity_id,created_at",
  decisions: "id,title,problem_description,status,input_snapshot,context_snapshot,final_choice,outcome_notes,created_at,updated_at",
} as const;
export const decisionChildExportTables = {
  decision_alternatives: "id,decision_id,title,description,sort_order",
  decision_criteria: "id,decision_id,name,weight,constraint_rule",
  decision_evaluations: "id,decision_id,version,ai_provider,ai_model,deterministic_scores,ranking,ai_reasoning,pros_cons,trade_off_analysis,analysis,sensitivity,excluded,penalties,normalized_weights,input_snapshot,context_snapshot,final_choice,outcome_notes,evaluated_at",
} as const;
