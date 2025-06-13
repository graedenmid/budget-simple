"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePayPeriodHistory } from "@/lib/hooks/use-pay-period-history";
import Link from "next/link";

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatVariance = (variance: number, showSign = true) => {
  const sign = variance >= 0 ? "+" : "";
  return `${showSign ? sign : ""}${formatCurrency(variance)}`;
};

const getVarianceColor = (variancePercentage: number) => {
  const abs = Math.abs(variancePercentage);
  if (abs <= 2) return "text-green-600 bg-green-50 border-green-200";
  if (abs <= 10) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-red-600 bg-red-50 border-red-200";
};

const getVarianceIcon = (variance: number) => {
  if (variance > 0) return <TrendingUp className="h-4 w-4" />;
  if (variance < 0) return <TrendingDown className="h-4 w-4" />;
  return null;
};

export default function PayPeriodHistoryPage() {
  const [sortBy, setSortBy] = useState<"date" | "variance" | "completion">(
    "date"
  );
  const [dateRange, setDateRange] = useState<
    "last_3_months" | "last_6_months" | "last_year" | "all_time"
  >("last_6_months");

  const { historyData, isLoading, error, updateFilters } = usePayPeriodHistory({
    initialFilters: {
      completed_only: true,
      sort_by: sortBy,
      sort_order: "desc",
      date_range: dateRange,
      limit: 50,
    },
  });

  const handleSortChange = (newSort: "date" | "variance" | "completion") => {
    setSortBy(newSort);
    updateFilters({ sort_by: newSort });
  };

  const handleDateRangeChange = (
    newRange: "last_3_months" | "last_6_months" | "last_year" | "all_time"
  ) => {
    setDateRange(newRange);
    updateFilters({ date_range: newRange });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/pay-periods">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pay Periods
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Pay Period History
            </h1>
            <p className="text-muted-foreground">
              Review past pay periods and variance analysis
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Sorting</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Date Range
              </label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="all_time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="variance">Variance</SelectItem>
                  <SelectItem value="completion">Completion %</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {historyData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {formatCurrency(historyData.summary.total_expected)}
              </div>
              <p className="text-xs text-muted-foreground">Total Expected</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {formatCurrency(historyData.summary.total_actual)}
              </div>
              <p className="text-xs text-muted-foreground">Total Actual</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div
                className={`text-2xl font-bold ${
                  historyData.summary.total_variance >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatVariance(historyData.summary.total_variance)}
              </div>
              <p className="text-xs text-muted-foreground">Total Variance</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {historyData.summary.average_completion_rate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Avg Completion</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Loading pay period history...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600">Error loading history: {error}</div>
          </CardContent>
        </Card>
      )}

      {/* History List */}
      {historyData?.data && historyData.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Pay Period History ({historyData.total} periods)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historyData.data.map((period) => (
                <Link
                  key={period.id}
                  href={`/pay-periods/${period.id}/reconciliation`}
                  className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Period Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant={
                            period.status === "COMPLETED"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {period.status}
                        </Badge>
                        <span className="font-medium">
                          {formatDate(period.start_date)} -{" "}
                          {formatDate(period.end_date)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({period.income_source_name})
                        </span>
                      </div>

                      <div className="mt-2 flex items-center space-x-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Expected:{" "}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(period.expected_net)}
                          </span>
                        </div>

                        {period.actual_net && (
                          <div>
                            <span className="text-muted-foreground">
                              Actual:{" "}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(period.actual_net)}
                            </span>
                          </div>
                        )}

                        <div>
                          <span className="text-muted-foreground">
                            Completion:{" "}
                          </span>
                          <span className="font-medium">
                            {period.completion_percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Variance Info */}
                    <div className="flex items-center space-x-4">
                      {period.variance_amount !== 0 && (
                        <div
                          className={`px-3 py-1 rounded-full border text-sm font-medium flex items-center space-x-1 ${getVarianceColor(
                            period.variance_percentage
                          )}`}
                        >
                          {getVarianceIcon(period.variance_amount)}
                          <span>{formatVariance(period.variance_amount)}</span>
                          <span>
                            ({period.variance_percentage.toFixed(1)}%)
                          </span>
                        </div>
                      )}

                      {period.variance_amount === 0 && (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-200"
                        >
                          Perfect Match
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {historyData?.data && historyData.data.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No pay period history found for the selected filters.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
