"use client";

import {
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExpenses } from "@/lib/hooks/use-expenses";
import {
  getCategoryIcon,
  getCategoryGroup,
} from "@/lib/constants/expense-categories";
import { ExpenseWithDetails, ExpenseFilters } from "@/lib/types/expenses";

interface ExpenseListProps {
  filters?: ExpenseFilters;
  onExpenseEdit?: (expense: ExpenseWithDetails) => void;
  onExpenseDelete?: (expenseId: string) => void;
}

export function ExpenseList({
  filters,
  onExpenseEdit,
  onExpenseDelete,
}: ExpenseListProps) {
  const { expenses, loading, error, hasMore, loadMore } = useExpenses(filters);

  // Count active filters
  const activeFilterCount = filters
    ? Object.keys(filters).filter(
        (key) =>
          filters[key as keyof ExpenseFilters] !== undefined &&
          filters[key as keyof ExpenseFilters] !== ""
      ).length
    : 0;

  if (loading && expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Expenses</span>
            {activeFilterCount > 0 && (
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <Badge variant="secondary">{activeFilterCount} filters</Badge>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Expenses</span>
            {activeFilterCount > 0 && (
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <Badge variant="secondary">{activeFilterCount} filters</Badge>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (expenses.length === 0) {
    const isFiltered = activeFilterCount > 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Expenses</span>
            {activeFilterCount > 0 && (
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <Badge variant="secondary">{activeFilterCount} filters</Badge>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {isFiltered
                ? "No expenses match your filters"
                : "No expenses yet"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isFiltered
                ? "Try adjusting your search criteria or clear filters to see all expenses."
                : "Start tracking your expenses by adding your first expense above."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Expenses</span>
          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <Badge variant="secondary">{activeFilterCount} filters</Badge>
              </div>
            )}
            <Badge variant="secondary">{expenses.length} expenses</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {expenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              onEdit={onExpenseEdit}
              onDelete={onExpenseDelete}
            />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMore} disabled={loading}>
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ExpenseItemProps {
  expense: ExpenseWithDetails;
  onEdit?: (expense: ExpenseWithDetails) => void;
  onDelete?: (expenseId: string) => void;
}

function ExpenseItem({ expense, onEdit, onDelete }: ExpenseItemProps) {
  const categoryIcon = getCategoryIcon(expense.category);
  const categoryGroup = getCategoryGroup(expense.category);
  const expenseDate = new Date(expense.date);

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-4">
        {/* Category Icon */}
        <div className="text-2xl">{categoryIcon}</div>

        {/* Expense Details */}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium">{expense.description}</h4>
            <Badge variant="outline" className="text-xs">
              {expense.category}
            </Badge>
            {categoryGroup && (
              <Badge variant="secondary" className="text-xs">
                {categoryGroup.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{expenseDate.toLocaleDateString()}</span>
            </div>
            {expense.type === "BUDGET_PAYMENT" && (
              <Badge variant="default" className="text-xs">
                Budget Payment
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Amount */}
        <div className="text-right">
          <div className="font-semibold">${expense.amount.toFixed(2)}</div>
        </div>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(expense)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(expense.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
