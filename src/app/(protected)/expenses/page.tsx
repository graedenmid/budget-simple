"use client";

import { useState } from "react";
import { Plus, Receipt, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseHistory } from "@/components/expenses/expense-history";

export default function ExpensesPage() {
  const [showForm, setShowForm] = useState(false);

  const handleRefresh = () => {
    // ExpenseHistory component handles its own data refreshing via useExpenses hook
    window.location.reload();
  };

  const handleExpenseAdded = () => {
    setShowForm(false);
    // ExpenseHistory will automatically refresh via real-time subscriptions
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Expense Tracking
          </h1>
          <p className="text-muted-foreground">
            Log and categorize your expenses with advanced filtering and search
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            title="Refresh expenses"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Instructions Card */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Receipt className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-medium text-green-900">
                Track Your Expenses
              </h3>
              <p className="text-sm text-green-700">
                Record your daily expenses and use powerful filters to analyze
                spending patterns.
              </p>
              <ul className="text-sm text-green-600 mt-2 space-y-1">
                <li>
                  • Add expenses with date, amount, description, and category
                </li>
                <li>
                  • Filter by date range, category, amount, or search text
                </li>
                <li>• Track spending patterns and analyze expense history</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Expense Form - Shows when Add Expense is clicked */}
        {showForm && (
          <ExpenseForm
            onSuccess={handleExpenseAdded}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Expense History with Filters and List */}
        <ExpenseHistory />
      </div>
    </div>
  );
}
