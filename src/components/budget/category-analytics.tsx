"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  getBudgetItemsForUser,
  getIncomeSourcesForUser,
} from "@/lib/database/client-queries";
import {
  calculateBudgetAllocations,
  calculateBudgetSummary,
  formatCurrency,
} from "@/lib/calculations/budget-calculations";
import { CATEGORY_INFO } from "@/lib/schemas/budget-item";
import type { BudgetItem, IncomeSource } from "@/types/database";

interface CategoryStats {
  category: string;
  itemCount: number;
  totalAllocated: number;
  percentOfIncome: number;
  averageItemValue: number;
  items: BudgetItem[];
}

interface CategoryAnalyticsProps {
  className?: string;
  budgetItems?: BudgetItem[];
  incomeSources?: IncomeSource[];
  isLoading?: boolean;
}

export function CategoryAnalytics({
  className,
  budgetItems: propBudgetItems,
  incomeSources: propIncomeSources,
  isLoading: propIsLoading = false,
}: CategoryAnalyticsProps = {}) {
  const { user } = useAuth();
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(
    propBudgetItems || []
  );
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(
    propIncomeSources || []
  );
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(!propBudgetItems || propIsLoading);

  const calculateStats = useCallback(
    (items: BudgetItem[], sources: IncomeSource[]) => {
      if (items.length > 0 && sources.length > 0) {
        const activeSources = sources.filter((source) => source.is_active);

        if (activeSources.length > 0) {
          const primaryIncomeSource = activeSources[0];
          const allocations = calculateBudgetAllocations(
            items,
            primaryIncomeSource
          );
          const summary = calculateBudgetSummary(
            allocations,
            primaryIncomeSource
          );

          const stats = Object.keys(CATEGORY_INFO)
            .map((category) => {
              const categoryItems = items.filter(
                (item) => item.category === category && item.is_active
              );
              const categoryAllocations = allocations.filter((alloc) =>
                categoryItems.some((item) => item.id === alloc.budgetItemId)
              );
              const totalAllocated = categoryAllocations.reduce(
                (sum, alloc) => sum + alloc.expectedAmount,
                0
              );
              const percentOfIncome =
                summary.netIncome > 0
                  ? (totalAllocated / summary.netIncome) * 100
                  : 0;
              const averageItemValue =
                categoryItems.length > 0
                  ? totalAllocated / categoryItems.length
                  : 0;

              return {
                category,
                itemCount: categoryItems.length,
                totalAllocated,
                percentOfIncome,
                averageItemValue,
                items: categoryItems,
              };
            })
            .filter((stat) => stat.itemCount > 0);

          stats.sort((a, b) => b.totalAllocated - a.totalAllocated);
          setCategoryStats(stats);
        } else {
          setCategoryStats([]);
        }
      } else {
        setCategoryStats([]);
      }
    },
    []
  );

  const loadData = useCallback(async () => {
    // Don't fetch if props are provided
    if (propBudgetItems || !user) return;

    console.log("CategoryAnalytics: Fetching own data (standalone mode)");
    setLoading(true);
    try {
      const [items, sources] = await Promise.all([
        getBudgetItemsForUser(user.id, false), // Only active items
        getIncomeSourcesForUser(user.id),
      ]);
      setBudgetItems(items);
      setIncomeSources(sources);
    } catch (error) {
      console.error("Failed to load category analytics:", error);
      setBudgetItems([]);
      setIncomeSources([]);
    } finally {
      setLoading(false);
    }
  }, [user, propBudgetItems]);

  useEffect(() => {
    if (propBudgetItems && propIncomeSources) {
      // Controlled mode: use props
      setBudgetItems(propBudgetItems);
      setIncomeSources(propIncomeSources);
      setLoading(false);
    } else {
      // Uncontrolled mode: fetch data
      loadData();
    }
  }, [propBudgetItems, propIncomeSources, loadData]);

  useEffect(() => {
    if (!loading) {
      calculateStats(budgetItems, incomeSources);
    }
  }, [budgetItems, incomeSources, loading, calculateStats]);

  useEffect(() => {
    // Update loading state when prop changes
    setLoading(propIsLoading);
  }, [propIsLoading]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Category Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">Loading category analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (categoryStats.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Category Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">
              No budget items found. Add some budget items to see analytics.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalBudgetAmount = categoryStats.reduce(
    (sum, stat) => sum + stat.totalAllocated,
    0
  );
  const maxCategoryAmount = Math.max(
    ...categoryStats.map((stat) => stat.totalAllocated)
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Category Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {categoryStats.length}
            </div>
            <div className="text-sm text-gray-600">Active Categories</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalBudgetAmount)}
            </div>
            <div className="text-sm text-gray-600">Total Allocated</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {budgetItems.filter((item) => item.is_active).length}
            </div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(
                totalBudgetAmount /
                  budgetItems.filter((item) => item.is_active).length || 0
              )}
            </div>
            <div className="text-sm text-gray-600">Avg per Item</div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Category Breakdown</h3>
          {categoryStats.map((stat) => {
            const categoryInfo =
              CATEGORY_INFO[stat.category as keyof typeof CATEGORY_INFO];
            const progressPercentage =
              maxCategoryAmount > 0
                ? (stat.totalAllocated / maxCategoryAmount) * 100
                : 0;

            return (
              <div key={stat.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`${categoryInfo.color} text-xs`}
                    >
                      <span className="mr-1">{categoryInfo.icon}</span>
                      {categoryInfo.label}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {stat.itemCount} item{stat.itemCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(stat.totalAllocated)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {stat.percentOfIncome.toFixed(1)}% of income
                    </div>
                  </div>
                </div>

                {/* Custom progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Avg per item: {formatCurrency(stat.averageItemValue)}
                  </span>
                  <span>
                    {progressPercentage.toFixed(1)}% of largest category
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Category Recommendations */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Insights</h3>
          <div className="space-y-2">
            {/* Largest category insight */}
            {categoryStats.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <span className="font-medium text-blue-800">
                    {
                      CATEGORY_INFO[
                        categoryStats[0].category as keyof typeof CATEGORY_INFO
                      ].label
                    }
                  </span>
                  <span className="text-blue-700">
                    {" "}
                    is your largest category at{" "}
                  </span>
                  <span className="font-medium text-blue-800">
                    {formatCurrency(categoryStats[0].totalAllocated)}
                  </span>
                  <span className="text-blue-700">
                    {" "}
                    ({categoryStats[0].percentOfIncome.toFixed(1)}% of income)
                  </span>
                </div>
              </div>
            )}

            {/* Savings category check */}
            {(() => {
              const savingsCategory = categoryStats.find(
                (stat) => stat.category === "Savings"
              );
              if (!savingsCategory) {
                return (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                    <TrendingDown className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-700">
                      Consider adding savings budget items to build your
                      financial security.
                    </div>
                  </div>
                );
              } else if (savingsCategory.percentOfIncome < 10) {
                return (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-700">
                      Your savings rate is{" "}
                      {savingsCategory.percentOfIncome.toFixed(1)}%. Consider
                      increasing to 10-20% for better financial health.
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-700">
                      Great job! Your savings rate of{" "}
                      {savingsCategory.percentOfIncome.toFixed(1)}% is on track
                      for good financial health.
                    </div>
                  </div>
                );
              }
            })()}

            {/* Category diversity insight */}
            {categoryStats.length < 3 && (
              <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
                <Target className="h-4 w-4 text-purple-600 mt-0.5" />
                <div className="text-sm text-purple-700">
                  Consider diversifying your budget across more categories for
                  better financial planning.
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
