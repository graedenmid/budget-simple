"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingDown, Wallet, PieChart } from "lucide-react";
import {
  BudgetHealthBadge,
  BudgetHealthDashboard,
} from "./budget-health-indicator";
import { useBudgetBalanceSummary } from "@/lib/hooks/use-budget-balance";

interface BudgetBalanceDashboardProps {
  payPeriodId: string;
  compact?: boolean;
}

export function BudgetBalanceDashboard({
  payPeriodId,
  compact = false,
}: BudgetBalanceDashboardProps) {
  const { summary, loading, error } = useBudgetBalanceSummary(payPeriodId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p className="text-sm">
              {error || "Unable to load budget balance"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { balance, health, category_breakdown } = summary;

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Budget Balance</span>
            <BudgetHealthBadge health={health} variant="compact" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Available Cash</p>
              <p
                className={`text-xl font-bold ${
                  balance.available_cash >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(balance.available_cash)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Utilization</p>
              <p className="text-xl font-bold text-blue-600">
                {balance.utilization_percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Health Overview */}
      <BudgetHealthDashboard health={health} />

      {/* Balance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Balance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Income</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(balance.income_amount)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Allocated</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(balance.total_allocated)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-lg ${
                  balance.available_cash >= 0 ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <Wallet
                  className={`h-5 w-5 ${
                    balance.available_cash >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <p
                  className={`text-lg font-semibold ${
                    balance.available_cash >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(Math.abs(balance.available_cash))}
                  {balance.available_cash < 0 && " short"}
                </p>
              </div>
            </div>
          </div>

          {/* Utilization Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Budget Utilization</span>
              <span className="text-sm text-gray-600">
                {balance.utilization_percentage.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={Math.min(balance.utilization_percentage, 100)}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {Object.keys(category_breakdown).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(category_breakdown).map(([category, data]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {category}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {data.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(data.allocated)}
                    </span>
                  </div>
                  <Progress
                    value={(data.allocated / balance.total_allocated) * 100}
                    className="h-1"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
