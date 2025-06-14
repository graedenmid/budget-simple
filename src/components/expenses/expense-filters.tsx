"use client";

import { useState, useEffect } from "react";
import { Search, Filter, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategorySelector } from "./category-selector";
import { ExpenseFilters as ExpenseFiltersType } from "@/lib/types/expenses";

interface ExpenseFiltersProps {
  filters: ExpenseFiltersType;
  onFiltersChange: (filters: ExpenseFiltersType) => void;
  onClearFilters: () => void;
}

export function ExpenseFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: ExpenseFiltersProps) {
  const [localFilters, setLocalFilters] = useState<ExpenseFiltersType>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update local filters when external filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilter = (
    key: keyof ExpenseFiltersType,
    value: string | number | undefined
  ) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const removeFilter = (key: keyof ExpenseFiltersType) => {
    const newFilters = { ...localFilters };
    delete newFilters[key];
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    setLocalFilters({});
    onClearFilters();
  };

  // Count active filters
  const activeFilterCount = Object.keys(filters).filter(
    (key) =>
      filters[key as keyof ExpenseFiltersType] !== undefined &&
      filters[key as keyof ExpenseFiltersType] !== ""
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Hide" : "Show"} Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Description</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search expenses..."
                value={localFilters.search || ""}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="pl-10"
              />
              {localFilters.search && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => removeFilter("search")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="start_date"
                  type="date"
                  value={localFilters.start_date || ""}
                  onChange={(e) => updateFilter("start_date", e.target.value)}
                  className="pl-10"
                />
                {localFilters.start_date && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => removeFilter("start_date")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="end_date"
                  type="date"
                  value={localFilters.end_date || ""}
                  onChange={(e) => updateFilter("end_date", e.target.value)}
                  className="pl-10"
                />
                {localFilters.end_date && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => removeFilter("end_date")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex items-center space-x-2">
              <CategorySelector
                value={localFilters.category || ""}
                onValueChange={(value) => updateFilter("category", value)}
                placeholder="Filter by category..."
                className="flex-1"
              />
              {localFilters.category && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilter("category")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_amount">Min Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="min_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={localFilters.min_amount || ""}
                  onChange={(e) =>
                    updateFilter(
                      "min_amount",
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  className="pl-8"
                />
                {localFilters.min_amount && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => removeFilter("min_amount")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_amount">Max Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="max_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={localFilters.max_amount || ""}
                  onChange={(e) =>
                    updateFilter(
                      "max_amount",
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  className="pl-8"
                />
                {localFilters.max_amount && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => removeFilter("max_amount")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="space-y-2">
              <Label>Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {localFilters.search && (
                  <Badge
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <span>Search: &ldquo;{localFilters.search}&rdquo;</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto w-auto p-0 ml-1"
                      onClick={() => removeFilter("search")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {localFilters.category && (
                  <Badge
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <span>Category: {localFilters.category}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto w-auto p-0 ml-1"
                      onClick={() => removeFilter("category")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {(localFilters.start_date || localFilters.end_date) && (
                  <Badge
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <span>
                      Date: {localFilters.start_date || "Any"} to{" "}
                      {localFilters.end_date || "Today"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto w-auto p-0 ml-1"
                      onClick={() => {
                        removeFilter("start_date");
                        removeFilter("end_date");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {(localFilters.min_amount || localFilters.max_amount) && (
                  <Badge
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <span>
                      Amount: ${localFilters.min_amount || "0"} - $
                      {localFilters.max_amount || "∞"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto w-auto p-0 ml-1"
                      onClick={() => {
                        removeFilter("min_amount");
                        removeFilter("max_amount");
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
