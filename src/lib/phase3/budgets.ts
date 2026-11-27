import type { SupabaseClient } from "@supabase/supabase-js";

export function budgetStatus(spent: number, limit: number, threshold: number) {
  const ratio = limit > 0 ? spent / limit : 0;
  return { ratio, alert: ratio >= threshold, exceeded: ratio >= 1 };
}

export async function syncBudgetAlerts(supabase: SupabaseClient, userId: string) {
  const month = new Date().toISOString().slice(0, 7);
  const from = `${month}-01`;
  const until = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10);
  const [{ data: budgets, error: budgetError }, { data: expenses, error: expenseError }] = await Promise.all([
    supabase.from("budgets").select("id,category,monthly_limit,alert_threshold").eq("user_id", userId),
    supabase.from("transactions").select("category,amount").eq("user_id", userId).eq("type", "expense").gte("transaction_date", from).lt("transaction_date", until),
  ]);
  if (budgetError || expenseError) return;
  for (const budget of budgets || []) {
    const spent = (expenses || []).filter(expense => expense.category.toLowerCase() === budget.category.toLowerCase()).reduce((sum, expense) => sum + Number(expense.amount), 0);
    if (!budgetStatus(spent, Number(budget.monthly_limit), Number(budget.alert_threshold)).alert) continue;
    const title = `Budget alert: ${budget.category}`;
    const { data: prior } = await supabase.from("notifications").select("id").eq("user_id", userId).eq("type", "budget_alert").eq("entity_id", budget.id).eq("message", month).maybeSingle();
    if (!prior) await supabase.from("notifications").insert({ user_id: userId, type: "budget_alert", title, message: month, entity_type: "budget", entity_id: budget.id });
  }
}
