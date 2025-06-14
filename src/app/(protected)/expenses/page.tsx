"use client";

import { useState } from "react";
import { Plus, Receipt, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseList } from "@/components/expenses/expense-list";

export default function ExpensesPage() {
  const [showForm, setShowForm] = useState(false);

  const handleRefresh = () => {
    // ExpenseList component handles its own data refreshing via useExpenses hook
    window.location.reload();
  };

  const handleExpenseAdded = () => {
    setShowForm(false);
    // ExpenseList will automatically refresh via real-time subscriptions
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
            Log and categorize your expenses to track spending against your
            budget
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
                Record your daily expenses to monitor spending patterns and stay
                within your budget.
              </p>
              <ul className="text-sm text-green-600 mt-2 space-y-1">
                <li>
                  • Add expenses with date, amount, description, and category
                </li>
                <li>• View expense history with category breakdown</li>
                <li>• Track spending patterns over time</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Form - Shows when Add Expense is clicked */}
        {showForm && (
          <div className="lg:col-span-2">
            <ExpenseForm
              onSuccess={handleExpenseAdded}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Expense List */}
        <div className={showForm ? "lg:col-span-1" : "lg:col-span-3"}>
          <ExpenseList
            onExpenseEdit={(expense) => {
              // TODO: Implement edit functionality
              console.log("Edit expense:", expense);
            }}
            onExpenseDelete={(expenseId) => {
              // TODO: Implement delete functionality
              console.log("Delete expense:", expenseId);
            }}
          />
        </div>
      </div>
    </div>
  );
}
