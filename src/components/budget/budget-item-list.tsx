"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, SortAsc, SortDesc } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getBudgetItemsForUser } from "@/lib/database/client-queries";
import { BudgetItemCard } from "./budget-item-card";
import { BudgetItemForm } from "./budget-item-form";
import { CategoryAnalytics } from "./category-analytics";
import { CATEGORY_INFO } from "@/lib/schemas/budget-item";
import type { BudgetItem } from "@/types/database";

type ViewMode = "list" | "form";
type SortBy = "name" | "priority" | "category" | "value" | "created_at";
type SortOrder = "asc" | "desc";

export function BudgetItemList() {
  const { user } = useAuth();
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("priority");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showInactive, setShowInactive] = useState(false);

  // Load budget items
  const loadBudgetItems = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const items = await getBudgetItemsForUser(user.id, showInactive);
      setBudgetItems(items);
    } catch (error) {
      console.error("Failed to load budget items:", error);
    } finally {
      setLoading(false);
    }
  }, [user, showInactive]);

  useEffect(() => {
    loadBudgetItems();
  }, [loadBudgetItems]);

  // Filter items by category
  const getFilteredItems = () => {
    let filtered = budgetItems;

    if (activeTab !== "all") {
      filtered = budgetItems.filter((item) => item.category === activeTab);
    }

    // Sort items
    filtered.sort((a, b) => {
      let aValue: string | number = a[sortBy];
      let bValue: string | number = b[sortBy];

      if (sortBy === "name") {
        aValue = (aValue as string).toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setViewMode("form");
  };

  const handleEditItem = (item: BudgetItem) => {
    setEditingItem(item);
    setViewMode("form");
  };

  const handleFormSuccess = () => {
    setViewMode("list");
    setEditingItem(null);
    loadBudgetItems();
  };

  const handleFormCancel = () => {
    setViewMode("list");
    setEditingItem(null);
  };

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getCategoryCount = (category: string) => {
    if (category === "all") {
      return budgetItems.filter((item) => showInactive || item.is_active)
        .length;
    }
    return budgetItems.filter(
      (item) => item.category === category && (showInactive || item.is_active)
    ).length;
  };

  if (viewMode === "form") {
    return (
      <BudgetItemForm
        budgetItem={editingItem}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budget Items</h1>
          <p className="text-gray-600">
            Manage your budget categories and allocation rules
          </p>
        </div>
        <Button onClick={handleAddItem}>
          <Plus className="mr-2 h-4 w-4" />
          Add Budget Item
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Sorting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Show Inactive Toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-inactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="show-inactive" className="text-sm font-medium">
                Show inactive items
              </label>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort by:</span>
              {(["name", "priority", "category", "value"] as SortBy[]).map(
                (field) => (
                  <Button
                    key={field}
                    variant={sortBy === field ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSort(field)}
                    className="capitalize"
                  >
                    {field}
                    {sortBy === field &&
                      (sortOrder === "asc" ? (
                        <SortAsc className="ml-1 h-3 w-3" />
                      ) : (
                        <SortDesc className="ml-1 h-3 w-3" />
                      ))}
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All
            <Badge variant="secondary" className="text-xs">
              {getCategoryCount("all")}
            </Badge>
          </TabsTrigger>
          {Object.entries(CATEGORY_INFO).map(([category, info]) => (
            <TabsTrigger
              key={category}
              value={category}
              className="flex items-center gap-2"
            >
              <span>{info.icon}</span>
              <span className="hidden sm:inline">{info.label}</span>
              <Badge variant="secondary" className="text-xs">
                {getCategoryCount(category)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading budget items...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  {activeTab === "all"
                    ? "No budget items found"
                    : `No ${CATEGORY_INFO[
                        activeTab as keyof typeof CATEGORY_INFO
                      ]?.label.toLowerCase()} items found`}
                </p>
                <Button onClick={handleAddItem} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Budget Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <BudgetItemCard
                  key={item.id}
                  budgetItem={item}
                  onEdit={handleEditItem}
                  onRefresh={loadBudgetItems}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Category Analytics */}
      {!loading && budgetItems.length > 0 && <CategoryAnalytics />}

      {/* Summary */}
      {!loading && budgetItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {budgetItems.filter((item) => item.is_active).length}
                </div>
                <div className="text-sm text-gray-600">Active Items</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {budgetItems.filter((item) => !item.is_active).length}
                </div>
                <div className="text-sm text-gray-600">Inactive Items</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {
                    budgetItems.filter(
                      (item) => item.calc_type === "FIXED" && item.is_active
                    ).length
                  }
                </div>
                <div className="text-sm text-gray-600">Fixed Amount</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {
                    budgetItems.filter(
                      (item) => item.calc_type !== "FIXED" && item.is_active
                    ).length
                  }
                </div>
                <div className="text-sm text-gray-600">Percentage Based</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
