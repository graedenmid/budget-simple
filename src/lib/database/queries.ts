import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type IncomeSource = Tables["income_sources"]["Row"];
type IncomeHistory = Tables["income_history"]["Row"];
type BudgetItem = Tables["budget_items"]["Row"];
type PayPeriod = Tables["pay_periods"]["Row"];
type Allocation = Tables["allocations"]["Row"];
type Expense = Tables["expenses"]["Row"];
type Suggestion = Tables["suggestions"]["Row"];

// View types for income history reporting
interface IncomeSourceTimeline extends IncomeHistory {
  annual_gross_amount: number;
  annual_net_amount: number;
}

interface IncomeTrends {
  user_id: string;
  income_source_id: string;
  name: string;
  month: string;
  changes_count: number;
  updates_count: number;
  activations_count: number;
  deactivations_count: number;
  avg_gross_amount: number;
  avg_net_amount: number;
  first_change: string;
  last_change: string;
}
type User = Tables["users"]["Row"];

// User queries
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !authUser) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return data;
}

// Income source queries
export async function getIncomeSourcesForUser(
  userId?: string,
  includeInactive: boolean = false
): Promise<IncomeSource[]> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return [];
    userId = user.id;
  }

  let query = supabase.from("income_sources").select("*").eq("user_id", userId);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching income sources:", error);
    return [];
  }

  return data || [];
}

export async function getAllIncomeSourcesForUser(
  userId?: string
): Promise<IncomeSource[]> {
  return getIncomeSourcesForUser(userId, true);
}

export async function getIncomeSourceById(
  id: string
): Promise<IncomeSource | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("income_sources")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching income source:", error);
    return null;
  }

  return data;
}

// Budget item queries
export async function getBudgetItemsForUser(
  userId?: string
): Promise<BudgetItem[]> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return [];
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("budget_items")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (error) {
    console.error("Error fetching budget items:", error);
    return [];
  }

  return data || [];
}

export async function getBudgetItemsByCategory(
  category: Database["public"]["Enums"]["budget_category"],
  userId?: string
): Promise<BudgetItem[]> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return [];
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("budget_items")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (error) {
    console.error("Error fetching budget items by category:", error);
    return [];
  }

  return data || [];
}

// Pay period queries
export async function getActivePayPeriods(
  userId?: string
): Promise<PayPeriod[]> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return [];
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("pay_periods")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Error fetching active pay periods:", error);
    return [];
  }

  return data || [];
}

export async function getCurrentPayPeriod(
  userId?: string
): Promise<PayPeriod | null> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    userId = user.id;
  }

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("pay_periods")
    .select("*")
    .eq("user_id", userId)
    .lte("start_date", today)
    .gte("end_date", today)
    .eq("status", "ACTIVE")
    .single();

  if (error) {
    console.error("Error fetching current pay period:", error);
    return null;
  }

  return data;
}

// Allocation queries
export async function getAllocationsForPayPeriod(
  payPeriodId: string
): Promise<Allocation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("allocations")
    .select(
      `
      *,
      budget_items (
        id,
        name,
        category,
        calc_type,
        value
      )
    `
    )
    .eq("pay_period_id", payPeriodId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching allocations:", error);
    return [];
  }

  return data || [];
}

export async function getUnpaidAllocations(
  payPeriodId: string
): Promise<Allocation[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("allocations")
    .select(
      `
      *,
      budget_items (
        id,
        name,
        category,
        calc_type,
        value
      )
    `
    )
    .eq("pay_period_id", payPeriodId)
    .eq("status", "UNPAID")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching unpaid allocations:", error);
    return [];
  }

  return data || [];
}

// Expense queries
export async function getExpensesForPayPeriod(
  payPeriodId: string
): Promise<Expense[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("pay_period_id", payPeriodId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }

  return data || [];
}

export async function getRecentExpenses(
  userId?: string,
  limit = 10
): Promise<Expense[]> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return [];
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent expenses:", error);
    return [];
  }

  return data || [];
}

// Suggestion queries
export async function getPendingSuggestions(
  payPeriodId: string
): Promise<Suggestion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .eq("pay_period_id", payPeriodId)
    .eq("status", "PENDING")
    .order("amount", { ascending: false });

  if (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }

  return data || [];
}

// Dashboard summary queries
export async function getDashboardSummary(userId?: string) {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    userId = user.id;
  }

  const [
    incomeSourcesData,
    budgetItemsData,
    currentPayPeriodData,
    recentExpensesData,
  ] = await Promise.all([
    getIncomeSourcesForUser(userId),
    getBudgetItemsForUser(userId),
    getCurrentPayPeriod(userId),
    getRecentExpenses(userId, 5),
  ]);

  let allocationsData: Allocation[] = [];
  let suggestionsData: Suggestion[] = [];

  if (currentPayPeriodData) {
    [allocationsData, suggestionsData] = await Promise.all([
      getAllocationsForPayPeriod(currentPayPeriodData.id),
      getPendingSuggestions(currentPayPeriodData.id),
    ]);
  }

  return {
    incomeSources: incomeSourcesData,
    budgetItems: budgetItemsData,
    currentPayPeriod: currentPayPeriodData,
    allocations: allocationsData,
    recentExpenses: recentExpensesData,
    suggestions: suggestionsData,
  };
}

// Income history queries
export async function getIncomeHistoryForUser(
  userId?: string,
  limit: number = 50
): Promise<IncomeHistory[]> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return [];
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("income_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching income history:", error);
    return [];
  }

  return data || [];
}

export async function getIncomeHistoryForSource(
  incomeSourceId: string,
  userId?: string
): Promise<IncomeHistory[]> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return [];
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("income_history")
    .select("*")
    .eq("income_source_id", incomeSourceId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching income source history:", error);
    return [];
  }

  return data || [];
}

export async function getIncomeHistoryByDateRange(
  startDate: string,
  endDate: string,
  userId?: string
): Promise<IncomeHistory[]> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return [];
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("income_history")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching income history by date range:", error);
    return [];
  }

  return data || [];
}

export async function getIncomeSourceTimeline(
  incomeSourceId: string,
  userId?: string
): Promise<IncomeSourceTimeline[]> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return [];
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("income_source_timeline")
    .select("*")
    .eq("income_source_id", incomeSourceId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching income source timeline:", error);
    return [];
  }

  return data || [];
}

export async function getIncomeTrends(
  userId?: string,
  months: number = 12
): Promise<IncomeTrends[]> {
  const supabase = await createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return [];
    userId = user.id;
  }

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const { data, error } = await supabase
    .from("income_trends")
    .select("*")
    .eq("user_id", userId)
    .gte("month", startDate.toISOString())
    .order("month", { ascending: false });

  if (error) {
    console.error("Error fetching income trends:", error);
    return [];
  }

  return data || [];
}
