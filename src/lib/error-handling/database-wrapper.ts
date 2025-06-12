import { createClient } from "@/lib/supabase/client";
import { logger } from "./logger";
import { DatabaseError } from "./types";

type SupabaseResponse<T> = {
  data: T | null;
  error: {
    message: string;
    code?: string;
    details?: string;
  } | null;
};

export class DatabaseOperation {
  private supabase = createClient();

  /**
   * Executes a database operation with automatic error handling and logging
   */
  async execute<T>(
    operation: () => Promise<SupabaseResponse<T>>,
    operationName: string,
    context?: Record<string, unknown>
  ): Promise<{
    data: T | null;
    error: DatabaseError | null;
    success: boolean;
  }> {
    try {
      const result = await operation();

      if (result.error) {
        const dbError = new DatabaseError(
          `Database operation failed: ${operationName}`,
          result.error.code,
          {
            operation: operationName,
            originalError: result.error.message,
            details: result.error.details,
            ...context,
          }
        );

        await logger.logBudgetError(dbError);

        return {
          data: null,
          error: dbError,
          success: false,
        };
      }

      return {
        data: result.data,
        error: null,
        success: true,
      };
    } catch (error) {
      const dbError = new DatabaseError(
        `Unexpected error in database operation: ${operationName}`,
        "UNEXPECTED_ERROR",
        {
          operation: operationName,
          originalError:
            error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          ...context,
        }
      );

      await logger.logBudgetError(dbError);

      return {
        data: null,
        error: dbError,
        success: false,
      };
    }
  }

  /**
   * Executes a query operation with built-in retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<SupabaseResponse<T>>,
    operationName: string,
    maxRetries = 3,
    retryDelay = 1000,
    context?: Record<string, unknown>
  ): Promise<{
    data: T | null;
    error: DatabaseError | null;
    success: boolean;
    attempts: number;
  }> {
    let lastError: DatabaseError | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.execute(operation, operationName, {
        ...context,
        attempt,
        maxRetries,
      });

      if (result.success) {
        return {
          ...result,
          attempts: attempt,
        };
      }

      lastError = result.error;

      // Don't retry on certain error types
      if (result.error && this.shouldNotRetry(result.error)) {
        break;
      }

      // Wait before retrying (except on last attempt)
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * attempt)
        );
      }
    }

    return {
      data: null,
      error: lastError,
      success: false,
      attempts: maxRetries,
    };
  }

  private shouldNotRetry(error: DatabaseError): boolean {
    // Don't retry on validation errors, permission errors, etc.
    const noRetryPatterns = [
      "invalid",
      "unauthorized",
      "forbidden",
      "not found",
      "already exists",
      "constraint",
    ];

    const errorMessage = error.message.toLowerCase();
    return noRetryPatterns.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * Validates operation input before execution
   */
  validateInput(
    input: Record<string, unknown>,
    requiredFields: string[],
    operationName: string
  ): { isValid: boolean; error?: DatabaseError } {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!input[field] && input[field] !== 0 && input[field] !== false) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      const error = new DatabaseError(
        `Missing required fields for ${operationName}: ${missingFields.join(
          ", "
        )}`,
        "VALIDATION_ERROR",
        {
          operation: operationName,
          missingFields,
          providedInput: input,
        }
      );

      return { isValid: false, error };
    }

    return { isValid: true };
  }

  /**
   * Helper method for common CRUD operations
   */
  async insert(
    table: string,
    data: Record<string, unknown>,
    requiredFields: string[] = []
  ) {
    const validation = this.validateInput(
      data,
      requiredFields,
      `INSERT_${table.toUpperCase()}`
    );
    if (!validation.isValid) {
      return {
        data: null,
        error: validation.error,
        success: false,
      };
    }

    return this.execute(
      async () =>
        await this.supabase.from(table).insert(data).select().single(),
      `INSERT_${table.toUpperCase()}`,
      { table, data }
    );
  }

  async update(
    table: string,
    id: string,
    data: Record<string, unknown>,
    idField = "id"
  ) {
    return this.execute(
      async () =>
        await this.supabase
          .from(table)
          .update(data)
          .eq(idField, id)
          .select()
          .single(),
      `UPDATE_${table.toUpperCase()}`,
      { table, id, data, idField }
    );
  }

  async delete(table: string, id: string, idField = "id") {
    return this.execute(
      async () => await this.supabase.from(table).delete().eq(idField, id),
      `DELETE_${table.toUpperCase()}`,
      { table, id, idField }
    );
  }

  async select(
    table: string,
    columns = "*",
    filters?: Record<string, unknown>
  ) {
    return this.execute(
      async () => {
        let query = this.supabase.from(table).select(columns);

        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }

        return await query;
      },
      `SELECT_${table.toUpperCase()}`,
      { table, columns, filters }
    );
  }
}

// Export singleton instance
export const db = new DatabaseOperation();
