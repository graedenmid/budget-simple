// Export all error handling components and utilities
export * from "./types";
export * from "./logger";
export * from "./database-wrapper";

// Re-export the error boundary component
export { ErrorBoundary, useErrorHandler } from "@/components/error-boundary";

// Convenience imports for common use cases
export {
  BudgetError,
  AuthError,
  DatabaseError,
  ValidationError,
  CalculationError,
  PermissionError,
  ErrorCategory,
  ErrorSeverity,
} from "./types";

export { logger, createLogger } from "./logger";
export { db } from "./database-wrapper";
