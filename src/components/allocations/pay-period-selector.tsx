"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDateRange, isPayPeriodActive } from "@/lib/utils/date-utils";
import { PayPeriod } from "@/lib/types/pay-periods";

interface PayPeriodSelectorProps {
  payPeriods: PayPeriod[];
  isLoading: boolean;
  error: string | null;
  selectedPayPeriod: PayPeriod | null;
  onPayPeriodSelect: (payPeriod: PayPeriod) => void;
  className?: string;
}

export function PayPeriodSelector({
  payPeriods,
  isLoading,
  error,
  selectedPayPeriod,
  onPayPeriodSelect,
  className,
}: PayPeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-select the current active pay period
  useEffect(() => {
    if (payPeriods.length > 0 && !selectedPayPeriod) {
      const activePeriod = payPeriods.find((p) => isPayPeriodActive(p));
      if (activePeriod) {
        onPayPeriodSelect(activePeriod);
      } else {
        // If no active period, select the most recent one
        const sortedPeriods = [...payPeriods].sort(
          (a, b) =>
            new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        );
        onPayPeriodSelect(sortedPeriods[0]);
      }
    }
  }, [payPeriods, selectedPayPeriod, onPayPeriodSelect]);

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (error || payPeriods.length === 0) {
    return (
      <div
        className={`flex items-center space-x-2 text-muted-foreground ${className}`}
      >
        <Calendar className="h-4 w-4" />
        <span className="text-sm">No pay periods available</span>
      </div>
    );
  }

  const getPayPeriodStatus = (payPeriod: PayPeriod) => {
    if (isPayPeriodActive(payPeriod)) return "active";
    if (payPeriod.status === "COMPLETED") return "completed";
    return "upcoming";
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "upcoming":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="justify-between min-w-[200px]">
            {selectedPayPeriod ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm">
                  {formatDateRange(
                    selectedPayPeriod.start_date,
                    selectedPayPeriod.end_date
                  )}
                </span>
                <Badge
                  variant={getStatusBadgeVariant(
                    getPayPeriodStatus(selectedPayPeriod)
                  )}
                >
                  {getPayPeriodStatus(selectedPayPeriod)}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">Select pay period</span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[300px]" align="start">
          {payPeriods.map((payPeriod) => {
            const status = getPayPeriodStatus(payPeriod);
            return (
              <DropdownMenuItem
                key={payPeriod.id}
                onClick={() => {
                  onPayPeriodSelect(payPeriod);
                  setIsOpen(false);
                }}
                className="flex items-center justify-between p-3"
              >
                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-medium">
                    {formatDateRange(payPeriod.start_date, payPeriod.end_date)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Expected: ${payPeriod.expected_net.toFixed(2)}
                  </span>
                </div>
                <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
