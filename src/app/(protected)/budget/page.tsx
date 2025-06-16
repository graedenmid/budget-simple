"use client";

import { useState, useEffect } from "react";
import { BudgetItemList } from "@/components/budget/budget-item-list";
import { BudgetItemForm } from "@/components/budget/budget-item-form";
import { CategoryAnalytics } from "@/components/budget/category-analytics";
import { DependencyManager } from "@/components/budget/dependency-manager";
import { PriorityOrdering } from "@/components/budget/priority-ordering";
import { ValidationDashboard } from "@/components/budget/validation-dashboard";
import { ValidationStatus } from "@/components/budget/validation-status";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth/auth-context";
import {
  getBudgetItemsForUser,
  getIncomeSourcesForUser,
} from "@/lib/database/client-queries";
import { updateBudgetItem } from "@/lib/database/client-mutations";
import type { BudgetItem, IncomeSource } from "@/types/database";
import { TemplateBrowser } from "@/components/budget/template-browser";
import { QuickSetupWizard } from "@/components/budget/quick-setup-wizard";

export default function BudgetPage() {
  const { user } = useAuth();
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load budget items and income sources
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      setIsLoading(true);
      console.log("🔄 Starting budget data load for user:", user.id);

      try {
        console.time("⏱️ Budget data load");
        const [items, sources] = await Promise.all([
          getBudgetItemsForUser(user.id, true),
          getIncomeSourcesForUser(user.id),
        ]);

        console.timeEnd("⏱️ Budget data load");
        console.log(
          `✅ Loaded ${items?.length || 0} budget items, ${
            sources?.length || 0
          } income sources`
        );

        setBudgetItems(items || []);
        setIncomeSources(sources || []);
      } catch (error) {
        console.error("❌ Failed to load budget data:", error);
        setBudgetItems([]);
        setIncomeSources([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Handle priority updates
  const handleUpdatePriorities = async (
    updates: { id: string; priority: number }[]
  ) => {
    if (!user) return;

    try {
      // Update each item's priority
      for (const update of updates) {
        const item = budgetItems.find((item) => item.id === update.id);
        if (item) {
          await updateBudgetItem(update.id, {
            ...item,
            priority: update.priority,
          });
        }
      }

      // Reload budget items to reflect changes
      const updatedItems = await getBudgetItemsForUser(user.id, true);
      setBudgetItems(updatedItems);
    } catch (error) {
      console.error("Failed to update priorities:", error);
    }
  };

  // Handle dependency updates
  const handleUpdateDependencies = async (
    updates: { id: string; depends_on: string[] }[]
  ) => {
    if (!user) return;

    try {
      // Update each item's dependencies
      for (const update of updates) {
        const item = budgetItems.find((item) => item.id === update.id);
        if (item) {
          await updateBudgetItem(update.id, {
            ...item,
            depends_on: update.depends_on,
          });
        }
      }

      // Reload budget items to reflect changes
      const updatedItems = await getBudgetItemsForUser(user.id, true);
      setBudgetItems(updatedItems);
    } catch (error) {
      console.error("Failed to update dependencies:", error);
    }
  };

  // Handle form success and data refresh
  const handleFormSuccess = async () => {
    setIsFormOpen(false);
    if (user) {
      const [updatedItems, updatedSources] = await Promise.all([
        getBudgetItemsForUser(user.id, true),
        getIncomeSourcesForUser(user.id),
      ]);
      setBudgetItems(updatedItems);
      setIncomeSources(updatedSources);
    }
  };

  // Handle data refresh from validation dashboard
  const handleDataRefresh = async () => {
    if (user) {
      const [updatedItems, updatedSources] = await Promise.all([
        getBudgetItemsForUser(user.id, true),
        getIncomeSourcesForUser(user.id),
      ]);
      setBudgetItems(updatedItems);
      setIncomeSources(updatedSources);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading budget items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Budget Management
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-600">
                  Manage your budget items, dependencies, and calculation
                  priorities
                </p>
                <ValidationStatus
                  budgetItems={budgetItems}
                  incomeSources={incomeSources}
                />
              </div>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Budget Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Budget Item</DialogTitle>
                </DialogHeader>
                <BudgetItemForm
                  onSuccess={handleFormSuccess}
                  onCancel={() => setIsFormOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              <TabsTrigger value="priorities">Priorities</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="mb-4 text-center">
                <p className="text-gray-600">
                  Budget items: {budgetItems?.length || 0} | Income sources:{" "}
                  {incomeSources?.length || 0}
                </p>
              </div>
              <BudgetItemList
                budgetItems={budgetItems}
                onRefresh={handleDataRefresh}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <CategoryAnalytics
                budgetItems={budgetItems}
                incomeSources={incomeSources}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="dependencies" className="space-y-6">
              <DependencyManager
                budgetItems={budgetItems}
                onUpdatePriorities={handleUpdatePriorities}
                onUpdateDependencies={handleUpdateDependencies}
              />
            </TabsContent>

            <TabsContent value="priorities" className="space-y-6">
              <PriorityOrdering
                budgetItems={budgetItems}
                onUpdatePriorities={handleUpdatePriorities}
              />
            </TabsContent>

            <TabsContent value="validation" className="space-y-6">
              <ValidationDashboard
                budgetItems={budgetItems}
                incomeSources={incomeSources}
                onItemsUpdated={handleDataRefresh}
              />
            </TabsContent>

            <TabsContent value="templates" className="space-y-6">
              <div className="space-y-8">
                {/* Quick Setup Wizard */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Quick Setup Wizard
                  </h3>
                  <QuickSetupWizard onComplete={handleDataRefresh} />
                </div>

                {/* Template Browser */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Browse Templates
                  </h3>
                  <TemplateBrowser onTemplateApplied={handleDataRefresh} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
