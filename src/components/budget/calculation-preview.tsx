"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getIncomeSourcesForUser } from "@/lib/database/client-queries";
import {
  getCalculationPreview,
  formatCurrency,
  validateBudgetItemValue,
} from "@/lib/calculations/budget-calculations";
import type { BudgetItem, IncomeSource } from "@/types/database";

interface CalculationPreviewProps {
  budgetItem: Partial<BudgetItem>;
  className?: string;
}

export function CalculationPreview({
  budgetItem,
  className,
}: CalculationPreviewProps) {
  const { user } = useAuth();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIncomeSources = async () => {
      if (!user) return;

      try {
        const sources = await getIncomeSourcesForUser(user.id);
        setIncomeSources(sources.filter((source) => source.is_active));
      } catch (error) {
        console.error("Failed to load income sources:", error);
      } finally {
        setLoading(false);
      }
    };

    loadIncomeSources();
  }, [user]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Calculator className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading calculation preview...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (incomeSources.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              No active income sources found. Add an income source to see
              calculations.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isValidValue =
    budgetItem.calc_type && budgetItem.value !== undefined
      ? validateBudgetItemValue(budgetItem.calc_type, budgetItem.value)
      : false;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Calculation Preview
          {isValidValue ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {incomeSources.map((incomeSource) => {
          const preview = getCalculationPreview(budgetItem, incomeSource);

          return (
            <div key={incomeSource.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{incomeSource.name}</span>
                <Badge variant="outline" className="text-xs">
                  {incomeSource.cadence.replace("-", " ")}
                </Badge>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-600 mb-1">
                  Gross: {formatCurrency(incomeSource.gross_amount)} | Net:{" "}
                  {formatCurrency(incomeSource.net_amount)}
                </div>
                <div className="font-mono text-sm font-semibold text-blue-600">
                  {preview}
                </div>
              </div>

              {budgetItem.calc_type === "REMAINING_PERCENT" &&
                budgetItem.depends_on &&
                budgetItem.depends_on.length > 0 && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    This calculation depends on {
                      budgetItem.depends_on.length
                    }{" "}
                    other budget item(s). The actual amount will be calculated
                    after those items are processed.
                  </div>
                )}
            </div>
          );
        })}

        {!isValidValue &&
          budgetItem.calc_type &&
          budgetItem.value !== undefined && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              {budgetItem.calc_type === "FIXED"
                ? "Amount must be greater than 0"
                : "Percentage must be between 0.01% and 100%"}
            </div>
          )}

        {budgetItem.calc_type && budgetItem.value === undefined && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            Enter a value to see calculation results
          </div>
        )}
      </CardContent>
    </Card>
  );
}
