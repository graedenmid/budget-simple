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
  Power,
  PowerOff,
  DollarSign,
  Percent,
} from "lucide-react";
import {
  deleteBudgetItem,
  toggleBudgetItemStatus,
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteBudgetItem(budgetItem.id);
      if (success) {
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to delete budget item:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleToggleStatus = async () => {
    setIsToggling(true);
    try {
      const success = await toggleBudgetItemStatus(
        budgetItem.id,
        !budgetItem.is_active
      );
      if (success) {
        onRefresh();
      }
    } catch (error) {
      console.error("Failed to toggle budget item status:", error);
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
              onClick={handleToggleStatus}
              disabled={isToggling}
            >
              {budgetItem.is_active ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant={showDeleteConfirm ? "destructive" : "outline"}
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              {showDeleteConfirm && <span className="ml-1">Confirm</span>}
            </Button>
          </div>

          {showDeleteConfirm && (
            <div className="text-xs text-red-600 text-center">
              Click delete again to confirm removal
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
