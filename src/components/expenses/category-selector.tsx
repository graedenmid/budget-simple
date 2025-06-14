"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_GROUPS,
  getCategoryIcon,
  getCategoryGroup,
} from "@/lib/constants/expense-categories";

interface CategorySelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CategorySelector({
  value,
  onValueChange,
  placeholder = "Select category...",
  className,
}: CategorySelectorProps) {
  // Get the selected category details
  const selectedCategoryName = value
    ? EXPENSE_CATEGORIES[value as keyof typeof EXPENSE_CATEGORIES]
    : null;
  const selectedIcon = value ? getCategoryIcon(value) : null;
  const selectedGroup = value ? getCategoryGroup(value) : null;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedCategoryName && (
            <div className="flex items-center space-x-2">
              {selectedIcon && <span className="text-sm">{selectedIcon}</span>}
              <span>{selectedCategoryName}</span>
              {selectedGroup && (
                <Badge variant="secondary" className="text-xs ml-2">
                  {selectedGroup.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* Group categories by their group */}
        {Object.entries(EXPENSE_CATEGORY_GROUPS).map(
          ([groupName, groupCategories]) => (
            <div key={groupName}>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                {groupName.replace(/_/g, " ")}
              </div>
              {groupCategories.map((categoryValue) => {
                // Find the key that matches this value
                const categoryKey = Object.keys(EXPENSE_CATEGORIES).find(
                  (key) =>
                    EXPENSE_CATEGORIES[
                      key as keyof typeof EXPENSE_CATEGORIES
                    ] === categoryValue
                );
                const icon = categoryKey ? getCategoryIcon(categoryKey) : null;

                return (
                  <SelectItem
                    key={categoryKey || categoryValue}
                    value={categoryKey || categoryValue}
                  >
                    <div className="flex items-center space-x-2">
                      {icon && <span className="text-sm">{icon}</span>}
                      <span>{categoryValue}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </div>
          )
        )}
      </SelectContent>
    </Select>
  );
}
