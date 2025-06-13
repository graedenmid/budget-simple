"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Zap,
  Shield,
  TrendingUp,
  Settings,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  getBudgetItemsForUser,
  getIncomeSourcesForUser,
} from "@/lib/database/client-queries";
import { updateBudgetItem } from "@/lib/database/client-mutations";
import {
  validateBudgetItems,
  generateConflictResolutions,
  applyConflictResolution,
  type ValidationIssue,
  type ValidationResult,
  type ConflictResolution,
} from "@/lib/validation/budget-validation";
import { formatCurrency } from "@/lib/calculations/budget-calculations";
import type { BudgetItem, IncomeSource } from "@/types/database";

interface ValidationDashboardProps {
  budgetItems?: BudgetItem[];
  incomeSources?: IncomeSource[];
  onItemsUpdated?: () => void;
  className?: string;
}

export function ValidationDashboard({
  budgetItems: propBudgetItems,
  incomeSources: propIncomeSources,
  onItemsUpdated,
  className,
}: ValidationDashboardProps) {
  const { user } = useAuth();
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Load data if not provided via props
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setIsLoading(true);

        const [items, sources] = await Promise.all([
          propBudgetItems
            ? Promise.resolve(propBudgetItems)
            : getBudgetItemsForUser(user.id, false),
          propIncomeSources
            ? Promise.resolve(propIncomeSources)
            : getIncomeSourcesForUser(user.id),
        ]);

        setBudgetItems(items);
        setIncomeSources(sources);
      } catch (error) {
        console.error("Failed to load data for validation:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user, propBudgetItems, propIncomeSources]);

  // Run validation when data changes
  useEffect(() => {
    if (budgetItems.length > 0 || incomeSources.length > 0) {
      const result = validateBudgetItems(budgetItems, incomeSources);
      setValidationResult(result);

      const conflictResolutions = generateConflictResolutions(
        result.issues,
        budgetItems
      );
      setResolutions(conflictResolutions);
    }
  }, [budgetItems, incomeSources]);

  // Filter issues by category
  const filteredIssues = useMemo(() => {
    if (!validationResult) return [];

    if (selectedCategory === "all") {
      return validationResult.issues;
    }

    return validationResult.issues.filter(
      (issue) => issue.category === selectedCategory
    );
  }, [validationResult, selectedCategory]);

  // Get issue icon
  const getIssueIcon = (type: ValidationIssue["type"]) => {
    switch (type) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get category icon
  const getCategoryIcon = (category: ValidationIssue["category"]) => {
    switch (category) {
      case "dependency":
        return <Settings className="h-4 w-4" />;
      case "calculation":
        return <TrendingUp className="h-4 w-4" />;
      case "allocation":
        return <Shield className="h-4 w-4" />;
      case "conflict":
        return <AlertTriangle className="h-4 w-4" />;
      case "performance":
        return <Zap className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Apply conflict resolution
  const handleApplyResolution = async (resolution: ConflictResolution) => {
    if (!user) return;

    try {
      setIsApplyingFix(true);

      // Apply the resolution to get updated items
      const updatedItems = applyConflictResolution(resolution, budgetItems);

      // Update each changed item in the database
      for (const change of resolution.changes) {
        const updatedItem = updatedItems.find(
          (item) => item.id === change.itemId
        );
        if (updatedItem) {
          await updateBudgetItem(change.itemId, updatedItem);
        }
      }

      // Refresh data
      setBudgetItems(updatedItems);

      // Notify parent component
      if (onItemsUpdated) {
        onItemsUpdated();
      }
    } catch (error) {
      console.error("Failed to apply resolution:", error);
    } finally {
      setIsApplyingFix(false);
    }
  };

  // Refresh validation
  const handleRefresh = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const [items, sources] = await Promise.all([
        getBudgetItemsForUser(user.id, false),
        getIncomeSourcesForUser(user.id),
      ]);

      setBudgetItems(items);
      setIncomeSources(sources);

      if (onItemsUpdated) {
        onItemsUpdated();
      }
    } catch (error) {
      console.error("Failed to refresh validation data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Budget Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Running validation...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validationResult) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Budget Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No validation data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categories = [
    "all",
    "dependency",
    "calculation",
    "allocation",
    "conflict",
    "performance",
  ];
  const categoryLabels = {
    all: "All Issues",
    dependency: "Dependencies",
    calculation: "Calculations",
    allocation: "Allocations",
    conflict: "Conflicts",
    performance: "Performance",
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Budget Validation
                {validationResult.isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {validationResult.isValid
                  ? "Your budget configuration is valid"
                  : "Issues found that need attention"}
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Summary Stats */}
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {validationResult.summary.errorCount}
              </div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {validationResult.summary.warningCount}
              </div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {validationResult.summary.infoCount}
              </div>
              <div className="text-sm text-gray-600">Info</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(validationResult.summary.totalAllocation)}
              </div>
              <div className="text-sm text-gray-600">Allocated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {validationResult.summary.allocationPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">of Income</div>
            </div>
          </div>

          {/* Allocation Progress */}
          {validationResult.summary.totalAllocation > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Income Allocation</span>
                <span>
                  {validationResult.summary.allocationPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={Math.min(
                  validationResult.summary.allocationPercentage,
                  100
                )}
                className="h-2"
              />
              {validationResult.summary.remainingIncome > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {formatCurrency(validationResult.summary.remainingIncome)}{" "}
                  remaining
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Fix Resolutions */}
      {resolutions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Fixes
            </CardTitle>
            <p className="text-sm text-gray-600">
              Automatically resolve common issues
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resolutions.map((resolution, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-200"
                >
                  <div>
                    <div className="font-medium text-blue-900">
                      {resolution.description}
                    </div>
                    <div className="text-sm text-blue-700">
                      {resolution.changes.length} item(s) will be updated
                    </div>
                  </div>
                  <Button
                    onClick={() => handleApplyResolution(resolution)}
                    disabled={isApplyingFix}
                    size="sm"
                  >
                    {isApplyingFix ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-1" />
                    )}
                    Apply Fix
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Issues</CardTitle>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category)}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                className="text-xs"
              >
                {getCategoryIcon(category as ValidationIssue["category"])}
                <span className="ml-1">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </span>
                {category !== "all" && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {
                      validationResult.issues.filter(
                        (issue) => issue.category === category
                      ).length
                    }
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {filteredIssues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-gray-500">
                {selectedCategory === "all"
                  ? "No validation issues found"
                  : `No ${selectedCategory} issues found`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-md border ${
                    issue.type === "error"
                      ? "border-red-200 bg-red-50"
                      : issue.type === "warning"
                      ? "border-amber-200 bg-amber-50"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getIssueIcon(issue.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{issue.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {issue.category}
                        </Badge>
                        {issue.autoFixable && (
                          <Badge
                            variant="outline"
                            className="text-xs text-green-600 border-green-200"
                          >
                            Auto-fixable
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {issue.message}
                      </p>
                      {issue.suggestedFix && (
                        <p className="text-xs text-gray-600">
                          <strong>Suggested fix:</strong> {issue.suggestedFix}
                        </p>
                      )}
                      {issue.affectedItems.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-600">
                            Affects {issue.affectedItems.length} item(s)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
