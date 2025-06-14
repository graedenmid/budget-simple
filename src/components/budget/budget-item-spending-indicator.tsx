"use client";

import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/calculations/budget-calculations";
import type { BudgetItemSpending } from "@/lib/services/budget-tracking-service";

interface BudgetItemSpendingIndicatorProps {
  spending: BudgetItemSpending;
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
}

export function BudgetItemSpendingIndicator({
  spending,
  showDetails = false,
  size = "md",
}: BudgetItemSpendingIndicatorProps) {
  const {
    expected_amount,
    actual_amount,
    remaining_amount,
    variance_percentage,
    expense_count,
    status,
  } = spending;

  // Calculate progress percentage (capped at 100% for display)
  const progressPercentage =
    expected_amount > 0
      ? Math.min((actual_amount / expected_amount) * 100, 100)
      : 0;

  // Get status styling
  const getStatusConfig = () => {
    switch (status) {
      case "over_budget":
        return {
          icon: AlertTriangle,
          color: "bg-red-100 text-red-800 border-red-200",
          progressColor: "bg-red-500",
          label: "Over Budget",
        };
      case "on_budget":
        return {
          icon: CheckCircle,
          color: "bg-green-100 text-green-800 border-green-200",
          progressColor: "bg-green-500",
          label: "On Budget",
        };
      case "under_budget":
        return {
          icon: Clock,
          color: "bg-blue-100 text-blue-800 border-blue-200",
          progressColor: "bg-blue-500",
          label: "Under Budget",
        };
      default:
        return {
          icon: Target,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          progressColor: "bg-gray-500",
          label: "No Data",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  // Size configurations
  const sizeConfig = {
    sm: {
      iconSize: "h-3 w-3",
      textSize: "text-xs",
      badgeSize: "text-xs",
      progressHeight: "h-1",
    },
    md: {
      iconSize: "h-4 w-4",
      textSize: "text-sm",
      badgeSize: "text-sm",
      progressHeight: "h-2",
    },
    lg: {
      iconSize: "h-5 w-5",
      textSize: "text-base",
      badgeSize: "text-base",
      progressHeight: "h-3",
    },
  };

  const config = sizeConfig[size];

  if (!showDetails) {
    // Compact view - just status badge
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`${statusConfig.color} ${config.badgeSize}`}
        >
          <StatusIcon className={`${config.iconSize} mr-1`} />
          {statusConfig.label}
        </Badge>
        {expense_count > 0 && (
          <span className={`${config.textSize} text-gray-500`}>
            {expense_count} expense{expense_count !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }

  // Detailed view
  return (
    <div className="space-y-3">
      {/* Status and amounts */}
      <div className="flex items-center justify-between">
        <Badge
          variant="outline"
          className={`${statusConfig.color} ${config.badgeSize}`}
        >
          <StatusIcon className={`${config.iconSize} mr-1`} />
          {statusConfig.label}
        </Badge>
        <div className={`${config.textSize} font-medium`}>
          {formatCurrency(actual_amount)} / {formatCurrency(expected_amount)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div
          className={`w-full bg-gray-200 rounded-full ${config.progressHeight}`}
        >
          <div
            className={`${statusConfig.progressColor} ${config.progressHeight} rounded-full transition-all duration-300`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className={`${config.textSize} text-gray-600`}>
            {progressPercentage.toFixed(1)}% spent
          </span>
          <span className={`${config.textSize} text-gray-600`}>
            {expense_count} expense{expense_count !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Variance info */}
      {variance_percentage !== 0 && (
        <div className="flex items-center gap-2">
          {variance_percentage > 0 ? (
            <TrendingUp className={`${config.iconSize} text-red-500`} />
          ) : (
            <TrendingDown className={`${config.iconSize} text-green-500`} />
          )}
          <span className={`${config.textSize} font-medium`}>
            {variance_percentage > 0 ? "+" : ""}
            {variance_percentage.toFixed(1)}% variance
          </span>
          <span className={`${config.textSize} text-gray-600`}>
            ({variance_percentage > 0 ? "+" : ""}
            {formatCurrency(Math.abs(remaining_amount))})
          </span>
        </div>
      )}

      {/* Remaining amount */}
      <div className="flex items-center justify-between">
        <span className={`${config.textSize} text-gray-600`}>Remaining:</span>
        <span
          className={`${config.textSize} font-medium ${
            remaining_amount >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {formatCurrency(remaining_amount)}
        </span>
      </div>
    </div>
  );
}

// Quick status indicator for use in lists
export function QuickSpendingStatus({
  spending,
  showAmount = false,
}: {
  spending: BudgetItemSpending;
  showAmount?: boolean;
}) {
  const { status, actual_amount, expected_amount } = spending;

  const getStatusIcon = () => {
    switch (status) {
      case "over_budget":
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case "on_budget":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "under_budget":
        return <Clock className="h-3 w-3 text-blue-500" />;
      default:
        return <Target className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <div className="flex items-center gap-1">
      {getStatusIcon()}
      {showAmount && (
        <span className="text-xs text-gray-600">
          {formatCurrency(actual_amount)}/{formatCurrency(expected_amount)}
        </span>
      )}
    </div>
  );
}
