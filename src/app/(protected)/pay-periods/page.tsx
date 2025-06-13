"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Calendar, RefreshCw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PayPeriodSelector, AllocationList } from "@/components/allocations";
import { PayPeriodStatusManager } from "@/components/pay-periods/pay-period-status-manager";
import { BudgetBalanceDashboard } from "@/components/budget/budget-balance-dashboard";
import { PayPeriod } from "@/lib/types/pay-periods";
import { usePayPeriods } from "@/lib/hooks/use-pay-periods";

// Simple date formatting function
const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate).toLocaleDateString();
  const end = new Date(endDate).toLocaleDateString();
  return `${start} - ${end}`;
};

export default function PayPeriodsPage() {
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<PayPeriod | null>(
    null
  );
  const [canAutoComplete, setCanAutoComplete] = useState(false);
  const { refreshPayPeriods, isLoading, checkCanAutoComplete } =
    usePayPeriods();

  // Check if pay period can auto-complete when selected
  useEffect(() => {
    if (selectedPayPeriod?.status === "ACTIVE") {
      checkCanAutoComplete(selectedPayPeriod.id).then(setCanAutoComplete);
    } else {
      setCanAutoComplete(false);
    }
  }, [selectedPayPeriod, checkCanAutoComplete]);

  const handlePayPeriodSelect = (payPeriod: PayPeriod) => {
    setSelectedPayPeriod(payPeriod);
  };

  const handleRefresh = () => {
    refreshPayPeriods();
  };

  const handleStatusChange = () => {
    refreshPayPeriods();
    // Re-check auto-completion status
    if (selectedPayPeriod?.status === "ACTIVE") {
      checkCanAutoComplete(selectedPayPeriod.id).then(setCanAutoComplete);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Pay Period Management
          </h1>
          <p className="text-muted-foreground">
            Track and manage your budget allocations for each pay period
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/pay-periods/history")}
            title="View History"
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh data"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Pay Period Selection */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Select Pay Period</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <PayPeriodSelector
              selectedPayPeriod={selectedPayPeriod}
              onPayPeriodSelect={handlePayPeriodSelect}
              className="flex-1"
            />

            {selectedPayPeriod && (
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <span>Period:</span>
                  <Badge variant="outline">
                    {formatDateRange(
                      selectedPayPeriod.start_date,
                      selectedPayPeriod.end_date
                    )}
                  </Badge>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center space-x-2">
                  <span>Expected Income:</span>
                  <span className="font-medium">
                    ${selectedPayPeriod.expected_net.toFixed(2)}
                  </span>
                </div>
                {selectedPayPeriod.actual_net && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center space-x-2">
                      <span>Actual Income:</span>
                      <span className="font-medium">
                        ${selectedPayPeriod.actual_net.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      {selectedPayPeriod && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-medium text-blue-900">
                  Mark Budget Items as Paid
                </h3>
                <p className="text-sm text-blue-700">
                  Review your budget allocations below and mark items as paid
                  when you complete them. You can also adjust the actual amount
                  if it differs from the expected amount.
                </p>
                <ul className="text-sm text-blue-600 mt-2 space-y-1">
                  <li>• Click the checkmark button to mark an item as paid</li>
                  <li>• Click the edit icon to adjust the actual amount</li>
                  <li>• Track your progress with the completion percentage</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Balance Overview */}
      {selectedPayPeriod && (
        <BudgetBalanceDashboard
          payPeriodId={selectedPayPeriod.id}
          compact={true}
        />
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation List */}
        <div className="lg:col-span-2">
          <AllocationList
            payPeriod={selectedPayPeriod}
            onAllocationUpdate={handleStatusChange}
          />
        </div>

        {/* Status Manager Sidebar */}
        {selectedPayPeriod && (
          <div className="lg:col-span-1">
            <PayPeriodStatusManager
              payPeriod={selectedPayPeriod}
              onStatusChange={handleStatusChange}
              canAutoComplete={canAutoComplete}
            />
          </div>
        )}
      </div>
    </div>
  );
}
