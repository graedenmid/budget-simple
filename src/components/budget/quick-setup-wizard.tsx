"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  DollarSign,
  Target,
  Zap,
} from "lucide-react";
import {
  getRecommendedProfiles,
  getTemplateById,
  generateBudgetItemsFromTemplate,
  type QuickSetupProfile,
} from "@/lib/templates/budget-templates";
import { useAuth } from "@/lib/auth/auth-context";
import { createBudgetItem } from "@/lib/database/client-mutations";

interface QuickSetupWizardProps {
  onComplete?: () => void;
  className?: string;
}

type WizardStep = "income" | "profile" | "customize" | "confirm";

export function QuickSetupWizard({
  onComplete,
  className,
}: QuickSetupWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>("income");
  const [annualIncome, setAnnualIncome] = useState<number>(0);
  const [selectedProfile, setSelectedProfile] =
    useState<QuickSetupProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const steps: { id: WizardStep; title: string; description: string }[] = [
    { id: "income", title: "Income", description: "Tell us about your income" },
    {
      id: "profile",
      title: "Profile",
      description: "Choose your budget style",
    },
    { id: "customize", title: "Customize", description: "Review and adjust" },
    { id: "confirm", title: "Confirm", description: "Create your budget" },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const recommendedProfiles = getRecommendedProfiles(annualIncome);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleCreateBudget = async () => {
    if (!user || !selectedProfile) return;

    try {
      setIsCreating(true);

      // Apply all templates in the profile
      for (const templateId of selectedProfile.templates) {
        const template = getTemplateById(templateId);
        if (template) {
          const budgetItems = generateBudgetItemsFromTemplate(
            template,
            user.id
          );

          for (const item of budgetItems) {
            await createBudgetItem(item);
          }
        }
      }

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Failed to create budget:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={`max-w-2xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Quick Budget Setup</h2>
        <p className="text-gray-600">
          Let&apos;s create your personalized budget in just a few steps
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-gray-600">
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={
                index <= currentStepIndex ? "text-blue-600 font-medium" : ""
              }
            >
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === "income" && <DollarSign className="h-5 w-5" />}
            {currentStep === "profile" && <Target className="h-5 w-5" />}
            {currentStep === "customize" && <Zap className="h-5 w-5" />}
            {currentStep === "confirm" && <CheckCircle className="h-5 w-5" />}
            {steps[currentStepIndex].title}
          </CardTitle>
          <p className="text-gray-600">{steps[currentStepIndex].description}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Income */}
          {currentStep === "income" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="income">Annual Income (before taxes)</Label>
                <Input
                  id="income"
                  type="number"
                  placeholder="e.g., 50000"
                  value={annualIncome || ""}
                  onChange={(e) => setAnnualIncome(Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-600 mt-1">
                  This helps us recommend the best budget templates for your
                  situation
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Profile Selection */}
          {currentStep === "profile" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-3">
                  Recommended for ${annualIncome.toLocaleString()} annual
                  income:
                </h3>
                <div className="space-y-3">
                  {recommendedProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedProfile?.id === profile.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedProfile(profile)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{profile.icon}</span>
                          <div>
                            <h4 className="font-medium">{profile.name}</h4>
                            <p className="text-sm text-gray-600">
                              {profile.description}
                            </p>
                          </div>
                        </div>
                        {selectedProfile?.id === profile.id && (
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.templates.map((templateId) => {
                          const template = getTemplateById(templateId);
                          return template ? (
                            <Badge
                              key={templateId}
                              variant="secondary"
                              className="text-xs"
                            >
                              {template.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Customize */}
          {currentStep === "customize" && selectedProfile && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-3">Your Selected Profile:</h3>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{selectedProfile.icon}</span>
                    <div>
                      <h4 className="font-medium">{selectedProfile.name}</h4>
                      <p className="text-sm text-gray-600">
                        {selectedProfile.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Templates to be applied:</h3>
                <div className="space-y-2">
                  {selectedProfile.templates.map((templateId) => {
                    const template = getTemplateById(templateId);
                    return template ? (
                      <div
                        key={templateId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <span>{template.icon}</span>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-gray-600">
                              {template.items.length} budget items
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {template.estimatedSetupTime} min
                        </Badge>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {selectedProfile.customizations[selectedProfile.templates[0]] && (
                <div>
                  <h3 className="font-medium mb-3">Tips for your situation:</h3>
                  <div className="space-y-2">
                    {selectedProfile.customizations[
                      selectedProfile.templates[0]
                    ].tips.map((tip, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-sm"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirm */}
          {currentStep === "confirm" && selectedProfile && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Ready to Create Your Budget!
                </h3>
                <p className="text-gray-600">
                  We&apos;ll create your personalized budget based on the{" "}
                  {selectedProfile.name} profile.
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium mb-2">What happens next:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Budget items will be created automatically</li>
                  <li>• You can customize amounts and priorities later</li>
                  <li>• Start tracking your expenses right away</li>
                  <li>• Get insights and recommendations</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {currentStep === "confirm" ? (
          <Button
            onClick={handleCreateBudget}
            disabled={isCreating || !selectedProfile}
          >
            {isCreating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Create Budget
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={
              (currentStep === "income" && !annualIncome) ||
              (currentStep === "profile" && !selectedProfile)
            }
          >
            Next
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
