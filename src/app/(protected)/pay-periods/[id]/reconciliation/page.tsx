"use client";

import {
  ArrowLeft,
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useReconciliationData } from "@/lib/hooks/use-pay-period-history";
import { VARIANCE_THRESHOLDS } from "@/lib/types/pay-periods";
import Link from "next/link";
import { useParams } from "next/navigation";

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatVariance = (variance: number, percentage: number) => {
  const sign = variance >= 0 ? "+" : "";
  return `${sign}${formatCurrency(variance)} (${sign}${percentage.toFixed(
    1
  )}%)`;
};

const getVarianceColor = (variancePercentage: number) => {
  const abs = Math.abs(variancePercentage);
  if (abs <= VARIANCE_THRESHOLDS.PERFECT) return "text-green-600";
  if (abs <= VARIANCE_THRESHOLDS.MINOR * 100) return "text-yellow-600";
  return "text-red-600";
};

const getVarianceIcon = (variance: number) => {
  if (variance > 0) return <TrendingUp className="h-4 w-4" />;
  if (variance < 0) return <TrendingDown className="h-4 w-4" />;
  return <CheckCircle2 className="h-4 w-4 text-green-600" />;
};

const getReconciliationStatusInfo = (status: string) => {
  switch (status) {
    case "perfect":
      return {
        label: "Perfect Match",
        color: "text-green-600 bg-green-50 border-green-200",
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    case "minor_variance":
      return {
        label: "Minor Variance",
        color: "text-yellow-600 bg-yellow-50 border-yellow-200",
        icon: <AlertCircle className="h-4 w-4" />,
      };
    case "major_variance":
      return {
        label: "Major Variance",
        color: "text-red-600 bg-red-50 border-red-200",
        icon: <AlertCircle className="h-4 w-4" />,
      };
    case "incomplete":
      return {
        label: "Incomplete",
        color: "text-gray-600 bg-gray-50 border-gray-200",
        icon: <AlertCircle className="h-4 w-4" />,
      };
    default:
      return {
        label: "Unknown",
        color: "text-gray-600 bg-gray-50 border-gray-200",
        icon: <AlertCircle className="h-4 w-4" />,
      };
  }
};

export default function ReconciliationPage() {
  const params = useParams();
  const payPeriodId = params.id as string;

  const { reconciliationData, isLoading, error } = useReconciliationData({
    payPeriodId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading reconciliation data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600">Error: {error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reconciliationData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Pay period not found or no reconciliation data available.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getReconciliationStatusInfo(
    reconciliationData.reconciliation_status
  );
  const allocationCompletionRate =
    reconciliationData.allocations.length > 0
      ? (reconciliationData.allocations.filter((a) => a.status === "PAID")
          .length /
          reconciliationData.allocations.length) *
        100
      : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/pay-periods/history">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Reconciliation Analysis
            </h1>
            <p className="text-muted-foreground">
              {formatDate(reconciliationData.start_date)} -{" "}
              {formatDate(reconciliationData.end_date)}
            </p>
          </div>
        </div>

        <div
          className={`px-3 py-1 rounded-full border text-sm font-medium flex items-center space-x-2 ${statusInfo.color}`}
        >
          {statusInfo.icon}
          <span>{statusInfo.label}</span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(reconciliationData.expected_net)}
            </div>
            <p className="text-xs text-muted-foreground">Expected Net Income</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(reconciliationData.actual_net || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Actual Net Income</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div
              className={`text-2xl font-bold flex items-center space-x-2 ${getVarianceColor(
                reconciliationData.net_variance_percentage
              )}`}
            >
              {getVarianceIcon(reconciliationData.net_variance)}
              <span>
                {formatVariance(
                  reconciliationData.net_variance,
                  reconciliationData.net_variance_percentage
                )}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Net Variance</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {allocationCompletionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Allocation Completion
            </p>
            <Progress value={allocationCompletionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Allocation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Allocation Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-lg font-semibold">
                {formatCurrency(reconciliationData.total_expected_allocations)}
              </div>
              <p className="text-sm text-muted-foreground">Total Expected</p>
            </div>

            <div>
              <div className="text-lg font-semibold">
                {formatCurrency(reconciliationData.total_actual_allocations)}
              </div>
              <p className="text-sm text-muted-foreground">Total Actual</p>
            </div>

            <div>
              <div
                className={`text-lg font-semibold flex items-center space-x-2 ${getVarianceColor(
                  reconciliationData.allocation_variance_percentage
                )}`}
              >
                {getVarianceIcon(reconciliationData.allocation_variance)}
                <span>
                  {formatVariance(
                    reconciliationData.allocation_variance,
                    reconciliationData.allocation_variance_percentage
                  )}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Allocation Variance
              </p>
            </div>
          </div>

          {reconciliationData.unallocated_amount !== 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-blue-900">
                  Unallocated Amount:
                </span>
                <span className="text-sm font-bold text-blue-600">
                  {formatCurrency(reconciliationData.unallocated_amount)}
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                This is the difference between actual net income and total
                allocations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Allocation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Allocation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reconciliationData.allocations.map((allocation) => (
              <div
                key={allocation.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Badge
                        variant={
                          allocation.status === "PAID" ? "default" : "secondary"
                        }
                      >
                        {allocation.status}
                      </Badge>
                      <span className="font-medium">
                        {allocation.budget_item_name}
                      </span>
                      <Badge variant="outline">
                        {allocation.budget_item_category}
                      </Badge>
                    </div>

                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Expected:{" "}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(allocation.expected_amount)}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground">Actual: </span>
                        <span className="font-medium">
                          {formatCurrency(allocation.actual_amount || 0)}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground">
                          Variance:{" "}
                        </span>
                        <span
                          className={`font-medium ${getVarianceColor(
                            allocation.variance_percentage
                          )}`}
                        >
                          {formatVariance(
                            allocation.variance,
                            allocation.variance_percentage
                          )}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        {getVarianceIcon(allocation.variance)}
                        <span
                          className={`text-sm font-medium ${getVarianceColor(
                            allocation.variance_percentage
                          )}`}
                        >
                          {Math.abs(allocation.variance_percentage).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
