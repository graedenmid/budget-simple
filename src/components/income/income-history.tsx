"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Calendar,
  Filter,
  Download,
  Plus,
  Edit,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import {
  getIncomeHistoryForUser,
  getIncomeHistoryForSource,
} from "@/lib/database/queries";
import type {
  IncomeHistory,
  IncomeSource,
  IncomeChangeType,
} from "@/types/database";
import { formatCurrency } from "@/lib/utils/currency";
import {
  formatChangeType,
  getChangeTypeColor,
  getChangeTypeIcon,
  formatChangedFields,
  groupHistoryByDate,
  getIncomeHistorySummary,
} from "@/lib/utils/income-history";

interface IncomeHistoryProps {
  incomeSource?: IncomeSource;
  userId?: string;
}

const iconMap = {
  Plus,
  Edit,
  Power,
  PowerOff,
  Trash2,
  Clock,
};

export function IncomeHistory({ incomeSource, userId }: IncomeHistoryProps) {
  const [history, setHistory] = useState<IncomeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("timeline");

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let historyData: IncomeHistory[];
      if (incomeSource) {
        historyData = await getIncomeHistoryForSource(incomeSource.id, userId);
      } else {
        historyData = await getIncomeHistoryForUser(userId);
      }

      setHistory(historyData);
    } catch (err) {
      setError("Failed to load income history");
      console.error("Error loading income history:", err);
    } finally {
      setLoading(false);
    }
  }, [incomeSource, userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const summary = getIncomeHistorySummary(history);
  const groupedHistory = groupHistoryByDate(history);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Total Changes</p>
                <p className="text-2xl font-bold">{summary.totalChanges}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Updates</p>
                <p className="text-2xl font-bold">
                  {summary.changeTypes.UPDATED || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Power className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Activations</p>
                <p className="text-2xl font-bold">
                  {summary.changeTypes.ACTIVATED || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Time Span</p>
                <p className="text-2xl font-bold">{summary.timeSpan} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {incomeSource
                  ? `${incomeSource.name} History`
                  : "Income History"}
              </CardTitle>
              <CardDescription>
                Track changes and trends in your income sources
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No history available yet
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedHistory).map(([date, items]) => (
                    <div key={date}>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">
                        {new Date(date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </h3>
                      <div className="space-y-3">
                        {items.map((item) => {
                          const IconComponent =
                            iconMap[
                              getChangeTypeIcon(
                                item.change_type
                              ) as keyof typeof iconMap
                            ];
                          return (
                            <div
                              key={item.id}
                              className="flex items-start gap-3 p-4 border rounded-lg"
                            >
                              <div
                                className={`p-2 rounded-full ${getChangeTypeColor(
                                  item.change_type
                                )}`}
                              >
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant="outline"
                                    className={getChangeTypeColor(
                                      item.change_type
                                    )}
                                  >
                                    {formatChangeType(item.change_type)}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    {new Date(
                                      item.created_at
                                    ).toLocaleTimeString()}
                                  </span>
                                </div>
                                <h4 className="font-medium text-gray-900">
                                  {item.name}
                                </h4>
                                <p className="text-sm text-gray-600 mb-2">
                                  {item.change_reason || "No reason provided"}
                                </p>
                                {item.changed_fields &&
                                  item.changed_fields.length > 0 && (
                                    <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                      {formatChangedFields(
                                        item.changed_fields,
                                        item.previous_values as Record<
                                          string,
                                          unknown
                                        >,
                                        item.new_values as Record<
                                          string,
                                          unknown
                                        >
                                      )}
                                    </div>
                                  )}
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                  <span>
                                    Gross: {formatCurrency(item.gross_amount)}
                                  </span>
                                  <span>
                                    Net: {formatCurrency(item.net_amount)}
                                  </span>
                                  <span>
                                    Status:{" "}
                                    {item.is_active ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                Trends analysis coming soon
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Change Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(summary.changeTypes).map(
                        ([type, count]) => (
                          <div
                            key={type}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm text-gray-600">
                              {formatChangeType(type as IncomeChangeType)}
                            </span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>

                {summary.latestChange && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Latest Change</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={getChangeTypeColor(
                              summary.latestChange.change_type
                            )}
                          >
                            {formatChangeType(summary.latestChange.change_type)}
                          </Badge>
                        </div>
                        <p className="font-medium">
                          {summary.latestChange.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(
                            summary.latestChange.created_at
                          ).toLocaleDateString()}
                        </p>
                        <div className="text-sm text-gray-600">
                          <p>
                            Gross:{" "}
                            {formatCurrency(summary.latestChange.gross_amount)}
                          </p>
                          <p>
                            Net:{" "}
                            {formatCurrency(summary.latestChange.net_amount)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
