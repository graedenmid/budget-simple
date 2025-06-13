"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Clock, Users, CheckCircle, Sparkles } from "lucide-react";
import {
  getTemplatesByCategory,
  generateBudgetItemsFromTemplate,
  type BudgetTemplate,
} from "@/lib/templates/budget-templates";
import { useAuth } from "@/lib/auth/auth-context";
import { createBudgetItem } from "@/lib/database/client-mutations";
import { CATEGORY_INFO, CALC_TYPE_INFO } from "@/lib/schemas/budget-item";

interface TemplateBrowserProps {
  onTemplateApplied?: () => void;
  className?: string;
}

export function TemplateBrowser({
  onTemplateApplied,
  className,
}: TemplateBrowserProps) {
  const { user } = useAuth();
  const [isApplying, setIsApplying] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<BudgetTemplate["category"]>("starter");

  const categories = [
    {
      id: "starter",
      label: "Starter",
      icon: "🌱",
      description: "Perfect for beginners",
    },
    {
      id: "advanced",
      label: "Advanced",
      icon: "🎯",
      description: "Complex budgets",
    },
    {
      id: "specialized",
      label: "Specialized",
      icon: "⚡",
      description: "Specific goals",
    },
  ] as const;

  const filteredTemplates = getTemplatesByCategory(selectedCategory);

  const handleApplyTemplate = async (template: BudgetTemplate) => {
    if (!user) return;

    try {
      setIsApplying(true);

      // Generate budget items from template
      const budgetItems = generateBudgetItemsFromTemplate(template, user.id);

      // Create each budget item
      for (const item of budgetItems) {
        await createBudgetItem(item);
      }

      // Notify parent component
      if (onTemplateApplied) {
        onTemplateApplied();
      }
    } catch (error) {
      console.error("Failed to apply template:", error);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Budget Templates</h2>
        <p className="text-gray-600">
          Get started quickly with pre-built budget templates designed for
          different lifestyles
        </p>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onValueChange={(value) =>
          setSelectedCategory(value as BudgetTemplate["category"])
        }
      >
        <TabsList className="grid w-full grid-cols-3">
          {categories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="flex items-center gap-2"
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent
            key={category.id}
            value={category.id}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">
                {category.label} Templates
              </h3>
              <p className="text-gray-600">{category.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{template.icon}</span>
                        <CardTitle className="text-lg">
                          {template.name}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {template.description}
                    </p>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      {/* Template Stats */}
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{template.estimatedSetupTime} min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{template.items.length} items</span>
                        </div>
                      </div>

                      {/* Benefits */}
                      <div className="space-y-1">
                        {template.benefits.slice(0, 2).map((benefit, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-xs text-gray-600"
                          >
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              Preview
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <span>{template.icon}</span>
                                {template.name}
                              </DialogTitle>
                            </DialogHeader>
                            <TemplatePreview template={template} />
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleApplyTemplate(template)}
                          disabled={isApplying}
                        >
                          {isApplying ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1" />
                          ) : (
                            <Sparkles className="h-3 w-3 mr-1" />
                          )}
                          Apply
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// Template Preview Component
function TemplatePreview({ template }: { template: BudgetTemplate }) {
  return (
    <div className="space-y-6">
      {/* Template Info */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Description</h3>
          <p className="text-gray-600">{template.description}</p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Target Audience</h3>
          <div className="flex flex-wrap gap-2">
            {template.targetAudience.map((audience, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {audience}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Benefits</h3>
          <div className="space-y-1">
            {template.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Budget Items */}
      <div>
        <h3 className="font-semibold mb-3">
          Budget Items ({template.items.length})
        </h3>
        <div className="space-y-3">
          {template.items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">
                    #{item.priority}
                  </span>
                  <span>{CATEGORY_INFO[item.category].icon}</span>
                </div>
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-600">
                    {CATEGORY_INFO[item.category].label} •{" "}
                    {CALC_TYPE_INFO[item.calc_type].label}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {item.calc_type === "FIXED"
                    ? `$${item.value.toFixed(2)}`
                    : `${item.value}%`}
                </div>
                <div className="text-xs text-gray-600 capitalize">
                  {item.cadence}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Time */}
      <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-md">
        <Clock className="h-4 w-4 text-blue-600" />
        <span className="text-sm text-blue-600">
          Estimated setup time: {template.estimatedSetupTime} minutes
        </span>
      </div>
    </div>
  );
}
