"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  createIncomeSource,
  updateIncomeSource,
} from "@/lib/database/client-mutations";
import { getCadenceOptions } from "@/lib/utils/cadence";
import type { IncomeSource, IncomeCadence } from "@/types/database";

// Form validation schema
const incomeSourceSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be less than 100 characters"),
    gross_amount: z.number().min(0.01, "Gross amount must be greater than 0"),
    net_amount: z.number().min(0.01, "Net amount must be greater than 0"),
    cadence: z.enum([
      "weekly",
      "bi-weekly",
      "semi-monthly",
      "monthly",
      "quarterly",
      "annual",
    ]),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().optional(),
  })
  .refine((data) => data.net_amount <= data.gross_amount, {
    message: "Net amount cannot be greater than gross amount",
    path: ["net_amount"],
  })
  .refine(
    (data) => {
      if (!data.end_date) return true; // End date is optional
      return new Date(data.end_date) >= new Date(data.start_date);
    },
    {
      message: "End date cannot be before start date",
      path: ["end_date"],
    }
  );

type IncomeSourceFormData = z.infer<typeof incomeSourceSchema>;

interface IncomeSourceFormProps {
  incomeSource?: IncomeSource | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function IncomeSourceForm({
  incomeSource,
  onSuccess,
  onCancel,
}: IncomeSourceFormProps) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IncomeSourceFormData>({
    resolver: zodResolver(incomeSourceSchema),
    defaultValues: incomeSource
      ? {
          name: incomeSource.name,
          gross_amount: incomeSource.gross_amount,
          net_amount: incomeSource.net_amount,
          cadence: incomeSource.cadence,
          start_date: incomeSource.start_date,
          end_date: incomeSource.end_date || "",
        }
      : {
          start_date: new Date().toISOString().split("T")[0], // Today's date
          end_date: "",
        },
  });

  const cadenceOptions = getCadenceOptions();
  const selectedCadence = watch("cadence");

  const onSubmit = async (data: IncomeSourceFormData) => {
    if (!user) {
      setError("You must be logged in to save income sources");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Add timeout protection at component level
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timeout - please try again")),
          15000
        )
      );

      if (incomeSource) {
        // Update existing income source with timeout
        const updatePromise = updateIncomeSource(incomeSource.id, {
          name: data.name,
          gross_amount: data.gross_amount,
          net_amount: data.net_amount,
          cadence: data.cadence,
          start_date: data.start_date,
          end_date: data.end_date || null,
          updated_at: new Date().toISOString(),
        });

        const success = await Promise.race([updatePromise, timeoutPromise]);
        if (!success) {
          throw new Error("Failed to update income source");
        }
      } else {
        // Create new income source with timeout
        const createPromise = createIncomeSource({
          user_id: user.id,
          name: data.name,
          gross_amount: data.gross_amount,
          net_amount: data.net_amount,
          cadence: data.cadence,
          start_date: data.start_date,
          end_date: data.end_date || null,
          is_active: true,
        });

        const id = await Promise.race([createPromise, timeoutPromise]);
        if (!id) {
          throw new Error("Failed to create income source");
        }
      }

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>
              {incomeSource ? "Edit Income Source" : "Add Income Source"}
            </CardTitle>
            <CardDescription>
              {incomeSource
                ? "Update your income source details"
                : "Add a new source of income to your budget"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Income Source Name</Label>
            <Input
              id="name"
              placeholder="e.g., Main Job, Freelance, Side Business"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Gross Amount */}
          <div className="space-y-2">
            <Label htmlFor="gross_amount">Gross Amount (before taxes)</Label>
            <Input
              id="gross_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("gross_amount", { valueAsNumber: true })}
            />
            {errors.gross_amount && (
              <p className="text-sm text-red-600">
                {errors.gross_amount.message}
              </p>
            )}
          </div>

          {/* Net Amount */}
          <div className="space-y-2">
            <Label htmlFor="net_amount">Net Amount (after taxes)</Label>
            <Input
              id="net_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("net_amount", { valueAsNumber: true })}
            />
            {errors.net_amount && (
              <p className="text-sm text-red-600">
                {errors.net_amount.message}
              </p>
            )}
          </div>

          {/* Cadence */}
          <div className="space-y-2">
            <Label htmlFor="cadence">Payment Frequency</Label>
            <Select
              value={selectedCadence}
              onValueChange={(value: IncomeCadence) =>
                setValue("cadence", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment frequency" />
              </SelectTrigger>
              <SelectContent>
                {cadenceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cadence && (
              <p className="text-sm text-red-600">{errors.cadence.message}</p>
            )}
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input id="start_date" type="date" {...register("start_date")} />
            {errors.start_date && (
              <p className="text-sm text-red-600">
                {errors.start_date.message}
              </p>
            )}
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end_date">End Date (Optional)</Label>
            <Input
              id="end_date"
              type="date"
              {...register("end_date")}
              placeholder="Leave empty if ongoing"
            />
            <p className="text-xs text-gray-500">
              Set an end date if this income source has ended (e.g., job change,
              contract completion)
            </p>
            {errors.end_date && (
              <p className="text-sm text-red-600">{errors.end_date.message}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {incomeSource ? "Updating..." : "Creating..."}
                </>
              ) : incomeSource ? (
                "Update Income Source"
              ) : (
                "Create Income Source"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
