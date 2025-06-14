"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, DollarSign, Percent } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getBudgetItemsForUser } from "@/lib/database/client-queries";
import { CATEGORY_INFO } from "@/lib/schemas/budget-item";
import type { BudgetItem } from "@/types/database";

interface BudgetItemSelectorProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function BudgetItemSelector({
  value,
  onValueChange,
  placeholder = "Select budget item (optional)...",
  disabled = false,
}: BudgetItemSelectorProps) {
  const { user } = useAuth();
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBudgetItems() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Only get active budget items for linking
        const items = await getBudgetItemsForUser(user.id, false);
        setBudgetItems(items);
      } catch (err) {
        console.error("Failed to load budget items:", err);
        setError("Failed to load budget items");
      } finally {
        setLoading(false);
      }
    }

    loadBudgetItems();
  }, [user]);

  const handleValueChange = (selectedValue: string) => {
    if (selectedValue === "none") {
      onValueChange(undefined);
    } else {
      onValueChange(selectedValue);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-600">Loading budget items...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 border rounded-md bg-red-50 text-red-600 text-sm">
        {error}
      </div>
    );
  }

  const selectedItem = budgetItems.find((item) => item.id === value);

  return (
    <div className="space-y-2">
      <Select
        value={value || "none"}
        onValueChange={handleValueChange}
        disabled={disabled || budgetItems.length === 0}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder}>
            {selectedItem ? (
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-blue-500" />
                <span>{selectedItem.name}</span>
                <Badge
                  variant="outline"
                  className={`${
                    CATEGORY_INFO[selectedItem.category].color
                  } text-xs`}
                >
                  {CATEGORY_INFO[selectedItem.category].label}
                </Badge>
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">
                No budget item (general expense)
              </span>
            </div>
          </SelectItem>

          {budgetItems.length === 0 ? (
            <div className="p-2 text-sm text-gray-500 text-center">
              No active budget items available
            </div>
          ) : (
            budgetItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-1 text-gray-400">
                    {item.calc_type === "FIXED" ? (
                      <DollarSign className="h-3 w-3" />
                    ) : (
                      <Percent className="h-3 w-3" />
                    )}
                  </div>
                  <span className="font-medium truncate">{item.name}</span>
                  <Badge
                    variant="outline"
                    className={`${
                      CATEGORY_INFO[item.category].color
                    } text-xs flex-shrink-0`}
                  >
                    {CATEGORY_INFO[item.category].label}
                  </Badge>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {selectedItem && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md text-sm text-blue-700">
          <Link2 className="h-4 w-4" />
          <span>
            This expense will be tracked against your{" "}
            <strong>{selectedItem.name}</strong> budget allocation
          </span>
        </div>
      )}

      {budgetItems.length === 0 && !loading && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
          No budget items available. Create budget items to track expenses
          against your budget.
        </div>
      )}
    </div>
  );
}
