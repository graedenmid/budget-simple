"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  DollarSign,
  Receipt,
} from "lucide-react";
import { usePayPeriodBudgetTracking } from "@/lib/hooks/use-budget-tracking";
import { formatCurrency } from "@/lib/calculations/budget-calculations";
import { CATEGORY_INFO } from "@/lib/schemas/budget-item";

interface BudgetVarianceSummaryProps {
  payPeriodId: string | null;
  showDetails?: boolean;
}

export function BudgetVarianceSummary({
  payPeriodId,
  showDetails = true,
}: BudgetVarianceSummaryProps) {
  const { trackingData, loading, error } =
    usePayPeriodBudgetTracking(payPeriodId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-4">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load budget analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!trackingData || trackingData.budget_items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-4">
            <Target className="h-8 w-8 mx-auto mb-2" />
            <p>No budget tracking data available</p>
            <p className="text-sm text-gray-400 mt-1">
              Link expenses to budget items to see spending analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    budget_items,
    total_expected,
    total_actual_expenses,
    total_remaining,
  } = trackingData;

  // Calculate summary statistics
  const overBudgetItems = budget_items.filter(
    (item) => item.status === "over_budget"
  );
  const onBudgetItems = budget_items.filter(
    (item) => item.status === "on_budget"
  );
  const underBudgetItems = budget_items.filter(
    (item) => item.status === "under_budget"
  );
  const totalExpenseCount = budget_items.reduce(
    (sum, item) => sum + item.expense_count,
    0
  );

  const overBudgetAmount = overBudgetItems.reduce(
    (sum, item) => sum + Math.abs(item.variance_amount),
    0
  );
  const underBudgetAmount = underBudgetItems.reduce(
    (sum, item) => sum + Math.abs(item.variance_amount),
    0
  );

  // Group by category for detailed view
  const categoryGroups = budget_items.reduce((groups, item) => {
    const category = item.budget_item_category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, typeof budget_items>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Budget vs Actual Analysis</span>
          <Badge variant="outline">
            {totalExpenseCount} linked expense
            {totalExpenseCount !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Budget</p>
              <p className="text-lg font-semibold">
                {formatCurrency(total_expected)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Receipt className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-lg font-semibold">
                {formatCurrency(total_actual_expenses)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${
                total_remaining >= 0 ? "bg-amber-100" : "bg-red-100"
              }`}
            >
              {total_remaining >= 0 ? (
                <TrendingDown className="h-5 w-5 text-amber-600" />
              ) : (
                <TrendingUp className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {total_remaining >= 0 ? "Remaining" : "Over Budget"}
              </p>
              <p
                className={`text-lg font-semibold ${
                  total_remaining >= 0 ? "text-amber-600" : "text-red-600"
                }`}
              >
                {formatCurrency(Math.abs(total_remaining))}
              </p>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Over Budget</p>
            <p className="text-lg font-semibold">
              {overBudgetItems.length} items
            </p>
            {overBudgetAmount > 0 && (
              <p className="text-sm text-red-600">
                +{formatCurrency(overBudgetAmount)}
              </p>
            )}
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">On Budget</p>
            <p className="text-lg font-semibold">
              {onBudgetItems.length} items
            </p>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Under Budget</p>
            <p className="text-lg font-semibold">
              {underBudgetItems.length} items
            </p>
            {underBudgetAmount > 0 && (
              <p className="text-sm text-blue-600">
                -{formatCurrency(underBudgetAmount)}
              </p>
            )}
          </div>
        </div>

        {/* Detailed Breakdown by Category */}
        {showDetails && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Spending by Category</h4>
            {Object.entries(categoryGroups).map(([category, items]) => {
              const categoryExpected = items.reduce(
                (sum, item) => sum + item.expected_amount,
                0
              );
              const categoryActual = items.reduce(
                (sum, item) => sum + item.actual_amount,
                0
              );
              const categoryProgress =
                categoryExpected > 0
                  ? (categoryActual / categoryExpected) * 100
                  : 0;
              const categoryInfo =
                CATEGORY_INFO[category as keyof typeof CATEGORY_INFO];

              return (
                <div key={category} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {categoryInfo?.icon || "📊"}
                      </span>
                      <span className="font-medium">
                        {categoryInfo?.label || category}
                      </span>
                      <Badge variant="outline">{items.length} items</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(categoryActual)} /{" "}
                        {formatCurrency(categoryExpected)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {categoryProgress.toFixed(1)}% spent
                      </p>
                    </div>
                  </div>

                  <Progress
                    value={Math.min(categoryProgress, 100)}
                    className="h-2 mb-3"
                  />

                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.budget_item_id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {item.budget_item_name}
                          </span>
                          {item.status === "over_budget" && (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          )}
                          {item.status === "on_budget" && (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          )}
                          {item.status === "under_budget" && (
                            <Clock className="h-3 w-3 text-blue-500" />
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-medium">
                            {formatCurrency(item.actual_amount)} /{" "}
                            {formatCurrency(item.expected_amount)}
                          </span>
                          {item.expense_count > 0 && (
                            <span className="text-gray-500 ml-2">
                              ({item.expense_count} expense
                              {item.expense_count !== 1 ? "s" : ""})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
