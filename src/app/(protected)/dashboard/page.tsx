"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User,
  DollarSign,
  Target,
  TrendingUp,
  Calculator,
  Activity,
} from "lucide-react";
import { BudgetHealthDashboard } from "@/components/budget/budget-health-indicator";
import { usePayPeriods } from "@/lib/hooks/use-pay-periods";
import { useBudgetHealth } from "@/lib/hooks/use-budget-balance";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { payPeriods } = usePayPeriods();

  // Get the most recent active pay period for budget health
  const activePayPeriod =
    payPeriods?.find((p) => p.status === "ACTIVE") || payPeriods?.[0];
  const { health } = useBudgetHealth(activePayPeriod?.id || null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">Welcome to Budget Simple</p>
        </div>

        {/* User Info Card */}
        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Email
                  </label>
                  <p className="text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Name
                  </label>
                  <p className="text-gray-900">
                    {user?.user_metadata?.name || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Account Created
                  </label>
                  <p className="text-gray-900">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget Health Overview */}
          {activePayPeriod && health && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Budget Health Overview
                </CardTitle>
                <CardDescription>
                  Current budget status and health metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetHealthDashboard health={health} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Income Sources
              </CardTitle>
              <CardDescription>
                Manage your income and payment schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/income">Manage Income Sources</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-5 w-5" />
                Budget Items
              </CardTitle>
              <CardDescription>
                Configure your budget categories and allocations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/budget">Manage Budget Items</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="mr-2 h-5 w-5" />
                Pay Periods
              </CardTitle>
              <CardDescription>
                Track paycheck allocations and spending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/pay-periods">Manage Pay Periods</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Expenses
              </CardTitle>
              <CardDescription>
                Track your spending and categorize expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Coming in Phase 7
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Smart Recommendations</CardTitle>
              <CardDescription>
                Get intelligent suggestions for surplus funds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Coming in Phase 8
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>
                View budget health and spending insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Coming in Phase 9
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Phase Status */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Development Progress 🚀</CardTitle>
            <CardDescription>
              Current implementation status and upcoming features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span>Phase 1: Project Setup & Infrastructure</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span>Phase 2: Database Schema & Backend Setup</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span>Phase 3: Authentication & User Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span>Phase 4: Income Management System</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span>Phase 5: Budget Item Configuration</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-600">🔄</span>
                <span>Phase 6: Pay Period & Allocation Management</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">⏳</span>
                <span>Phase 7: Expense Tracking System</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">⏳</span>
                <span>Phase 8: Smart Recommendations Engine</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">⏳</span>
                <span>Phase 9: Core User Interface & Dashboard</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Currently Working On:</strong> Pay Period Management -
                Implementing automatic pay period generation and allocation
                calculations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
