import React from "react";
import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Tag,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  ExpenseCreateData,
  ExpenseWithDetails,
} from "@/lib/types/expenses";
import { formatCurrency } from "@/lib/utils/currency";

interface DuplicateWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAnyway: () => void;
  onCancel: () => void;
  currentExpense: ExpenseCreateData;
  duplicateExpense: ExpenseWithDetails;
  loading?: boolean;
}

export function DuplicateWarningDialog({
  isOpen,
  onClose,
  onSaveAnyway,
  onCancel,
  currentExpense,
  duplicateExpense,
  loading = false,
}: DuplicateWarningDialogProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getSimilarityIndicator = () => {
    let matchCount = 0;
    const totalChecks = 4;

    // Check amount match
    if (Math.abs(currentExpense.amount - duplicateExpense.amount) < 0.01) {
      matchCount++;
    }

    // Check date match (within 1 day)
    const currentDate = new Date(currentExpense.date);
    const duplicateDate = new Date(duplicateExpense.date);
    const daysDiff = Math.abs(
      (currentDate.getTime() - duplicateDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff <= 1) {
      matchCount++;
    }

    // Check category match
    if (currentExpense.category === duplicateExpense.category) {
      matchCount++;
    }

    // Check description similarity (simple word overlap)
    const currentWords = currentExpense.description.toLowerCase().split(" ");
    const duplicateWords = duplicateExpense.description
      .toLowerCase()
      .split(" ");
    const commonWords = currentWords.filter((word) =>
      duplicateWords.includes(word)
    );
    const similarity =
      commonWords.length / Math.max(currentWords.length, duplicateWords.length);
    if (similarity >= 0.5) {
      matchCount++;
    }

    return {
      matchCount,
      totalChecks,
      percentage: (matchCount / totalChecks) * 100,
    };
  };

  const similarity = getSimilarityIndicator();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Potential Duplicate Expense Detected</DialogTitle>
          </div>
          <DialogDescription>
            We found a similar expense that you&apos;ve already recorded. Please
            review the details below and decide how to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Similarity Score */}
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Similarity Score
              </span>
            </div>
            <Badge
              variant={
                similarity.percentage >= 75
                  ? "destructive"
                  : similarity.percentage >= 50
                  ? "default"
                  : "secondary"
              }
            >
              {similarity.matchCount}/{similarity.totalChecks} matches (
              {Math.round(similarity.percentage)}%)
            </Badge>
          </div>

          {/* Expense Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Expense */}
            <Card className="border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <h4 className="font-medium text-blue-900">New Expense</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {formatCurrency(currentExpense.amount)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{formatDate(currentExpense.date)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span>{currentExpense.category}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span className="text-sm">
                      {currentExpense.description}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Existing Expense */}
            <Card className="border-amber-200">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <h4 className="font-medium text-amber-900">
                    Existing Expense
                  </h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">
                      {formatCurrency(duplicateExpense.amount)}
                    </span>
                    {Math.abs(currentExpense.amount - duplicateExpense.amount) <
                      0.01 && (
                      <Badge variant="outline" className="text-xs">
                        Exact match
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{formatDate(duplicateExpense.date)}</span>
                    {(() => {
                      const daysDiff = Math.abs(
                        (new Date(currentExpense.date).getTime() -
                          new Date(duplicateExpense.date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      );
                      if (daysDiff <= 1) {
                        return (
                          <Badge variant="outline" className="text-xs">
                            Same day
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span>{duplicateExpense.category}</span>
                    {currentExpense.category === duplicateExpense.category && (
                      <Badge variant="outline" className="text-xs">
                        Same category
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span className="text-sm">
                      {duplicateExpense.description}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Additional Information */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">What you can do:</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                • <strong>Cancel:</strong> Go back and modify the expense
                details
              </li>
              <li>
                • <strong>Save Anyway:</strong> Create this expense even though
                it appears similar
              </li>
              <li>
                • This might be a legitimate separate expense (e.g., multiple
                coffee purchases)
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel & Edit
          </Button>
          <Button
            onClick={onSaveAnyway}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {loading ? "Saving..." : "Save Anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DuplicateWarningDialog;
