import { createClient } from "@/lib/supabase/client";
import type {
  Database,
  IncomeSource,
  IncomeHistory,
  BudgetItem,
} from "@/types/database";

// Add typed column selection constants at the top of the file
// -----------------------------------------------------------------------------
// Column lists must be compile-time string literals so that Supabase type
// inference can correctly narrow the returned row types. Building them at
// runtime via Array.join results in a generic `GenericStringError[]` type which
// breaks type checking. Defining them as `const` string literals avoids the
// issue while still allowing us to limit the selected columns.
// -----------------------------------------------------------------------------

const INCOME_SOURCE_COLUMNS =
  "id, user_id, name, gross_amount, net_amount, cadence, start_date, end_date, is_active, created_at, updated_at" as const;

const BUDGET_ITEM_COLUMNS =
  "id, name, category, calc_type, value, priority, cadence, depends_on, is_active, end_date, created_at, user_id, updated_at" as const;

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

  const requiredColumns = INCOME_SOURCE_COLUMNS;

  let query = supabase
    .from("income_sources")
    .select(requiredColumns)
    .eq("user_id", userId);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching income sources:", error);
    return [];
  }

  return data ?? [];
}

export async function getAllIncomeSourcesForUser(
  userId?: string,
  signal?: AbortSignal
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

  // Define the columns needed by the IncomePage to reduce data transfer
  const requiredColumns = INCOME_SOURCE_COLUMNS;

  // Build the query
  let query = supabase
    .from("income_sources")
    .select(requiredColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(100);

  // Attach AbortSignal only if the helper exists to maintain compatibility across supabase-js versions
  if (
    signal &&
    typeof (query as { abortSignal?: (s: AbortSignal) => typeof query })
      .abortSignal === "function"
  ) {
    query = (
      query as { abortSignal: (s: AbortSignal) => typeof query }
    ).abortSignal(signal);
  }

  const { data, error } = await query;

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
    console.log(
      `🔄 Fetching budget items for user: ${userId}, includeInactive: ${includeInactive}`
    );

    const requiredColumns = BUDGET_ITEM_COLUMNS;

    let query = supabase
      .from("budget_items")
      .select(requiredColumns)
      .eq("user_id", userId)
      .order("priority", { ascending: true });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    // Add limit to prevent large result sets from causing timeouts
    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      // Use a more specific error message
      console.error("Supabase query failed for budget items:", error);
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    console.log(`✅ Fetched ${data?.length || 0} budget items`);
    return data || [];
  } catch (error) {
    console.error("Budget items query failed:", error);
    // Re-throw the error to be handled by the calling function
    throw error;
  }
}

export async function getAllBudgetItemsForUser(
  userId?: string
): Promise<BudgetItem[]> {
  try {
    return await getBudgetItemsForUser(userId, true);
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Failed to get all budget items; returning empty.", error);
    // Gracefully return an empty array on failure
    return [];
  }
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

  const requiredColumns = BUDGET_ITEM_COLUMNS;

  let query = supabase
    .from("budget_items")
    .select(requiredColumns)
    .eq("user_id", userId)
    .eq("category", category);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching budget items by category:", error);
    return [];
  }

  return data || [];
}
