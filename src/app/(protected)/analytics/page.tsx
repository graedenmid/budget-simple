"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, PieChart, BarChart, Calendar } from "lucide-react";
import { SpendingTrendsChart } from "@/components/analytics/spending-trends-chart";
import { CategoryBreakdownChart } from "@/components/analytics/category-breakdown-chart";
import {
  useSpendingTrends,
  useCategoryAnalytics,
} from "@/lib/hooks/useExpenseAnalytics";

export default function AnalyticsPage() {
  // Get spending trends data for the last 30 days
  const {
    trends,
    loading: trendsLoading,
    error: trendsError,
  } = useSpendingTrends({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    groupBy: "day",
  });

  // Get category breakdown data for the last 30 days
  const {
    categoryBreakdown,
    loading: categoryLoading,
    error: categoryError,
  } = useCategoryAnalytics({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Analytics</h1>
          <p className="text-gray-600">
            Analyze your spending patterns and trends
          </p>
        </div>
        <Badge variant="secondary">Beta</Badge>
      </div>

      {/* Placeholder Cards for Analytics Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Spending Trends
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Track spending over time with interactive charts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Category Breakdown
            </CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Visual breakdown of spending by category
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Budget vs Actual
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Compare budgeted vs actual spending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Reports
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Monthly and yearly expense summaries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trends Chart */}
        <div className="lg:col-span-2">
          <SpendingTrendsChart
            data={trends}
            loading={trendsLoading}
            error={trendsError}
          />
        </div>

        {/* Category Breakdown Chart */}
        <CategoryBreakdownChart
          data={categoryBreakdown}
          loading={categoryLoading}
          error={categoryError}
        />

        {/* Placeholder for Budget vs Actual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Budget vs Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <BarChart className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Coming Soon
                  </h3>
                  <p className="text-gray-600">Budget comparison chart</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
