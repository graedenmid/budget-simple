"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowDown,
  Link,
  Unlink,
  Target,
  Shuffle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { CATEGORY_INFO, CALC_TYPE_INFO } from "@/lib/schemas/budget-item";
import { resolveBudgetItemDependencies } from "@/lib/calculations/budget-calculations";
import { formatCurrency } from "@/lib/calculations/budget-calculations";
import type { BudgetItem } from "@/types/database";

// Check for circular dependencies
function checkCircularDependency(
  item: BudgetItem,
  allItems: BudgetItem[],
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(item.id)) {
    return true; // Circular dependency found
  }

  visited.add(item.id);

  if (item.depends_on) {
    for (const depId of item.depends_on) {
      const dependency = allItems.find((dep) => dep.id === depId);
      if (
        dependency &&
        checkCircularDependency(dependency, allItems, visited)
      ) {
        return true;
      }
    }
  }

  visited.delete(item.id);
  return false;
}

interface DependencyManagerProps {
  budgetItems: BudgetItem[];
  onUpdatePriorities: (updates: { id: string; priority: number }[]) => void;
  onUpdateDependencies: (
    updates: { id: string; depends_on: string[] }[]
  ) => void;
  className?: string;
}

interface DependencyIssue {
  type: "circular" | "missing" | "priority_conflict";
  itemId: string;
  message: string;
  severity: "error" | "warning";
}

export function DependencyManager({
  budgetItems,
  onUpdatePriorities,
  onUpdateDependencies,
  className,
}: DependencyManagerProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [priorityMode, setPriorityMode] = useState<"manual" | "auto">("manual");
  const [issues, setIssues] = useState<DependencyIssue[]>([]);

  // Analyze dependency issues
  const dependencyAnalysis = useMemo(() => {
    const activeItems = budgetItems.filter((item) => item.is_active);
    const issues: DependencyIssue[] = [];

    // Check for circular dependencies
    try {
      resolveBudgetItemDependencies(activeItems);
    } catch {
      // If resolution fails, there might be circular dependencies
      activeItems.forEach((item) => {
        if (item.depends_on && item.depends_on.length > 0) {
          const hasCircular = checkCircularDependency(item, activeItems);
          if (hasCircular) {
            issues.push({
              type: "circular",
              itemId: item.id,
              message: "Circular dependency detected",
              severity: "error",
            });
          }
        }
      });
    }

    // Check for missing dependencies
    activeItems.forEach((item) => {
      if (item.depends_on) {
        item.depends_on.forEach((depId) => {
          const depExists = activeItems.find((dep) => dep.id === depId);
          if (!depExists) {
            issues.push({
              type: "missing",
              itemId: item.id,
              message: `Depends on non-existent or inactive item`,
              severity: "warning",
            });
          }
        });
      }
    });

    // Check for priority conflicts
    activeItems.forEach((item) => {
      if (item.depends_on && item.depends_on.length > 0) {
        item.depends_on.forEach((depId) => {
          const dependency = activeItems.find((dep) => dep.id === depId);
          if (dependency && dependency.priority >= item.priority) {
            issues.push({
              type: "priority_conflict",
              itemId: item.id,
              message: `Priority should be higher than dependencies`,
              severity: "warning",
            });
          }
        });
      }
    });

    return {
      issues,
      resolvedOrder: resolveBudgetItemDependencies(activeItems),
      hasErrors: issues.some((issue) => issue.severity === "error"),
      hasWarnings: issues.some((issue) => issue.severity === "warning"),
    };
  }, [budgetItems]);

  useEffect(() => {
    setIssues(dependencyAnalysis.issues);
  }, [dependencyAnalysis]);

  // Auto-assign priorities based on dependencies
  function autoAssignPriorities() {
    const activeItems = budgetItems.filter((item) => item.is_active);
    const updates: { id: string; priority: number }[] = [];

    // Start with items that have no dependencies
    const processed = new Set<string>();

    function assignPriority(item: BudgetItem): number {
      if (processed.has(item.id)) {
        return item.priority;
      }

      let maxDepPriority = -1;

      if (item.depends_on && item.depends_on.length > 0) {
        item.depends_on.forEach((depId) => {
          const dependency = activeItems.find((dep) => dep.id === depId);
          if (dependency) {
            const depPriority = assignPriority(dependency);
            maxDepPriority = Math.max(maxDepPriority, depPriority);
          }
        });
      }

      const newPriority = maxDepPriority + 10;
      processed.add(item.id);

      if (newPriority !== item.priority) {
        updates.push({ id: item.id, priority: newPriority });
      }

      return newPriority;
    }

    activeItems.forEach(assignPriority);

    if (updates.length > 0) {
      onUpdatePriorities(updates);
    }
  }

  // Remove all dependencies
  function clearAllDependencies() {
    const updates = budgetItems
      .filter((item) => item.depends_on && item.depends_on.length > 0)
      .map((item) => ({ id: item.id, depends_on: [] }));

    if (updates.length > 0) {
      onUpdateDependencies(updates);
    }
  }

  // Get dependency chain for an item
  function getDependencyChain(itemId: string): BudgetItem[] {
    const chain: BudgetItem[] = [];
    const visited = new Set<string>();

    function buildChain(id: string) {
      if (visited.has(id)) return;
      visited.add(id);

      const item = budgetItems.find((item) => item.id === id);
      if (!item) return;

      if (item.depends_on) {
        item.depends_on.forEach(buildChain);
      }

      chain.push(item);
    }

    buildChain(itemId);
    return chain;
  }

  const selectedItemData = selectedItem
    ? budgetItems.find((item) => item.id === selectedItem)
    : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Dependency & Priority Manager
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage calculation order and dependencies for budget items
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={priorityMode}
                onValueChange={(value) =>
                  setPriorityMode(value as "manual" | "auto")
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
              {priorityMode === "auto" && (
                <Button onClick={autoAssignPriorities} size="sm">
                  <Shuffle className="h-4 w-4 mr-1" />
                  Auto-Assign
                </Button>
              )}
              <Button
                onClick={clearAllDependencies}
                variant="outline"
                size="sm"
              >
                <Unlink className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Issues Summary */}
        {(dependencyAnalysis.hasErrors || dependencyAnalysis.hasWarnings) && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              {dependencyAnalysis.hasErrors && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {issues.filter((i) => i.severity === "error").length}{" "}
                    error(s) found
                  </span>
                </div>
              )}
              {dependencyAnalysis.hasWarnings && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-md">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {issues.filter((i) => i.severity === "warning").length}{" "}
                    warning(s) found
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculation Order */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4" />
              Calculation Order
            </CardTitle>
            <p className="text-sm text-gray-600">
              Items are calculated in this order based on priorities and
              dependencies
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dependencyAnalysis.resolvedOrder.map((item, index) => {
                const itemIssues = issues.filter(
                  (issue) => issue.itemId === item.id
                );
                const hasError = itemIssues.some(
                  (issue) => issue.severity === "error"
                );
                const hasWarning = itemIssues.some(
                  (issue) => issue.severity === "warning"
                );

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedItem === item.id
                        ? "border-blue-200 bg-blue-50"
                        : hasError
                        ? "border-red-200 bg-red-50"
                        : hasWarning
                        ? "border-amber-200 bg-amber-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedItem(item.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Badge
                            variant="outline"
                            className={CATEGORY_INFO[item.category].color}
                          >
                            {CATEGORY_INFO[item.category].label}
                          </Badge>
                          <span>Priority: {item.priority}</span>
                          {item.depends_on && item.depends_on.length > 0 && (
                            <span>• {item.depends_on.length} dependencies</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {hasError && <XCircle className="h-4 w-4 text-red-500" />}
                      {hasWarning && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      {!hasError && !hasWarning && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Item Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              {selectedItemData ? "Item Details" : "Select an Item"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedItemData ? (
              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h4 className="font-medium mb-2">{selectedItemData.name}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Category:</span>
                      <div className="mt-1">
                        <Badge
                          variant="outline"
                          className={
                            CATEGORY_INFO[selectedItemData.category].color
                          }
                        >
                          {CATEGORY_INFO[selectedItemData.category].label}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <div className="mt-1 text-sm">
                        {CALC_TYPE_INFO[selectedItemData.calc_type].label}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Value:</span>
                      <div className="mt-1 font-mono">
                        {selectedItemData.calc_type === "FIXED"
                          ? formatCurrency(selectedItemData.value)
                          : `${selectedItemData.value}%`}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Priority:</span>
                      <div className="mt-1 font-mono">
                        {selectedItemData.priority}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dependencies */}
                {selectedItemData.depends_on &&
                  selectedItemData.depends_on.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Dependencies</h5>
                      <div className="space-y-2">
                        {selectedItemData.depends_on.map((depId) => {
                          const dependency = budgetItems.find(
                            (item) => item.id === depId
                          );
                          return dependency ? (
                            <div
                              key={depId}
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                            >
                              <Link className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{dependency.name}</span>
                              <Badge
                                variant="outline"
                                className={`${
                                  CATEGORY_INFO[dependency.category].color
                                } text-xs`}
                              >
                                {CATEGORY_INFO[dependency.category].label}
                              </Badge>
                            </div>
                          ) : (
                            <div
                              key={depId}
                              className="flex items-center gap-2 p-2 bg-red-50 rounded"
                            >
                              <XCircle className="h-3 w-3 text-red-500" />
                              <span className="text-sm text-red-600">
                                Missing dependency
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Issues */}
                {issues.filter((issue) => issue.itemId === selectedItemData.id)
                  .length > 0 && (
                  <div>
                    <h5 className="font-medium mb-2">Issues</h5>
                    <div className="space-y-2">
                      {issues
                        .filter((issue) => issue.itemId === selectedItemData.id)
                        .map((issue, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-2 p-2 rounded text-sm ${
                              issue.severity === "error"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {issue.severity === "error" ? (
                              <XCircle className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {issue.message}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Dependency Chain */}
                {selectedItemData.calc_type === "REMAINING_PERCENT" && (
                  <div>
                    <h5 className="font-medium mb-2">Calculation Chain</h5>
                    <div className="text-xs text-gray-600 space-y-1">
                      {getDependencyChain(selectedItemData.id).map(
                        (item, index) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2"
                          >
                            <span className="w-4 text-center">
                              {index + 1}.
                            </span>
                            <span>{item.name}</span>
                            {item.id === selectedItemData.id && (
                              <Badge variant="outline" className="text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a budget item to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
