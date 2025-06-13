"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AllocationItem } from "./allocation-item";
import { useAllocationsForPayPeriod } from "@/lib/hooks/use-allocations";
import { PayPeriod } from "@/lib/types/pay-periods";
import { AllocationWithDetails } from "@/lib/types/allocations";

interface AllocationListProps {
  payPeriod: PayPeriod | null;
  onAllocationUpdate?: () => void;
}

export function AllocationList({
  payPeriod,
  onAllocationUpdate,
}: AllocationListProps) {
  const { allocations, loading, error, refetch } = useAllocationsForPayPeriod(
    payPeriod?.id || null
  );

  // Determine if allocations should be disabled (pay period is completed)
  const isDisabled = payPeriod?.status === "COMPLETED";

  const [summary, setSummary] = useState({
    totalExpected: 0,
    totalActual: 0,
    totalRemaining: 0,
    paidCount: 0,
    unpaidCount: 0,
    completionPercentage: 0,
  });

  // Calculate summary statistics
  useEffect(() => {
    if (!allocations.length) {
      setSummary({
        totalExpected: 0,
        totalActual: 0,
        totalRemaining: 0,
        paidCount: 0,
        unpaidCount: 0,
        completionPercentage: 0,
      });
      return;
    }

    const stats = allocations.reduce(
      (acc, allocation) => {
        acc.totalExpected += allocation.expected_amount;
        acc.totalActual += allocation.actual_amount || 0;

        if (allocation.status === "PAID") {
          acc.paidCount++;
        } else {
          acc.unpaidCount++;
        }

        return acc;
      },
      { totalExpected: 0, totalActual: 0, paidCount: 0, unpaidCount: 0 }
    );

    const totalRemaining = stats.totalExpected - stats.totalActual;
    const completionPercentage =
      stats.totalExpected > 0
        ? Math.round((stats.totalActual / stats.totalExpected) * 100)
        : 0;

    setSummary({
      ...stats,
      totalRemaining,
      completionPercentage,
    });
  }, [allocations]);

  const handleAllocationUpdate = () => {
    refetch();
    onAllocationUpdate?.();
  };

  const groupedAllocations = allocations.reduce((groups, allocation) => {
    const category = allocation.budget_item?.category || "Other";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(allocation);
    return groups;
  }, {} as Record<string, AllocationWithDetails[]>);

  if (!payPeriod) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Pay Period Selected</h3>
          <p>Please select a pay period to view your budget allocations.</p>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium">Failed to load allocations</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-3"
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (allocations.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Budget Allocations</h3>
          <p>No budget items have been allocated for this pay period.</p>
          <p className="text-sm mt-2">
            Budget items will be automatically allocated when you have active
            budget items configured.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Budget Overview</span>
            <Badge variant="outline">
              {summary.paidCount} of {allocations.length} items paid
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{summary.completionPercentage}% complete</span>
            </div>
            <Progress value={summary.completionPercentage} className="h-2" />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected Total</p>
                <p className="text-lg font-semibold">
                  ${summary.totalExpected.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Actual Total</p>
                <p className="text-lg font-semibold">
                  ${summary.totalActual.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-lg ${
                  summary.totalRemaining >= 0 ? "bg-amber-100" : "bg-red-100"
                }`}
              >
                <TrendingDown
                  className={`h-5 w-5 ${
                    summary.totalRemaining >= 0
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p
                  className={`text-lg font-semibold ${
                    summary.totalRemaining >= 0
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                >
                  ${Math.abs(summary.totalRemaining).toFixed(2)}
                  {summary.totalRemaining < 0 && " over"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Allocations */}
      <div className="space-y-6">
        {Object.entries(groupedAllocations).map(
          ([category, categoryAllocations]) => (
            <Card key={category}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">{category}</span>
                  <Badge variant="secondary">
                    {
                      categoryAllocations.filter((a) => a.status === "PAID")
                        .length
                    }{" "}
                    of {categoryAllocations.length} paid
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryAllocations.map((allocation, index) => (
                  <div key={allocation.id}>
                    <AllocationItem
                      allocation={allocation}
                      onUpdate={handleAllocationUpdate}
                      disabled={isDisabled}
                    />
                    {index < categoryAllocations.length - 1 && (
                      <Separator className="my-3" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
