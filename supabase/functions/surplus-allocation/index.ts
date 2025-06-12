import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface AllocationRequest {
  user_id: string;
  pay_period_id: string;
  allocations: Array<{
    type: string;
    target_item_id?: string;
    amount: number;
    description: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_id, pay_period_id, allocations }: AllocationRequest =
      await req.json();

    if (!user_id || !pay_period_id || !allocations) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate pay period exists and belongs to user
    const { data: payPeriod, error: payPeriodError } = await supabase
      .from("pay_periods")
      .select("*")
      .eq("id", pay_period_id)
      .eq("user_id", user_id)
      .single();

    if (payPeriodError || !payPeriod) {
      return new Response(JSON.stringify({ error: "Pay period not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create surplus allocation records
    const allocationRecords = allocations.map((allocation) => ({
      pay_period_id,
      type: allocation.type,
      target_item_id: allocation.target_item_id,
      amount: allocation.amount,
      description: allocation.description,
      applied_at: new Date().toISOString(),
      status: "APPLIED",
    }));

    const { data: results, error: insertError } = await supabase
      .from("surplus_allocations")
      .insert(allocationRecords)
      .select();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to create allocations" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate totals
    const totalAllocated = allocations.reduce(
      (sum, alloc) => sum + alloc.amount,
      0
    );

    return new Response(
      JSON.stringify({
        success: true,
        allocations: results,
        summary: {
          total_allocated: totalAllocated,
          allocation_count: allocations.length,
          pay_period_id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Surplus allocation error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
