"use client";

import { useState, useCallback } from "react";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseList } from "@/components/expenses/expense-list";
import { ExpenseFilters as ExpenseFiltersType } from "@/lib/types/expenses";

export function ExpenseHistory() {
  const [filters, setFilters] = useState<ExpenseFiltersType>({});

  const handleFiltersChange = useCallback((newFilters: ExpenseFiltersType) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return (
    <div className="space-y-6">
      <ExpenseFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />
      <ExpenseList filters={filters} />
    </div>
  );
}
