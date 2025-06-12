export enum ErrorCategory {
  AUTH = "auth",
  DATABASE = "database",
  VALIDATION = "validation",
  NETWORK = "network",
  CALCULATION = "calculation",
  PERMISSION = "permission",
  UNKNOWN = "unknown",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  code?: string;
  timestamp: Date;
  userId?: string;
  context?: Record<string, unknown>;
  stack?: string;
}

export interface ErrorLogEntry {
  id: string;
  error: AppError;
  userAgent?: string;
  url?: string;
  resolved: boolean;
  createdAt: Date;
}

export class BudgetError extends Error {
  public readonly id: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly code?: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code?: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "BudgetError";
    this.id = crypto.randomUUID();
    this.category = category;
    this.severity = severity;
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
  }

  toAppError(): AppError {
    return {
      id: this.id,
      category: this.category,
      severity: this.severity,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    };
  }
}

// Predefined error types for common scenarios
export class AuthError extends BudgetError {
  constructor(
    message: string,
    code?: string,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.AUTH, ErrorSeverity.HIGH, code, context);
  }
}

export class DatabaseError extends BudgetError {
  constructor(
    message: string,
    code?: string,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.DATABASE, ErrorSeverity.MEDIUM, code, context);
  }
}

export class ValidationError extends BudgetError {
  constructor(
    message: string,
    code?: string,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.VALIDATION, ErrorSeverity.LOW, code, context);
  }
}

export class CalculationError extends BudgetError {
  constructor(
    message: string,
    code?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      ErrorCategory.CALCULATION,
      ErrorSeverity.HIGH,
      code,
      context
    );
  }
}

export class PermissionError extends BudgetError {
  constructor(
    message: string,
    code?: string,
    context?: Record<string, unknown>
  ) {
    super(message, ErrorCategory.PERMISSION, ErrorSeverity.HIGH, code, context);
  }
}
