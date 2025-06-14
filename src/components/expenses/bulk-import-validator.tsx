import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Upload,
  FileText,
  Calendar,
  DollarSign,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBulkDuplicateDetection } from "@/lib/hooks/use-duplicate-detection";
import { useExpenseOperations } from "@/lib/hooks/use-expenses";
import type {
  ExpenseCreateData,
  DuplicateDetectionOptions,
} from "@/lib/types/expenses";
import { formatCurrency } from "@/lib/utils/currency";

interface BulkImportValidatorProps {
  expenses: ExpenseCreateData[];
  onSuccess: (importedCount: number) => void;
  onCancel: () => void;
  duplicateDetectionOptions?: DuplicateDetectionOptions;
}

interface ExpenseImportItem {
  expense: ExpenseCreateData;
  index: number;
  selected: boolean;
  isDuplicate: boolean;
  duplicateExpenseId?: string;
  errors: string[];
  warnings: string[];
}

export function BulkImportValidator({
  expenses,
  onSuccess,
  onCancel,
  duplicateDetectionOptions = {},
}: BulkImportValidatorProps) {
  const [importItems, setImportItems] = useState<ExpenseImportItem[]>([]);
  const [validationComplete, setValidationComplete] = useState(false);
  const [importing, setImporting] = useState(false);

  const {
    checkBulkDuplicates,
    loading: validationLoading,
    error: validationError,
  } = useBulkDuplicateDetection();

  const { createExpense } = useExpenseOperations();

  const handleValidation = React.useCallback(async () => {
    try {
      const results = await checkBulkDuplicates(
        expenses,
        duplicateDetectionOptions
      );

      const items: ExpenseImportItem[] = results.map((result, index) => ({
        expense: result.expense,
        index,
        selected: !result.validation.is_duplicate, // Auto-select non-duplicates
        isDuplicate: result.validation.is_duplicate || false,
        duplicateExpenseId: result.validation.duplicate_expense_id,
        errors: result.validation.errors,
        warnings: result.validation.warnings,
      }));

      setImportItems(items);
      setValidationComplete(true);
    } catch (error) {
      console.error("Bulk validation failed:", error);
    }
  }, [checkBulkDuplicates, expenses, duplicateDetectionOptions]);

  // Run validation when component mounts or expenses change
  React.useEffect(() => {
    if (expenses.length > 0 && !validationComplete) {
      handleValidation();
    }
  }, [expenses, validationComplete, handleValidation]);

  const handleToggleSelection = (index: number) => {
    setImportItems((prev) =>
      prev.map((item) =>
        item.index === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleSelectAll = () => {
    const allSelected = importItems.every((item) => item.selected);
    setImportItems((prev) =>
      prev.map((item) => ({ ...item, selected: !allSelected }))
    );
  };

  const handleSelectNonDuplicates = () => {
    setImportItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: !item.isDuplicate,
      }))
    );
  };

  const handleImport = async () => {
    const selectedExpenses = importItems
      .filter((item) => item.selected)
      .map((item) => item.expense);

    if (selectedExpenses.length === 0) {
      return;
    }

    try {
      setImporting(true);

      // Import each expense individually using existing method
      let successCount = 0;
      for (const expense of selectedExpenses) {
        try {
          await createExpense(expense);
          successCount++;
        } catch (error) {
          console.error("Failed to import expense:", error);
        }
      }

      onSuccess(successCount);
    } catch (error) {
      console.error("Bulk import failed:", error);
    } finally {
      setImporting(false);
    }
  };

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

  const selectedCount = importItems.filter((item) => item.selected).length;
  const duplicateCount = importItems.filter((item) => item.isDuplicate).length;
  const errorCount = importItems.filter(
    (item) => item.errors.length > 0
  ).length;

  if (!validationComplete && validationLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Validating Expenses...</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">
                Checking {expenses.length} expenses for duplicates...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (validationError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span>Validation Failed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">{validationError}</p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Bulk Import Validation</span>
          </div>
          <Badge variant="outline">
            {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {expenses.length}
            </div>
            <div className="text-sm text-blue-800">Total</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {selectedCount}
            </div>
            <div className="text-sm text-green-800">Selected</div>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">
              {duplicateCount}
            </div>
            <div className="text-sm text-amber-800">Duplicates</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <div className="text-sm text-red-800">Errors</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {importItems.every((item) => item.selected)
              ? "Deselect All"
              : "Select All"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectNonDuplicates}
          >
            Select Non-Duplicates Only
          </Button>
        </div>

        <Separator />

        {/* Expense List */}
        <div className="h-96 overflow-y-auto">
          <div className="space-y-3">
            {importItems.map((item) => (
              <Card
                key={item.index}
                className={`${
                  item.isDuplicate
                    ? "border-amber-200 bg-amber-50"
                    : item.errors.length > 0
                    ? "border-red-200 bg-red-50"
                    : "border-green-200 bg-green-50"
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => handleToggleSelection(item.index)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />

                    <div className="flex-1 space-y-2">
                      {/* Expense Details */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              {formatCurrency(item.expense.amount)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>{formatDate(item.expense.date)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Tag className="h-4 w-4 text-gray-500" />
                            <span>{item.expense.category}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {item.isDuplicate ? (
                          <Badge
                            variant="destructive"
                            className="flex items-center space-x-1"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span>Duplicate</span>
                          </Badge>
                        ) : item.errors.length > 0 ? (
                          <Badge
                            variant="destructive"
                            className="flex items-center space-x-1"
                          >
                            <XCircle className="h-3 w-3" />
                            <span>Error</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="default"
                            className="flex items-center space-x-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Valid</span>
                          </Badge>
                        )}
                      </div>

                      {/* Description */}
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          {item.expense.description}
                        </span>
                      </div>

                      {/* Errors and Warnings */}
                      {item.errors.length > 0 && (
                        <div className="text-sm text-red-600">
                          <strong>Errors:</strong> {item.errors.join(", ")}
                        </div>
                      )}
                      {item.warnings.length > 0 && (
                        <div className="text-sm text-amber-600">
                          <strong>Warnings:</strong> {item.warnings.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Import Actions */}
        <div className="flex justify-between items-center pt-4">
          <div className="text-sm text-gray-600">
            {selectedCount} of {expenses.length} expenses selected for import
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onCancel} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0 || importing}
            >
              {importing
                ? "Importing..."
                : `Import ${selectedCount} Expense${
                    selectedCount !== 1 ? "s" : ""
                  }`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default BulkImportValidator;
