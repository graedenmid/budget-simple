"use client";

import { useState, useEffect } from "react";
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
  Plus,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  History,
} from "lucide-react";
import { getAllIncomeSourcesForUser } from "@/lib/database/client-queries";
import {
  permanentlyDeleteIncomeSource,
  updateIncomeSource,
} from "@/lib/database/client-mutations";
import type { IncomeSource } from "@/types/database";
import { IncomeSourceForm } from "@/components/income/income-source-form";
import { IncomeHistory } from "@/components/income/income-history";
import { formatCurrency } from "@/lib/utils/currency";
import { formatCadence } from "@/lib/utils/cadence";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function IncomePage() {
  const { user, loading: authLoading } = useAuth();
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load income sources function (for manual calls)
  const loadIncomeSources = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const sources = await getAllIncomeSourcesForUser(user.id);
      setIncomeSources(sources);
    } catch (err) {
      console.error("Error loading income sources:", err);
      setError(
        "Failed to load income sources. Please try refreshing the page."
      );
      setIncomeSources([]); // Set empty array on any error
    } finally {
      setLoading(false);
    }
  };

  // Effect to load data when user is available
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const sources = await getAllIncomeSourcesForUser(user.id);
        setIncomeSources(sources);
      } catch (err) {
        console.error("Error loading income sources:", err);
        setError(
          "Failed to load income sources. Please try refreshing the page."
        );
        setIncomeSources([]); // Set empty array on any error
      } finally {
        setLoading(false);
      }
    };

    // Only load when we have a user and auth is not loading
    if (user && !authLoading) {
      loadData();
    } else if (!authLoading && !user) {
      // Auth finished loading but no user - clear loading state
      setLoading(false);
    }
  }, [user, authLoading]); // No external function dependencies

  const handleAddNew = () => {
    setEditingSource(null);
    setShowForm(true);
  };

  const handleEdit = (source: IncomeSource) => {
    setEditingSource(source);
    setShowForm(true);
  };

  const handlePermanentDelete = async (
    sourceId: string,
    sourceName: string
  ) => {
    if (
      !confirm(
        `⚠️ PERMANENT DELETE WARNING ⚠️\n\nAre you sure you want to PERMANENTLY delete "${sourceName}"?\n\nThis will:\n• Remove the income source completely\n• Delete ALL history and records\n• Cannot be undone\n\nType "DELETE" to confirm this is really what you want.`
      )
    ) {
      return;
    }

    // Second confirmation with explicit text input would be better UX but keeping simple for now
    if (
      !confirm(
        "Final confirmation: This action CANNOT be undone. Delete permanently?"
      )
    ) {
      return;
    }

    try {
      const success = await permanentlyDeleteIncomeSource(sourceId);
      if (success) {
        await loadIncomeSources();
      } else {
        setError("Failed to permanently delete income source");
      }
    } catch (err) {
      setError("Failed to permanently delete income source");
      console.error("Error permanently deleting income source:", err);
    }
  };

  const handleEndIncomeSource = async (
    sourceId: string,
    sourceName: string,
    currentEndDate?: string | null
  ) => {
    const isAlreadyEnded =
      currentEndDate && new Date(currentEndDate) <= new Date();

    if (isAlreadyEnded) {
      // If already ended, offer to remove end date (reactivate)
      if (
        !confirm(
          `"${sourceName}" has already ended. Do you want to remove the end date and make it ongoing again?`
        )
      ) {
        return;
      }

      try {
        const success = await updateIncomeSource(sourceId, {
          end_date: null,
          updated_at: new Date().toISOString(),
        });
        if (success) {
          await loadIncomeSources();
        } else {
          setError("Failed to remove end date");
        }
      } catch (err) {
        setError("Failed to remove end date");
        console.error("Error removing end date:", err);
      }
    } else {
      // If ongoing, ask for end date
      const endDate = prompt(
        `Set end date for "${sourceName}"\n\nEnter the date this income source ended (YYYY-MM-DD):`
      );

      if (!endDate) return; // User cancelled

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        setError("Invalid date format. Please use YYYY-MM-DD format.");
        return;
      }

      try {
        const success = await updateIncomeSource(sourceId, {
          end_date: endDate,
          updated_at: new Date().toISOString(),
        });
        if (success) {
          await loadIncomeSources();
        } else {
          setError("Failed to set end date");
        }
      } catch (err) {
        setError("Failed to set end date");
        console.error("Error setting end date:", err);
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSource(null);
    loadIncomeSources();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingSource(null);
  };

  // Show loading only when auth is loading OR when we have a user but data is loading
  if (authLoading || (user && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading income sources...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <IncomeSourceForm
            incomeSource={editingSource}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Income Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your income sources and track historical changes
              </p>
            </div>
            <Button onClick={handleAddNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Income Source
            </Button>
          </div>
        </div>

        <Tabs defaultValue="sources" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sources">Income Sources</TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-red-600">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      loadIncomeSources();
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Income Sources List */}
            {incomeSources.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No income sources yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Get started by adding your first income source to begin
                      budgeting.
                    </p>
                    <Button
                      onClick={handleAddNew}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Your First Income Source
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {incomeSources.map((source) => (
                  <Card
                    key={source.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{source.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(source)}
                            title="Edit income source"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleEndIncomeSource(
                                source.id,
                                source.name,
                                source.end_date
                              )
                            }
                            className={
                              source.end_date &&
                              new Date(source.end_date) <= new Date()
                                ? "text-green-600 hover:text-green-700"
                                : "text-amber-600 hover:text-amber-700"
                            }
                            title={
                              source.end_date &&
                              new Date(source.end_date) <= new Date()
                                ? "Remove end date (make ongoing)"
                                : "Set end date for this income source"
                            }
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handlePermanentDelete(source.id, source.name)
                            }
                            className="text-red-600 hover:text-red-700"
                            title="Delete permanently (removes all history)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {formatCadence(source.cadence)} • Started{" "}
                        {new Date(source.start_date).toLocaleDateString()}
                        {source.end_date && (
                          <>
                            {" "}
                            • Ended{" "}
                            {new Date(source.end_date).toLocaleDateString()}
                          </>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">
                              Gross Income
                            </p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(source.gross_amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Net Income</p>
                            <p className="text-lg font-semibold text-green-600">
                              {formatCurrency(source.net_amount)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Paid {formatCadence(source.cadence).toLowerCase()}
                          </span>
                        </div>

                        {!source.is_active && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-red-600" />
                              <p className="text-sm text-red-800 font-medium">
                                This income source is inactive
                              </p>
                            </div>
                            <p className="text-xs text-red-600 mt-1">
                              Inactive sources won&apos;t be used in budget
                              calculations
                            </p>
                          </div>
                        )}

                        {source.end_date &&
                          new Date(source.end_date) <= new Date() && (
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-amber-600" />
                                <p className="text-sm text-amber-800 font-medium">
                                  This income source has ended
                                </p>
                              </div>
                              <p className="text-xs text-amber-600 mt-1">
                                Ended on{" "}
                                {new Date(source.end_date).toLocaleDateString()}
                                . Consider deactivating if no longer relevant.
                              </p>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <IncomeHistory userId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
