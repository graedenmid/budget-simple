"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, Save, X } from "lucide-react";
import { CategorySelector } from "./category-selector";
import { BudgetItemSelector } from "./budget-item-selector";
import { DuplicateWarningDialog } from "./duplicate-warning-dialog";
import { useExpenseOperations } from "@/lib/hooks/use-expenses";
import { useDuplicateDetection } from "@/lib/hooks/use-duplicate-detection";
import { ExpenseCreateData } from "@/lib/types/expenses";

interface ExpenseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingExpense, setPendingExpense] =
    useState<ExpenseCreateData | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const { createExpense, loading } = useExpenseOperations();
  const {
    checkForDuplicates,
    duplicateExpense,
    loading: duplicateLoading,
    clearDuplicateState,
  } = useDuplicateDetection();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseCreateData>({
    defaultValues: {
      date: new Date().toISOString().split("T")[0], // Today's date
      description: "",
      category: "",
      budget_item_id: undefined,
      type: "EXPENSE",
    },
  });

  const selectedCategory = watch("category");
  const selectedBudgetItem = watch("budget_item_id");

  const onSubmit = async (data: ExpenseCreateData) => {
    try {
      setError(null);

      // Basic validation
      if (!data.description?.trim()) {
        setError("Description is required");
        return;
      }
      if (!data.amount || data.amount <= 0) {
        setError("Amount must be greater than 0");
        return;
      }
      if (!data.category) {
        setError("Category is required");
        return;
      }
      if (!data.date) {
        setError("Date is required");
        return;
      }

      // If budget item is selected, mark as budget payment
      const expenseData: ExpenseCreateData = {
        ...data,
        type: data.budget_item_id
          ? ("BUDGET_PAYMENT" as const)
          : ("EXPENSE" as const),
      };

      // Check for duplicates before creating
      const duplicateResult = await checkForDuplicates(expenseData);

      if (duplicateResult?.is_duplicate && duplicateExpense) {
        // Show duplicate warning dialog
        setPendingExpense(expenseData);
        setShowDuplicateWarning(true);
        return;
      }

      // No duplicates found, create expense directly
      const result = await createExpense(expenseData);
      if (result) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense");
    }
  };

  // Handle user choosing to save expense anyway despite duplicate warning
  const handleSaveAnyway = async () => {
    if (!pendingExpense) return;

    try {
      setError(null);
      setShowDuplicateWarning(false);

      const result = await createExpense(pendingExpense);
      if (result) {
        setPendingExpense(null);
        clearDuplicateState();
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense");
    }
  };

  // Handle user canceling duplicate warning (go back to edit)
  const handleCancelDuplicateWarning = () => {
    setShowDuplicateWarning(false);
    setPendingExpense(null);
    clearDuplicateState();
  };

  const isLoading = loading || duplicateLoading;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Add New Expense</span>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Date and Amount Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  {...register("date", { required: "Date is required" })}
                />
                {errors.date && (
                  <p className="text-sm text-red-600">{errors.date.message}</p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register("amount", {
                    required: "Amount is required",
                    valueAsNumber: true,
                    min: {
                      value: 0.01,
                      message: "Amount must be greater than 0",
                    },
                  })}
                />
                {errors.amount && (
                  <p className="text-sm text-red-600">
                    {errors.amount.message}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Grocery shopping, Gas station, Restaurant meal"
                {...register("description", {
                  required: "Description is required",
                })}
              />
              {errors.description && (
                <p className="text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <CategorySelector
                value={selectedCategory}
                onValueChange={(value) => setValue("category", value)}
                placeholder="Select expense category..."
              />
              {!selectedCategory && (
                <p className="text-sm text-red-600">Category is required</p>
              )}
            </div>

            {/* Budget Item Linking */}
            <div className="space-y-2">
              <Label>Budget Item (Optional)</Label>
              <BudgetItemSelector
                value={selectedBudgetItem || undefined}
                onValueChange={(value) =>
                  setValue("budget_item_id", value || undefined)
                }
                placeholder="Link to a budget item to track spending..."
              />
              <p className="text-sm text-gray-600">
                Link this expense to a budget item to track your actual spending
                against your planned budget.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Expense
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Duplicate Warning Dialog */}
      {showDuplicateWarning && pendingExpense && duplicateExpense && (
        <DuplicateWarningDialog
          isOpen={showDuplicateWarning}
          onClose={handleCancelDuplicateWarning}
          onSaveAnyway={handleSaveAnyway}
          onCancel={handleCancelDuplicateWarning}
          currentExpense={pendingExpense}
          duplicateExpense={duplicateExpense}
          loading={loading}
        />
      )}
    </>
  );
}
