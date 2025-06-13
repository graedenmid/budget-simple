"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Info, DollarSign, Percent } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  createBudgetItem,
  updateBudgetItem,
} from "@/lib/database/client-mutations";
import { getBudgetItemsForUser } from "@/lib/database/client-queries";
import { getCadenceOptions } from "@/lib/utils/cadence";
import {
  budgetItemSchema,
  CATEGORY_INFO,
  CALC_TYPE_INFO,
  BUDGET_CATEGORIES,
  CALC_TYPES,
} from "@/lib/schemas/budget-item";
import { CalculationPreview } from "./calculation-preview";
import type { BudgetItem, IncomeCadence } from "@/types/database";

interface BudgetItemFormData {
  name: string;
  category: "Bills" | "Savings" | "Debt" | "Giving" | "Discretionary" | "Other";
  calc_type: "FIXED" | "GROSS_PERCENT" | "NET_PERCENT" | "REMAINING_PERCENT";
  value: number;
  cadence: IncomeCadence;
  depends_on: string[];
  priority: number;
  is_active: boolean;
}

interface BudgetItemFormProps {
  budgetItem?: BudgetItem | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BudgetItemForm({
  budgetItem,
  onSuccess,
  onCancel,
}: BudgetItemFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDependencies, setAvailableDependencies] = useState<
    BudgetItem[]
  >([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(budgetItemSchema),
    defaultValues: {
      name: budgetItem?.name || "",
      category: budgetItem?.category || "Bills",
      calc_type: budgetItem?.calc_type || "FIXED",
      value: budgetItem?.value || 0,
      cadence: budgetItem?.cadence || "monthly",
      depends_on: budgetItem?.depends_on || [],
      priority: budgetItem?.priority || 0,
      is_active: budgetItem?.is_active ?? true,
    },
  });

  const watchedCalcType = watch("calc_type");
  const watchedCategory = watch("category");

  // Load available dependencies (other budget items)
  useEffect(() => {
    async function loadDependencies() {
      if (!user) return;

      const items = await getBudgetItemsForUser(user.id, true);
      // Filter out current item if editing
      const filtered = budgetItem
        ? items.filter((item) => item.id !== budgetItem.id)
        : items;
      setAvailableDependencies(filtered);
    }

    loadDependencies();
  }, [user, budgetItem]);

  const onSubmit = async (data: BudgetItemFormData) => {
    if (!user) {
      setError("You must be logged in to create budget items");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (budgetItem) {
        // Update existing budget item
        const success = await updateBudgetItem(budgetItem.id, data);
        if (!success) {
          throw new Error("Failed to update budget item");
        }
      } else {
        // Create new budget item
        const budgetItemData = {
          name: data.name,
          category: data.category,
          calc_type: data.calc_type,
          value: data.value,
          cadence: data.cadence,
          depends_on: data.depends_on,
          priority: data.priority,
          is_active: data.is_active,
          user_id: user.id,
        };

        const id = await createBudgetItem(budgetItemData);
        if (!id) {
          throw new Error("Failed to create budget item");
        }
      }

      onSuccess();
    } catch (err) {
      console.error("Error saving budget item:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save budget item"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryInfo = CATEGORY_INFO[watchedCategory];
  const calcTypeInfo = CALC_TYPE_INFO[watchedCalcType];
  const isPercentageType = [
    "GROSS_PERCENT",
    "NET_PERCENT",
    "REMAINING_PERCENT",
  ].includes(watchedCalcType);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>
              {budgetItem ? "Edit Budget Item" : "Add Budget Item"}
            </CardTitle>
            <CardDescription>
              {budgetItem
                ? "Update your budget item details"
                : "Add a new item to your budget"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Budget Item Name</Label>
            <Input
              id="name"
              placeholder="e.g., Rent, Emergency Fund, Car Payment"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={watchedCategory}
              onValueChange={(value) =>
                setValue("category", value as typeof watchedCategory)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    <div className="flex items-center gap-2">
                      <span>{CATEGORY_INFO[category].icon}</span>
                      <span>{CATEGORY_INFO[category].label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryInfo && (
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-md">
                <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">
                  {categoryInfo.description}
                </p>
              </div>
            )}
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          {/* Calculation Type */}
          <div className="space-y-2">
            <Label htmlFor="calc_type">Calculation Type</Label>
            <Select
              value={watchedCalcType}
              onValueChange={(value) =>
                setValue("calc_type", value as typeof watchedCalcType)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select calculation type" />
              </SelectTrigger>
              <SelectContent>
                {CALC_TYPES.map((calcType) => (
                  <SelectItem key={calcType} value={calcType}>
                    <div className="flex items-center gap-2">
                      {calcType === "FIXED" ? (
                        <DollarSign className="h-4 w-4" />
                      ) : (
                        <Percent className="h-4 w-4" />
                      )}
                      <span>{CALC_TYPE_INFO[calcType].label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {calcTypeInfo && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-700 font-medium">
                    {calcTypeInfo.description}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Example: {calcTypeInfo.example}
                  </p>
                </div>
              </div>
            )}
            {errors.calc_type && (
              <p className="text-sm text-red-600">{errors.calc_type.message}</p>
            )}
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="value">{calcTypeInfo?.valueLabel || "Value"}</Label>
            <div className="relative">
              <Input
                id="value"
                type="number"
                step={isPercentageType ? "0.01" : "0.01"}
                min="0"
                max={isPercentageType ? "100" : "999999.99"}
                placeholder={isPercentageType ? "0.00" : "0.00"}
                {...register("value", { valueAsNumber: true })}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {isPercentageType ? (
                  <Percent className="h-4 w-4 text-gray-400" />
                ) : (
                  <DollarSign className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
            {errors.value && (
              <p className="text-sm text-red-600">{errors.value.message}</p>
            )}
          </div>

          {/* Calculation Preview */}
          <CalculationPreview
            budgetItem={{
              calc_type: watchedCalcType,
              value: watch("value"),
              depends_on: watch("depends_on"),
            }}
          />

          {/* Dependencies (for REMAINING_PERCENT) */}
          {watchedCalcType === "REMAINING_PERCENT" && (
            <div className="space-y-2">
              <Label>Dependencies</Label>
              <p className="text-sm text-gray-600">
                Select budget items that should be calculated before this one.
                This item will be calculated as a percentage of the remaining
                income after these items are allocated.
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {availableDependencies.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No other budget items available for dependencies
                  </p>
                ) : (
                  availableDependencies.map((item) => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`dep-${item.id}`}
                        value={item.id}
                        {...register("depends_on")}
                        className="rounded border-gray-300"
                      />
                      <Label
                        htmlFor={`dep-${item.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {item.name}
                        <Badge
                          variant="outline"
                          className={`ml-2 ${
                            CATEGORY_INFO[item.category].color
                          }`}
                        >
                          {CATEGORY_INFO[item.category].label}
                        </Badge>
                      </Label>
                    </div>
                  ))
                )}
              </div>
              {errors.depends_on && (
                <p className="text-sm text-red-600">
                  {errors.depends_on.message}
                </p>
              )}
            </div>
          )}

          {/* Cadence */}
          <div className="space-y-2">
            <Label htmlFor="cadence">Payment Frequency</Label>
            <Select
              value={watch("cadence")}
              onValueChange={(value) =>
                setValue("cadence", value as IncomeCadence)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {getCadenceOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cadence && (
              <p className="text-sm text-red-600">{errors.cadence.message}</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Input
              id="priority"
              type="number"
              min="0"
              max="1000"
              placeholder="0"
              {...register("priority", { valueAsNumber: true })}
            />
            <p className="text-sm text-gray-600">
              Lower numbers are calculated first. Use this to control the order
              of budget item calculations.
            </p>
            {errors.priority && (
              <p className="text-sm text-red-600">{errors.priority.message}</p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={watch("is_active")}
              onChange={(e) => setValue("is_active", e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="is_active">Active</Label>
            <p className="text-sm text-gray-600">
              Inactive items will not be included in budget calculations
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {budgetItem ? "Update Budget Item" : "Create Budget Item"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
