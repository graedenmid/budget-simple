"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  Calendar,
  CalendarX,
  DollarSign,
  Percent,
} from "lucide-react";
import {
  permanentlyDeleteBudgetItem,
  setBudgetItemEndDate,
  removeBudgetItemEndDate,
} from "@/lib/database/client-mutations";
import { CATEGORY_INFO, CALC_TYPE_INFO } from "@/lib/schemas/budget-item";
import type { BudgetItem } from "@/types/database";

interface BudgetItemCardProps {
  budgetItem: BudgetItem;
  onEdit: (budgetItem: BudgetItem) => void;
  onRefresh: () => void;
}

export function BudgetItemCard({
  budgetItem,
  onEdit,
  onRefresh,
}: BudgetItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const categoryInfo = CATEGORY_INFO[budgetItem.category];
  const calcTypeInfo = CALC_TYPE_INFO[budgetItem.calc_type];
  const isPercentageType = [
    "GROSS_PERCENT",
    "NET_PERCENT",
    "REMAINING_PERCENT",
  ].includes(budgetItem.calc_type);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleDelete = async () => {
    const budgetItemName = budgetItem.name;

    // First confirmation with detailed warning
    if (
      !confirm(
        `⚠️ PERMANENT DELETE WARNING ⚠️\n\nAre you sure you want to PERMANENTLY delete "${budgetItemName}"?\n\nThis will:\n• Remove the budget item completely\n• Delete ALL allocation history and records\n• Cannot be undone\n\nThis action is irreversible!`
      )
    ) {
      return;
    }

    // Second confirmation
    if (
      !confirm(
        "Final confirmation: This action CANNOT be undone. Delete permanently?"
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await permanentlyDeleteBudgetItem(budgetItem.id);
      if (success) {
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to permanently delete budget item:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEndDateToggle = async () => {
    setIsToggling(true);
    try {
      const budgetItemName = budgetItem.name;
      let success = false;

      if (budgetItem.end_date && new Date(budgetItem.end_date) <= new Date()) {
        // If already ended, offer to remove end date (reactivate)
        const confirmed = window.confirm(
          `"${budgetItemName}" has already ended. Do you want to remove the end date and make it ongoing again?`
        );
        if (confirmed) {
          success = await removeBudgetItemEndDate(budgetItem.id);
        }
      } else {
        // If ongoing, ask for end date
        const endDateStr = window.prompt(
          `Set end date for "${budgetItemName}"\n\nEnter the date this budget item should end (YYYY-MM-DD):`
        );

        if (endDateStr) {
          const endDate = new Date(endDateStr);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (isNaN(endDate.getTime())) {
            alert("Invalid date format. Please use YYYY-MM-DD format.");
            return;
          }

          if (endDate < today) {
            alert("End date cannot be in the past.");
            return;
          }

          success = await setBudgetItemEndDate(budgetItem.id, endDateStr);
        }
      }

      if (success) {
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to toggle budget item end date:", error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Card
      className={`transition-all ${budgetItem.is_active ? "" : "opacity-60"}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{budgetItem.name}</CardTitle>
              {!budgetItem.is_active && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`${categoryInfo.color} text-xs`}
              >
                <span className="mr-1">{categoryInfo.icon}</span>
                {categoryInfo.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {calcTypeInfo.label}
              </Badge>
              {budgetItem.priority > 0 && (
                <Badge variant="outline" className="text-xs">
                  Priority: {budgetItem.priority}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Value Display */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Amount:</span>
            <div className="flex items-center gap-1">
              {isPercentageType ? (
                <>
                  <Percent className="h-4 w-4 text-gray-400" />
                  <span className="font-mono text-lg font-semibold">
                    {budgetItem.value}%
                  </span>
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="font-mono text-lg font-semibold">
                    {formatCurrency(budgetItem.value)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Cadence */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Frequency:</span>
            <span className="text-sm font-medium capitalize">
              {budgetItem.cadence.replace("-", " ")}
            </span>
          </div>

          {/* Dependencies (for REMAINING_PERCENT) */}
          {budgetItem.calc_type === "REMAINING_PERCENT" &&
            budgetItem.depends_on &&
            budgetItem.depends_on.length > 0 && (
              <div className="space-y-1">
                <span className="text-sm text-gray-600">Dependencies:</span>
                <div className="text-xs text-gray-500">
                  Calculated after {budgetItem.depends_on.length} other item(s)
                </div>
              </div>
            )}

          {/* Description */}
          <div className="pt-2 border-t">
            <CardDescription className="text-xs">
              {calcTypeInfo.description}
            </CardDescription>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(budgetItem)}
              className="flex-1"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndDateToggle}
              disabled={isToggling}
              title={
                budgetItem.end_date &&
                new Date(budgetItem.end_date) <= new Date()
                  ? "Remove end date (make ongoing)"
                  : "Set end date for this budget item"
              }
            >
              {budgetItem.end_date &&
              new Date(budgetItem.end_date) <= new Date() ? (
                <CalendarX className="h-4 w-4" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Permanently delete this budget item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
