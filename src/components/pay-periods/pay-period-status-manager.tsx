"use client";

import { useState } from "react";
import { CheckCircle, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePayPeriods } from "@/lib/hooks/use-pay-periods";
import { PayPeriod } from "@/lib/types/pay-periods";

interface PayPeriodStatusManagerProps {
  payPeriod: PayPeriod;
  onStatusChange?: () => void;
  canAutoComplete?: boolean;
}

export function PayPeriodStatusManager({
  payPeriod,
  onStatusChange,
  canAutoComplete = false,
}: PayPeriodStatusManagerProps) {
  const [actualNetAmount, setActualNetAmount] = useState(
    payPeriod.actual_net?.toString() || payPeriod.expected_net.toString()
  );
  const [showActualAmount, setShowActualAmount] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { completePayPeriod, reactivatePayPeriod, isUpdating } =
    usePayPeriods();

  const isCompleted = payPeriod.status === "COMPLETED";
  const isActive = payPeriod.status === "ACTIVE";

  const handleComplete = async () => {
    try {
      setError(null);
      const amount = showActualAmount ? parseFloat(actualNetAmount) : undefined;

      if (showActualAmount && (isNaN(amount!) || amount! < 0)) {
        setError("Please enter a valid amount");
        return;
      }

      await completePayPeriod(payPeriod.id, amount);
      setShowActualAmount(false);
      onStatusChange?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to complete pay period"
      );
    }
  };

  const handleReactivate = async () => {
    try {
      setError(null);
      await reactivatePayPeriod(payPeriod.id);
      onStatusChange?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reactivate pay period"
      );
    }
  };

  const getStatusIcon = () => {
    if (isUpdating) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isCompleted) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <RefreshCw className="h-4 w-4 text-blue-600" />;
  };

  const getStatusText = () => {
    if (isCompleted) return "Completed";
    if (isActive) return "Active";
    return "Unknown";
  };

  const getStatusVariant = () => {
    if (isCompleted) return "default";
    if (isActive) return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Pay Period Status</span>
          <Badge
            variant={getStatusVariant()}
            className="flex items-center gap-1"
          >
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {canAutoComplete && isActive && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All allocations are paid! This pay period can be automatically
              completed.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Expected Net Income:</span>
            <span className="font-medium">
              ${payPeriod.expected_net.toFixed(2)}
            </span>
          </div>

          {payPeriod.actual_net && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Actual Net Income:</span>
              <span className="font-medium">
                ${payPeriod.actual_net.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Period:</span>
            <span className="font-medium">
              {new Date(payPeriod.start_date).toLocaleDateString()} -{" "}
              {new Date(payPeriod.end_date).toLocaleDateString()}
            </span>
          </div>
        </div>

        {isActive && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-actual-amount"
                checked={showActualAmount}
                onChange={(e) => setShowActualAmount(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="show-actual-amount" className="text-sm">
                Set actual net income amount
              </Label>
            </div>

            {showActualAmount && (
              <div className="space-y-2">
                <Label htmlFor="actual-amount" className="text-sm">
                  Actual Net Income
                </Label>
                <Input
                  id="actual-amount"
                  type="number"
                  value={actualNetAmount}
                  onChange={(e) => setActualNetAmount(e.target.value)}
                  placeholder="Enter actual amount"
                  step="0.01"
                  min="0"
                />
              </div>
            )}

            <Button
              onClick={handleComplete}
              disabled={isUpdating}
              className="w-full"
              variant="default"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Pay Period
                </>
              )}
            </Button>
          </div>
        )}

        {isCompleted && (
          <div className="space-y-3">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                This pay period has been completed. You can reactivate it to
                make changes.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleReactivate}
              disabled={isUpdating}
              variant="outline"
              className="w-full"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reactivating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reactivate Pay Period
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
