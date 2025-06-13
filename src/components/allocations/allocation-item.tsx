"use client";

import { useState } from "react";
import { Check, X, Edit3, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { AllocationWithDetails } from "@/lib/types/allocations";
import { useAllocationOperations } from "@/lib/hooks/use-allocations";
import { getAllocationStatusColor } from "@/lib/utils/allocation-utils";
import { getCategoryIcon, getCategoryColor } from "@/lib/utils/budget-utils";

interface AllocationItemProps {
  allocation: AllocationWithDetails;
  onUpdate?: () => void;
  disabled?: boolean;
}

export function AllocationItem({
  allocation,
  onUpdate,
  disabled = false,
}: AllocationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(
    allocation.actual_amount?.toString() ||
      allocation.expected_amount.toString()
  );

  const { markAsPaid, markAsUnpaid, updateActualAmount, loading, error } =
    useAllocationOperations();

  const isPaid = allocation.status === "PAID";
  const actualAmount = allocation.actual_amount ?? 0;
  const expectedAmount = allocation.expected_amount;

  const categoryIcon = allocation.budget_item?.category
    ? getCategoryIcon(allocation.budget_item.category)
    : DollarSign;

  const categoryColor = allocation.budget_item?.category
    ? getCategoryColor(allocation.budget_item.category)
    : "blue";

  const statusColor = getAllocationStatusColor(
    allocation.status,
    expectedAmount,
    actualAmount
  );

  const handleTogglePaid = async () => {
    if (disabled || loading) return;

    try {
      if (isPaid) {
        await markAsUnpaid(allocation.id);
      } else {
        const amount = parseFloat(editAmount) || expectedAmount;
        await markAsPaid(allocation.id, amount);
      }
      onUpdate?.();
    } catch (err) {
      console.error("Failed to toggle allocation status:", err);
    }
  };

  const handleSaveAmount = async () => {
    if (disabled || loading) return;

    try {
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount < 0) {
        setEditAmount(
          allocation.actual_amount?.toString() || expectedAmount.toString()
        );
        setIsEditing(false);
        return;
      }

      await updateActualAmount(allocation.id, amount);
      setIsEditing(false);
      onUpdate?.();
    } catch (err) {
      console.error("Failed to update allocation amount:", err);
      setEditAmount(
        allocation.actual_amount?.toString() || expectedAmount.toString()
      );
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditAmount(
      allocation.actual_amount?.toString() || expectedAmount.toString()
    );
    setIsEditing(false);
  };

  const AmountDisplay = () => {
    if (isEditing) {
      return (
        <div className="flex items-center space-x-2">
          <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="pl-8 w-24 h-8 text-sm"
              min="0"
              step="0.01"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveAmount();
                if (e.key === "Escape") handleCancelEdit();
              }}
              autoFocus
            />
          </div>
          <Button size="sm" variant="ghost" onClick={handleSaveAmount}>
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <div className="text-right">
          {isPaid && allocation.actual_amount !== null ? (
            <div className="flex flex-col">
              <span className="font-medium">${actualAmount.toFixed(2)}</span>
              {actualAmount !== expectedAmount && (
                <span className="text-xs text-muted-foreground">
                  Expected: ${expectedAmount.toFixed(2)}
                </span>
              )}
            </div>
          ) : (
            <span className="font-medium">${expectedAmount.toFixed(2)}</span>
          )}
        </div>
        {isPaid && !disabled && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="h-6 w-6 p-0"
            title="Edit amount"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  const IconComponent = categoryIcon;

  return (
    <Card
      className={`p-4 transition-all duration-200 ${
        isPaid ? "bg-green-50 border-green-200" : "bg-background"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-${categoryColor}-100`}>
            <IconComponent className={`h-5 w-5 text-${categoryColor}-600`} />
          </div>

          <div className="flex flex-col">
            <h4 className="font-medium text-sm">
              {allocation.budget_item?.name || "Unknown Budget Item"}
            </h4>
            <div className="flex items-center space-x-2 mt-1">
              <Badge
                variant="outline"
                className={`text-xs bg-${categoryColor}-50 border-${categoryColor}-200`}
              >
                {allocation.budget_item?.category || "Other"}
              </Badge>
              <Badge
                variant={
                  statusColor === "green"
                    ? "default"
                    : statusColor === "yellow"
                    ? "secondary"
                    : statusColor === "red"
                    ? "destructive"
                    : "outline"
                }
                className="text-xs"
              >
                {isPaid ? "Paid" : "Unpaid"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <AmountDisplay />

          <Button
            variant={isPaid ? "default" : "outline"}
            size="sm"
            onClick={handleTogglePaid}
            disabled={disabled || loading}
            className={isPaid ? "bg-green-600 hover:bg-green-700" : ""}
            title={isPaid ? "Mark as unpaid" : "Mark as paid"}
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isPaid ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </Card>
  );
}
