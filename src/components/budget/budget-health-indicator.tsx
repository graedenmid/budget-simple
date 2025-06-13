"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, AlertCircle, XCircle } from "lucide-react";
import type { BudgetHealth } from "@/lib/services/budget-balance-service";

interface BudgetHealthBadgeProps {
  health: BudgetHealth;
  variant?: "full" | "compact";
}

export function BudgetHealthBadge({
  health,
  variant = "compact",
}: BudgetHealthBadgeProps) {
  const getHealthConfig = (status: BudgetHealth["status"]) => {
    switch (status) {
      case "excellent":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle,
          label: "Excellent",
        };
      case "good":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: CheckCircle,
          label: "Good",
        };
      case "warning":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: AlertTriangle,
          label: "Warning",
        };
      case "danger":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          icon: XCircle,
          label: "Danger",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: AlertCircle,
          label: "Unknown",
        };
    }
  };

  const config = getHealthConfig(health.status);
  const Icon = config.icon;

  if (variant === "compact") {
    return (
      <Badge variant="outline" className={`${config.color} text-xs`}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label} ({health.score})
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${config.color}`}>
        <Icon className="mr-1 h-4 w-4" />
        {config.label}
      </Badge>
      <span className="text-sm font-medium">Score: {health.score}/100</span>
    </div>
  );
}

interface BudgetHealthIconProps {
  health: BudgetHealth;
  size?: "sm" | "md" | "lg";
}

export function BudgetHealthIcon({
  health,
  size = "md",
}: BudgetHealthIconProps) {
  const getHealthConfig = (status: BudgetHealth["status"]) => {
    switch (status) {
      case "excellent":
        return { color: "text-green-600", icon: CheckCircle };
      case "good":
        return { color: "text-blue-600", icon: CheckCircle };
      case "warning":
        return { color: "text-yellow-600", icon: AlertTriangle };
      case "danger":
        return { color: "text-red-600", icon: XCircle };
      default:
        return { color: "text-gray-600", icon: AlertCircle };
    }
  };

  const config = getHealthConfig(health.status);
  const Icon = config.icon;

  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }[size];

  return <Icon className={`${config.color} ${sizeClass}`} />;
}

interface BudgetHealthDashboardProps {
  health: BudgetHealth;
}

export function BudgetHealthDashboard({ health }: BudgetHealthDashboardProps) {
  const getHealthConfig = (status: BudgetHealth["status"]) => {
    switch (status) {
      case "excellent":
        return {
          color: "border-green-200 bg-green-50",
          titleColor: "text-green-800",
          icon: CheckCircle,
          iconColor: "text-green-600",
        };
      case "good":
        return {
          color: "border-blue-200 bg-blue-50",
          titleColor: "text-blue-800",
          icon: CheckCircle,
          iconColor: "text-blue-600",
        };
      case "warning":
        return {
          color: "border-yellow-200 bg-yellow-50",
          titleColor: "text-yellow-800",
          icon: AlertTriangle,
          iconColor: "text-yellow-600",
        };
      case "danger":
        return {
          color: "border-red-200 bg-red-50",
          titleColor: "text-red-800",
          icon: XCircle,
          iconColor: "text-red-600",
        };
      default:
        return {
          color: "border-gray-200 bg-gray-50",
          titleColor: "text-gray-800",
          icon: AlertCircle,
          iconColor: "text-gray-600",
        };
    }
  };

  const config = getHealthConfig(health.status);
  const Icon = config.icon;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Card className={`${config.color}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 ${config.titleColor}`}>
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
          Budget Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Score</span>
          <span className={`text-2xl font-bold ${config.titleColor}`}>
            {health.score}/100
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Allocation Rate</span>
            <span className="text-sm font-medium">
              {health.indicators.allocation_ratio.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Spending Rate</span>
            <span className="text-sm font-medium">
              {health.indicators.spending_ratio.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Cash Buffer</span>
            <span
              className={`text-sm font-medium ${
                health.indicators.cash_buffer >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(health.indicators.cash_buffer)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
