"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowUp,
  ArrowDown,
  GripVertical,
  RotateCcw,
  Save,
  AlertTriangle,
} from "lucide-react";
import { CATEGORY_INFO, CALC_TYPE_INFO } from "@/lib/schemas/budget-item";
import { formatCurrency } from "@/lib/utils/format";
import type { BudgetItem } from "@/types/database";

interface PriorityOrderingProps {
  budgetItems: BudgetItem[];
  onUpdatePriorities: (updates: { id: string; priority: number }[]) => void;
  className?: string;
}

interface OrderedItem extends BudgetItem {
  originalPriority: number;
  newPriority: number;
  hasChanged: boolean;
}

export function PriorityOrdering({
  budgetItems,
  onUpdatePriorities,
  className,
}: PriorityOrderingProps) {
  const [orderedItems, setOrderedItems] = useState<OrderedItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize ordered items
  useEffect(() => {
    const activeItems = budgetItems
      .filter((item) => item.is_active)
      .sort((a, b) => a.priority - b.priority)
      .map((item, index) => ({
        ...item,
        originalPriority: item.priority,
        newPriority: index * 10, // Space out priorities by 10
        hasChanged: false,
      }));

    setOrderedItems(activeItems);
    setHasChanges(false);
  }, [budgetItems]);

  // Update priorities based on order
  const updatePriorities = () => {
    const updates = orderedItems
      .map((item, index) => {
        const newPriority = index * 10;
        return {
          ...item,
          newPriority,
          hasChanged: newPriority !== item.originalPriority,
        };
      })
      .filter((item) => item.hasChanged)
      .map((item) => ({
        id: item.id,
        priority: item.newPriority,
      }));

    setOrderedItems((prev) =>
      prev.map((item, index) => ({
        ...item,
        newPriority: index * 10,
        hasChanged: index * 10 !== item.originalPriority,
      }))
    );

    setHasChanges(updates.length > 0);
    return updates;
  };

  // Move item up in priority (lower number = higher priority)
  const moveUp = (index: number) => {
    if (index === 0) return;

    const newItems = [...orderedItems];
    [newItems[index - 1], newItems[index]] = [
      newItems[index],
      newItems[index - 1],
    ];
    setOrderedItems(newItems);

    // Update priorities
    setTimeout(() => {
      const updates = updatePriorities();
      setHasChanges(updates.length > 0);
    }, 0);
  };

  // Move item down in priority (higher number = lower priority)
  const moveDown = (index: number) => {
    if (index === orderedItems.length - 1) return;

    const newItems = [...orderedItems];
    [newItems[index], newItems[index + 1]] = [
      newItems[index + 1],
      newItems[index],
    ];
    setOrderedItems(newItems);

    // Update priorities
    setTimeout(() => {
      const updates = updatePriorities();
      setHasChanges(updates.length > 0);
    }, 0);
  };

  // Reset to original priorities
  const resetPriorities = () => {
    const resetItems = orderedItems
      .map((item) => ({
        ...item,
        newPriority: item.originalPriority,
        hasChanged: false,
      }))
      .sort((a, b) => a.originalPriority - b.originalPriority);

    setOrderedItems(resetItems);
    setHasChanges(false);
  };

  // Save priority changes
  const savePriorities = () => {
    const updates = orderedItems
      .filter((item) => item.hasChanged)
      .map((item) => ({
        id: item.id,
        priority: item.newPriority,
      }));

    if (updates.length > 0) {
      onUpdatePriorities(updates);
    }
  };

  // Set custom priority for an item
  const setCustomPriority = (itemId: string, priority: number) => {
    const updatedItems = orderedItems.map((item) =>
      item.id === itemId
        ? {
            ...item,
            newPriority: priority,
            hasChanged: priority !== item.originalPriority,
          }
        : item
    );

    // Re-sort by new priority
    updatedItems.sort((a, b) => a.newPriority - b.newPriority);
    setOrderedItems(updatedItems);
    setHasChanges(updatedItems.some((item) => item.hasChanged));
  };

  // Check for dependency conflicts
  const getDependencyConflicts = () => {
    const conflicts: { itemId: string; message: string }[] = [];

    orderedItems.forEach((item) => {
      if (item.depends_on && item.depends_on.length > 0) {
        item.depends_on.forEach((depId) => {
          const dependency = orderedItems.find((dep) => dep.id === depId);
          if (dependency && dependency.newPriority >= item.newPriority) {
            conflicts.push({
              itemId: item.id,
              message: `"${item.name}" should have higher priority than "${dependency.name}"`,
            });
          }
        });
      }
    });

    return conflicts;
  };

  const conflicts = getDependencyConflicts();

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GripVertical className="h-5 w-5" />
                Priority Ordering
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Drag items or use arrows to reorder. Lower numbers are
                calculated first.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Button onClick={resetPriorities} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              )}
              <Button onClick={savePriorities} disabled={!hasChanges} size="sm">
                <Save className="h-4 w-4 mr-1" />
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Dependency Conflicts Warning */}
        {conflicts.length > 0 && (
          <CardContent className="pt-0">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Priority Conflicts Detected</span>
              </div>
              <div className="space-y-1 text-sm text-amber-600">
                {conflicts.map((conflict, index) => (
                  <div key={index}>• {conflict.message}</div>
                ))}
              </div>
            </div>
          </CardContent>
        )}

        <CardContent className={conflicts.length > 0 ? "pt-0" : ""}>
          <div className="space-y-2">
            {orderedItems.map((item, index) => {
              const hasConflict = conflicts.some((c) => c.itemId === item.id);
              const isPercentageType = [
                "GROSS_PERCENT",
                "NET_PERCENT",
                "REMAINING_PERCENT",
              ].includes(item.calc_type);

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                    item.hasChanged
                      ? "border-blue-200 bg-blue-50"
                      : hasConflict
                      ? "border-amber-200 bg-amber-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  {/* Priority Number */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={() => moveDown(index)}
                        disabled={index === orderedItems.length - 1}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Item Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{item.name}</span>
                      <Badge
                        variant="outline"
                        className={CATEGORY_INFO[item.category].color}
                      >
                        {CATEGORY_INFO[item.category].label}
                      </Badge>
                      {item.hasChanged && (
                        <Badge
                          variant="outline"
                          className="text-blue-600 border-blue-200"
                        >
                          Changed
                        </Badge>
                      )}
                      {hasConflict && (
                        <Badge
                          variant="outline"
                          className="text-amber-600 border-amber-200"
                        >
                          Conflict
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{CALC_TYPE_INFO[item.calc_type].label}</span>
                      <span className="font-mono">
                        {isPercentageType
                          ? `${item.value}%`
                          : formatCurrency(item.value)}
                      </span>
                      {item.depends_on && item.depends_on.length > 0 && (
                        <span>• {item.depends_on.length} dependencies</span>
                      )}
                    </div>
                  </div>

                  {/* Custom Priority Input */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Priority:</span>
                    <Input
                      type="number"
                      value={item.newPriority}
                      onChange={(e) =>
                        setCustomPriority(
                          item.id,
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-20 h-8 text-center"
                      min="0"
                      max="1000"
                    />
                  </div>

                  {/* Drag Handle */}
                  <div className="cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>

          {orderedItems.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <GripVertical className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active budget items to order</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {hasChanges && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Changes Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {orderedItems
                .filter((item) => item.hasChanged)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between"
                  >
                    <span>{item.name}</span>
                    <span className="text-gray-600">
                      {item.originalPriority} → {item.newPriority}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
