import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type IncomeSourceInsert = Tables["income_sources"]["Insert"];
type IncomeSourceUpdate = Tables["income_sources"]["Update"];
type BudgetItemInsert = Tables["budget_items"]["Insert"];
type BudgetItemUpdate = Tables["budget_items"]["Update"];

// Income source mutations for client components
export async function createIncomeSource(
  incomeSource: IncomeSourceInsert
): Promise<string | null> {
  const supabase = createClient();

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
  const supabase = createClient();

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
  const supabase = createClient();

  // Soft delete by setting is_active to false
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

export async function permanentlyDeleteIncomeSource(
  id: string
): Promise<boolean> {
  const supabase = createClient();

  // Hard delete - permanently removes the record and all history
  // Note: This will cascade delete income_history due to foreign key constraints
  const { error } = await supabase.from("income_sources").delete().eq("id", id);

  if (error) {
    console.error("Error permanently deleting income source:", error);
    return false;
  }

  return true;
}

export async function activateIncomeSource(id: string): Promise<boolean> {
  const supabase = createClient();

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
  const supabase = createClient();

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

// Budget item mutations for client components
export async function createBudgetItem(
  budgetItem: BudgetItemInsert
): Promise<string | null> {
  const supabase = createClient();

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
  const supabase = createClient();

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
  const supabase = createClient();

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

export async function permanentlyDeleteBudgetItem(
  id: string
): Promise<boolean> {
  const supabase = createClient();

  // Hard delete - permanently removes the record and all related data
  // Note: This will cascade delete related allocations due to foreign key constraints
  const { error } = await supabase.from("budget_items").delete().eq("id", id);

  if (error) {
    console.error("Error permanently deleting budget item:", error);
    return false;
  }

  return true;
}

export async function activateBudgetItem(id: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("budget_items")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error activating budget item:", error);
    return false;
  }

  return true;
}

export async function deactivateBudgetItem(id: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("budget_items")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error deactivating budget item:", error);
    return false;
  }

  return true;
}

export async function toggleBudgetItemStatus(
  id: string,
  isActive: boolean
): Promise<boolean> {
  return isActive ? activateBudgetItem(id) : deactivateBudgetItem(id);
}

export async function updateBudgetItemPriorities(
  budgetItems: { id: string; priority: number }[]
): Promise<boolean> {
  const supabase = createClient();

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

// Budget item end date operations
export async function setBudgetItemEndDate(
  id: string,
  endDate: string
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("budget_items")
    .update({
      end_date: endDate,
      is_active: false, // End date means inactive
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error setting budget item end date:", error);
    return false;
  }

  return true;
}

export async function removeBudgetItemEndDate(id: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("budget_items")
    .update({
      end_date: null,
      is_active: true, // Remove end date means active
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error removing budget item end date:", error);
    return false;
  }

  return true;
}
