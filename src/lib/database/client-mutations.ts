import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type IncomeSourceInsert = Tables["income_sources"]["Insert"];
type IncomeSourceUpdate = Tables["income_sources"]["Update"];

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
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Error deleting income source:", error);
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
