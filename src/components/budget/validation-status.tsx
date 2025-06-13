"use client";

import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Shield,
} from "lucide-react";
import { useBudgetValidation } from "@/hooks/use-budget-validation";
import type { BudgetItem, IncomeSource } from "@/types/database";

interface ValidationStatusProps {
  budgetItems?: BudgetItem[];
  incomeSources?: IncomeSource[];
  className?: string;
}

export function ValidationStatus({
  budgetItems,
  incomeSources,
  className,
}: ValidationStatusProps) {
  const { validationResult, isLoading, errorCount, warningCount } =
    useBudgetValidation({ budgetItems, incomeSources });

  if (isLoading) {
    return (
      <Badge variant="outline" className={className}>
        <Shield className="h-3 w-3 mr-1" />
        Validating...
      </Badge>
    );
  }

  if (!validationResult) {
    return (
      <Badge variant="outline" className={className}>
        <Info className="h-3 w-3 mr-1" />
        No data
      </Badge>
    );
  }

  const getStatusIcon = () => {
    if (errorCount > 0) {
      return <XCircle className="h-3 w-3 mr-1 text-red-500" />;
    }
    if (warningCount > 0) {
      return <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />;
    }
    return <CheckCircle className="h-3 w-3 mr-1 text-green-500" />;
  };

  const getStatusText = () => {
    if (errorCount > 0) {
      return `${errorCount} error${errorCount > 1 ? "s" : ""}`;
    }
    if (warningCount > 0) {
      return `${warningCount} warning${warningCount > 1 ? "s" : ""}`;
    }
    return "Valid";
  };

  const getStatusVariant = ():
    | "default"
    | "secondary"
    | "destructive"
    | "outline" => {
    if (errorCount > 0) return "destructive";
    if (warningCount > 0) return "outline";
    return "default";
  };

  const statusBadge = (
    <Badge variant={getStatusVariant()} className={className}>
      {getStatusIcon()}
      {getStatusText()}
    </Badge>
  );

  // For now, just return the badge without popover details
  // TODO: Add popover when component is available
  return statusBadge;
}
