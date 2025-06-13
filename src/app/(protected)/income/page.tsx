"use client";

import { useState, useEffect, useCallback } from "react";
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
  Power,
  PowerOff,
  History,
} from "lucide-react";
import { getAllIncomeSourcesForUser } from "@/lib/database/queries";
import {
  deleteIncomeSource,
  toggleIncomeSourceStatus,
} from "@/lib/database/mutations";
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

  const loadIncomeSources = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const sources = await getAllIncomeSourcesForUser(user.id);
      setIncomeSources(sources);
    } catch (err) {
      setError("Failed to load income sources");
      console.error("Error loading income sources:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadIncomeSources();
    }
  }, [user, loadIncomeSources]);

  const handleAddNew = () => {
    setEditingSource(null);
    setShowForm(true);
  };

  const handleEdit = (source: IncomeSource) => {
    setEditingSource(source);
    setShowForm(true);
  };

  const handleDelete = async (sourceId: string) => {
    if (!confirm("Are you sure you want to delete this income source?")) {
      return;
    }

    try {
      const success = await deleteIncomeSource(sourceId);
      if (success) {
        await loadIncomeSources();
      } else {
        setError("Failed to delete income source");
      }
    } catch (err) {
      setError("Failed to delete income source");
      console.error("Error deleting income source:", err);
    }
  };

  const handleToggleStatus = async (
    sourceId: string,
    currentStatus: boolean
  ) => {
    const action = currentStatus ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this income source?`)) {
      return;
    }

    try {
      const success = await toggleIncomeSourceStatus(sourceId, !currentStatus);
      if (success) {
        await loadIncomeSources();
      } else {
        setError(`Failed to ${action} income source`);
      }
    } catch (err) {
      setError(`Failed to ${action} income source`);
      console.error(`Error ${action}ing income source:`, err);
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
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
                <p className="text-sm text-red-600">{error}</p>
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
                            onClick={() =>
                              handleToggleStatus(source.id, source.is_active)
                            }
                            className={
                              source.is_active
                                ? "text-orange-600 hover:text-orange-700"
                                : "text-green-600 hover:text-green-700"
                            }
                            title={
                              source.is_active
                                ? "Deactivate income source"
                                : "Activate income source"
                            }
                          >
                            {source.is_active ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(source)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(source.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {formatCadence(source.cadence)} • Started{" "}
                        {new Date(source.start_date).toLocaleDateString()}
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
                              <PowerOff className="h-4 w-4 text-red-600" />
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
