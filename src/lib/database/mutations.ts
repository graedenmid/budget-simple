import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type IncomeSourceInsert = Tables["income_sources"]["Insert"];
type IncomeSourceUpdate = Tables["income_sources"]["Update"];
type BudgetItemInsert = Tables["budget_items"]["Insert"];
type BudgetItemUpdate = Tables["budget_items"]["Update"];
type PayPeriodInsert = Tables["pay_periods"]["Insert"];
type PayPeriodUpdate = Tables["pay_periods"]["Update"];
type AllocationInsert = Tables["allocations"]["Insert"];
type AllocationUpdate = Tables["allocations"]["Update"];
type ExpenseInsert = Tables["expenses"]["Insert"];
type ExpenseUpdate = Tables["expenses"]["Update"];
type SuggestionInsert = Tables["suggestions"]["Insert"];
type SuggestionUpdate = Tables["suggestions"]["Update"];
type UserUpdate = Tables["users"]["Update"];

// User mutations
export async function updateUser(
  userId: string,
  updates: UserUpdate
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId);

  if (error) {
    console.error("Error updating user:", error);
    return false;
  }

  return true;
}

// Income source mutations
export async function createIncomeSource(
  incomeSource: IncomeSourceInsert
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("income_sources")
    .insert(incomeSource)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating income source:", error);
    return null;
  }

  return data.id;
}

export async function updateIncomeSource(
  id: string,
  updates: IncomeSourceUpdate
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("income_sources")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating income source:", error);
    return false;
  }

  return true;
}

export async function deleteIncomeSource(id: string): Promise<boolean> {
  const supabase = await createClient();

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from("income_sources")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Error deleting income source:", error);
    return false;
  }

  return true;
}

export async function activateIncomeSource(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("income_sources")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error activating income source:", error);
    return false;
  }

  return true;
}

export async function deactivateIncomeSource(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("income_sources")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error deactivating income source:", error);
    return false;
  }

  return true;
}

export async function toggleIncomeSourceStatus(
  id: string,
  isActive: boolean
): Promise<boolean> {
  return isActive ? activateIncomeSource(id) : deactivateIncomeSource(id);
}

// Budget item mutations
export async function createBudgetItem(
  budgetItem: BudgetItemInsert
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_items")
    .insert(budgetItem)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating budget item:", error);
    return null;
  }

  return data.id;
}

export async function updateBudgetItem(
  id: string,
  updates: BudgetItemUpdate
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("budget_items")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating budget item:", error);
    return false;
  }

  return true;
}

export async function deleteBudgetItem(id: string): Promise<boolean> {
  const supabase = await createClient();

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from("budget_items")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Error deleting budget item:", error);
    return false;
  }

  return true;
}

export async function updateBudgetItemPriorities(
  budgetItems: { id: string; priority: number }[]
): Promise<boolean> {
  const supabase = await createClient();

  try {
    for (const item of budgetItems) {
      const { error } = await supabase
        .from("budget_items")
        .update({ priority: item.priority })
        .eq("id", item.id);

      if (error) {
        console.error("Error updating budget item priority:", error);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Error updating budget item priorities:", error);
    return false;
  }
}

// Pay period mutations
export async function createPayPeriod(
  payPeriod: PayPeriodInsert
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pay_periods")
    .insert(payPeriod)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating pay period:", error);
    return null;
  }

  return data.id;
}

export async function updatePayPeriod(
  id: string,
  updates: PayPeriodUpdate
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("pay_periods")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating pay period:", error);
    return false;
  }

  return true;
}

export async function completePayPeriod(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("pay_periods")
    .update({ status: "COMPLETED" })
    .eq("id", id);

  if (error) {
    console.error("Error completing pay period:", error);
    return false;
  }

  return true;
}

// Allocation mutations
export async function createAllocation(
  allocation: AllocationInsert
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("allocations")
    .insert(allocation)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating allocation:", error);
    return null;
  }

  return data.id;
}

export async function updateAllocation(
  id: string,
  updates: AllocationUpdate
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("allocations")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating allocation:", error);
    return false;
  }

  return true;
}

export async function markAllocationPaid(
  id: string,
  actualAmount?: number
): Promise<boolean> {
  const supabase = await createClient();

  const updates: AllocationUpdate = { status: "PAID" };
  if (actualAmount !== undefined) {
    updates.actual_amount = actualAmount;
  }

  const { error } = await supabase
    .from("allocations")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error marking allocation as paid:", error);
    return false;
  }

  return true;
}

export async function createMultipleAllocations(
  allocations: AllocationInsert[]
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("allocations").insert(allocations);

  if (error) {
    console.error("Error creating multiple allocations:", error);
    return false;
  }

  return true;
}

// Expense mutations
export async function createExpense(
  expense: ExpenseInsert
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .insert(expense)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating expense:", error);
    return null;
  }

  return data.id;
}

export async function updateExpense(
  id: string,
  updates: ExpenseUpdate
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating expense:", error);
    return false;
  }

  return true;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    console.error("Error deleting expense:", error);
    return false;
  }

  return true;
}

// Suggestion mutations
export async function createSuggestion(
  suggestion: SuggestionInsert
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suggestions")
    .insert(suggestion)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating suggestion:", error);
    return null;
  }

  return data.id;
}

export async function updateSuggestion(
  id: string,
  updates: SuggestionUpdate
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("suggestions")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating suggestion:", error);
    return false;
  }

  return true;
}

export async function applySuggestion(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("suggestions")
    .update({ status: "APPLIED" })
    .eq("id", id);

  if (error) {
    console.error("Error applying suggestion:", error);
    return false;
  }

  return true;
}

export async function createMultipleSuggestions(
  suggestions: SuggestionInsert[]
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("suggestions").insert(suggestions);

  if (error) {
    console.error("Error creating multiple suggestions:", error);
    return false;
  }

  return true;
}

export async function deleteSuggestion(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("suggestions").delete().eq("id", id);

  if (error) {
    console.error("Error deleting suggestion:", error);
    return false;
  }

  return true;
}
