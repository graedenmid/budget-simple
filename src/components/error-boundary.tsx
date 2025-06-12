"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "@/lib/error-handling/logger";
import {
  ErrorSeverity,
  ErrorCategory,
  BudgetError,
} from "@/lib/error-handling/types";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: crypto.randomUUID(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to our system
    const budgetError = new BudgetError(
      error.message,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.HIGH,
      "REACT_ERROR_BOUNDARY",
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        stack: error.stack,
      }
    );

    logger.logBudgetError(budgetError);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Something went wrong
                </h3>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                We encountered an unexpected error. Our team has been notified
                and we&apos;re working to fix this.
              </p>
              {this.state.errorId && (
                <p className="text-xs text-gray-400 mt-2">
                  Error ID: {this.state.errorId}
                </p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                className="flex-1 bg-blue-600 border border-transparent rounded-md py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
              <button
                type="button"
                className="flex-1 bg-white border border-gray-300 rounded-md py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => window.history.back()}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to manually report errors
export function useErrorHandler() {
  return (error: Error, context?: Record<string, unknown>) => {
    const budgetError = new BudgetError(
      error.message,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.MEDIUM,
      "MANUAL_ERROR_REPORT",
      context
    );

    logger.logBudgetError(budgetError);
  };
}
