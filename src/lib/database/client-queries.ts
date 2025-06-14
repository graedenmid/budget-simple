import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type IncomeSource = Tables["income_sources"]["Row"];
type IncomeHistory = Tables["income_history"]["Row"];
type BudgetItem = Tables["budget_items"]["Row"];

// Income source queries for client components
export async function getIncomeSourcesForUser(
  userId?: string,
  includeInactive: boolean = false
): Promise<IncomeSource[]> {
  const supabase = createClient();

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
  const supabase = createClient();

  // Early return if no userId
  if (!userId) {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) return [];
      userId = user.id;
    } catch (error) {
      console.error("Error getting user for income sources:", error);
      return [];
    }
  }

  // Simplified query - removed abortSignal for compatibility
  const { data, error } = await supabase
    .from("income_sources")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching all income sources:", error);
    return [];
  }

  return data || [];
}

// Income history queries for client components
export async function getIncomeHistoryForUser(
  userId?: string,
  limit: number = 50
): Promise<IncomeHistory[]> {
  const supabase = createClient();

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
  const supabase = createClient();

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

// Budget item queries for client components
export async function getBudgetItemsForUser(
  userId?: string,
  includeInactive: boolean = false
): Promise<BudgetItem[]> {
  const supabase = createClient();

  // Early return if no userId provided
  if (!userId) {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) return [];
      userId = user.id;
    } catch (error) {
      console.error("Error getting user for budget items:", error);
      return [];
    }
  }

  try {
    // Add timeout and performance optimization
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Budget query timeout")), 8000)
    );

    let query = supabase
      .from("budget_items")
      .select("*")
      .eq("user_id", userId)
      .order("priority", { ascending: true });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    // Add limit to prevent large result sets from causing timeouts
    query = query.limit(100);

    const queryPromise = query;

    const result = await Promise.race([queryPromise, timeoutPromise]);

    const { data, error } = result as {
      data: BudgetItem[] | null;
      error: Error | null;
    };

    if (error) {
      console.error("Error fetching budget items:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Budget items query failed:", error);
    return [];
  }
}

export async function getAllBudgetItemsForUser(
  userId?: string
): Promise<BudgetItem[]> {
  return getBudgetItemsForUser(userId, true);
}

export async function getBudgetItemsByCategory(
  category: Database["public"]["Enums"]["budget_category"],
  userId?: string,
  includeInactive: boolean = false
): Promise<BudgetItem[]> {
  const supabase = createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return [];
    userId = user.id;
  }

  let query = supabase
    .from("budget_items")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.order("priority", { ascending: true });

  if (error) {
    console.error("Error fetching budget items by category:", error);
    return [];
  }

  return data || [];
}

export async function getBudgetItem(
  id: string,
  userId?: string
): Promise<BudgetItem | null> {
  const supabase = createClient();

  if (!userId) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    userId = user.id;
  }

  const { data, error } = await supabase
    .from("budget_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching budget item:", error);
    return null;
  }

  return data;
}
