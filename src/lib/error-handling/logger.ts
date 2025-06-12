import { createClient } from "@/lib/supabase/client";
import { AppError, ErrorLogEntry, ErrorSeverity, BudgetError } from "./types";

export interface LoggerConfig {
  enableConsoleLogging: boolean;
  enableDatabaseLogging: boolean;
  enableRemoteLogging: boolean;
  logLevel: ErrorSeverity;
}

class Logger {
  private config: LoggerConfig;
  private supabase = createClient();

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      enableConsoleLogging: process.env.NODE_ENV === "development",
      enableDatabaseLogging: true,
      enableRemoteLogging: process.env.NODE_ENV === "production",
      logLevel: ErrorSeverity.LOW,
      ...config,
    };
  }

  private shouldLog(severity: ErrorSeverity): boolean {
    const severityLevels = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 1,
      [ErrorSeverity.HIGH]: 2,
      [ErrorSeverity.CRITICAL]: 3,
    };

    return severityLevels[severity] >= severityLevels[this.config.logLevel];
  }

  async logError(error: AppError, userId?: string): Promise<void> {
    if (!this.shouldLog(error.severity)) {
      return;
    }

    // Enhanced error with user context
    const enhancedError: AppError = {
      ...error,
      userId: userId || error.userId,
    };

    // Console logging for development
    if (this.config.enableConsoleLogging) {
      this.logToConsole(enhancedError);
    }

    // Database logging for persistence
    if (this.config.enableDatabaseLogging) {
      await this.logToDatabase(enhancedError);
    }

    // Remote logging for production monitoring
    if (this.config.enableRemoteLogging) {
      await this.logToRemote(enhancedError);
    }
  }

  private logToConsole(error: AppError): void {
    const logMethod = this.getConsoleMethod(error.severity);
    const timestamp = error.timestamp.toISOString();

    logMethod(
      `[${timestamp}] ${error.category.toUpperCase()}: ${error.message}`,
      {
        id: error.id,
        code: error.code,
        context: error.context,
        stack: error.stack,
      }
    );
  }

  private getConsoleMethod(severity: ErrorSeverity) {
    switch (severity) {
      case ErrorSeverity.LOW:
        return console.info;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  private async logToDatabase(error: AppError): Promise<void> {
    try {
      const logEntry = {
        error_id: error.id,
        category: error.category,
        severity: error.severity,
        message: error.message,
        details: error.details,
        code: error.code,
        user_id: error.userId,
        context: error.context,
        stack: error.stack,
        user_agent:
          typeof window !== "undefined" ? window.navigator.userAgent : null,
        url: typeof window !== "undefined" ? window.location.href : null,
        resolved: false,
        occurred_at: error.timestamp.toISOString(),
      };

      const { error: dbError } = await this.supabase
        .from("error_logs")
        .insert(logEntry);

      if (dbError) {
        console.error("Failed to log error to database:", dbError);
      }
    } catch (dbError) {
      console.error("Database logging failed:", dbError);
    }
  }

  private async logToRemote(error: AppError): Promise<void> {
    try {
      // In production, you might want to send to external monitoring services
      // like Sentry, LogRocket, or custom analytics endpoints

      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        // Sentry integration would go here
        console.log("Would send to Sentry:", error);
      }

      // Custom remote logging endpoint
      if (process.env.NEXT_PUBLIC_LOGGING_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_LOGGING_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(error),
        });
      }
    } catch (remoteError) {
      console.error("Remote logging failed:", remoteError);
    }
  }

  // Convenience methods for different error types
  async logBudgetError(
    budgetError: BudgetError,
    userId?: string
  ): Promise<void> {
    await this.logError(budgetError.toAppError(), userId);
  }

  async logUnhandledError(
    error: Error,
    userId?: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    const budgetError = new BudgetError(
      error.message,
      undefined,
      ErrorSeverity.HIGH,
      undefined,
      {
        originalError: error.name,
        stack: error.stack,
        ...context,
      }
    );

    await this.logBudgetError(budgetError, userId);
  }

  // Method to retrieve error logs for admin/debugging
  async getErrorLogs(userId?: string, limit = 50): Promise<ErrorLogEntry[]> {
    try {
      let query = this.supabase
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq("error->userId", userId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to retrieve error logs: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Failed to retrieve error logs:", error);
      return [];
    }
  }

  // Method to mark errors as resolved
  async markErrorResolved(errorId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("error_logs")
        .update({ resolved: true })
        .eq("error->id", errorId);

      if (error) {
        throw new Error(`Failed to mark error as resolved: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to mark error as resolved:", error);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export factory function for custom configurations
export const createLogger = (config?: Partial<LoggerConfig>) =>
  new Logger(config);
