import type {
  ExpenseCreateData,
  ExpenseUpdateData,
  ExpenseValidationResult,
} from "@/lib/types/expenses";
import {
  EXPENSE_CATEGORIES,
  getCategoryGroup,
} from "@/lib/constants/expense-categories";

/**
 * Validates expense amount based on category and context
 */
export function validateExpenseAmount(
  amount: number,
  category: string,
  context?: {
    isRecurring?: boolean;
    userBudgetLimit?: number;
    categoryLimit?: number;
  }
): ExpenseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic amount validation
  if (amount <= 0) {
    errors.push("Amount must be greater than zero");
  }

  if (amount > 999999.99) {
    errors.push("Amount exceeds maximum allowed value");
  }

  // Category-specific validation
  const categoryGroup = getCategoryGroup(category);

  // Warn for unusually high amounts in certain categories
  const highAmountThresholds: Record<string, number> = {
    [EXPENSE_CATEGORIES.COFFEE]: 50,
    [EXPENSE_CATEGORIES.GROCERIES]: 500,
    [EXPENSE_CATEGORIES.DINING_OUT]: 200,
    [EXPENSE_CATEGORIES.ENTERTAINMENT]: 300,
    [EXPENSE_CATEGORIES.FUEL]: 200,
    [EXPENSE_CATEGORIES.UTILITIES]: 1000,
  };

  const threshold = highAmountThresholds[category];
  if (threshold && amount > threshold) {
    warnings.push(`Amount seems high for ${category} category (>${threshold})`);
  }

  // Budget limit validation
  if (context?.userBudgetLimit && amount > context.userBudgetLimit) {
    warnings.push("Amount exceeds your typical budget for this category");
  }

  if (context?.categoryLimit && amount > context.categoryLimit) {
    warnings.push("Amount exceeds the limit set for this category");
  }

  // Recurring expense validation
  if (
    context?.isRecurring &&
    categoryGroup === "DISCRETIONARY" &&
    amount > 100
  ) {
    warnings.push(
      "High recurring discretionary expenses may impact your budget"
    );
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates expense date for business logic rules
 */
export function validateExpenseDate(
  date: string,
  context?: {
    payPeriodStart?: string;
    payPeriodEnd?: string;
    isRecurring?: boolean;
  }
): ExpenseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const expenseDate = new Date(date);
  const today = new Date();

  // Basic date validation
  if (isNaN(expenseDate.getTime())) {
    errors.push("Invalid date format");
    return { is_valid: false, errors, warnings };
  }

  // Future date check
  if (expenseDate > today) {
    errors.push("Expense date cannot be in the future");
  }

  // Very old date check
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (expenseDate < oneYearAgo) {
    warnings.push("Expense date is more than a year old");
  }

  // Pay period validation
  if (context?.payPeriodStart && context?.payPeriodEnd) {
    const payPeriodStart = new Date(context.payPeriodStart);
    const payPeriodEnd = new Date(context.payPeriodEnd);

    if (expenseDate < payPeriodStart || expenseDate > payPeriodEnd) {
      warnings.push("Expense date is outside the selected pay period");
    }
  }

  // Weekend spending pattern check
  const dayOfWeek = expenseDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend && context?.isRecurring) {
    warnings.push("Recurring expenses are typically scheduled on weekdays");
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates expense category consistency and appropriateness
 */
export function validateExpenseCategory(
  category: string,
  description: string,
  amount: number
): ExpenseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if category exists
  if (
    !(Object.values(EXPENSE_CATEGORIES) as readonly string[]).includes(category)
  ) {
    errors.push("Invalid expense category");
    return { is_valid: false, errors, warnings };
  }

  // Description-based category suggestions
  const descriptionLower = description.toLowerCase();

  // Common mismatches
  const categoryKeywords: Record<string, string[]> = {
    [EXPENSE_CATEGORIES.GROCERIES]: [
      "grocery",
      "food",
      "supermarket",
      "walmart",
      "target",
      "costco",
    ],
    [EXPENSE_CATEGORIES.FUEL]: [
      "gas",
      "fuel",
      "shell",
      "exxon",
      "bp",
      "chevron",
    ],
    [EXPENSE_CATEGORIES.DINING_OUT]: [
      "restaurant",
      "pizza",
      "mcdonald",
      "starbucks",
      "cafe",
    ],
    [EXPENSE_CATEGORIES.COFFEE]: ["coffee", "starbucks", "dunkin", "cafe"],
    [EXPENSE_CATEGORIES.HEALTHCARE]: [
      "doctor",
      "hospital",
      "pharmacy",
      "medical",
      "dental",
    ],
    [EXPENSE_CATEGORIES.UTILITIES]: [
      "electric",
      "water",
      "gas bill",
      "internet",
      "phone",
    ],
    [EXPENSE_CATEGORIES.RENT_MORTGAGE]: ["rent", "mortgage", "housing"],
    [EXPENSE_CATEGORIES.INSURANCE_HEALTH]: ["insurance", "premium"],
  };

  // Check if description suggests a different category
  for (const [suggestedCategory, keywords] of Object.entries(
    categoryKeywords
  )) {
    if (suggestedCategory !== category) {
      const hasKeyword = keywords.some((keyword) =>
        descriptionLower.includes(keyword)
      );
      if (hasKeyword) {
        warnings.push(
          `Description suggests this might be a ${suggestedCategory} expense`
        );
        break;
      }
    }
  }

  // Amount-based category validation
  if (category === EXPENSE_CATEGORIES.COFFEE && amount > 20) {
    warnings.push(
      "High amount for coffee - consider if this should be 'Dining Out'"
    );
  }

  if (category === EXPENSE_CATEGORIES.GROCERIES && amount < 5) {
    warnings.push(
      "Low amount for groceries - consider if this should be a different category"
    );
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates expense description for completeness and clarity
 */
export function validateExpenseDescription(
  description: string,
  amount: number
): ExpenseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!description || description.trim().length === 0) {
    errors.push("Description is required");
    return { is_valid: false, errors, warnings };
  }

  const trimmedDescription = description.trim();

  // Length validation
  if (trimmedDescription.length < 3) {
    warnings.push("Description is very short - consider adding more details");
  }

  if (trimmedDescription.length > 200) {
    warnings.push("Description is very long - consider condensing");
  }

  // Quality checks
  if (trimmedDescription === trimmedDescription.toUpperCase()) {
    warnings.push("Consider using proper capitalization");
  }

  // Vague descriptions
  const vagueDescriptions = [
    "expense",
    "payment",
    "purchase",
    "item",
    "stuff",
    "thing",
    "misc",
    "other",
  ];

  if (
    vagueDescriptions.some(
      (vague) =>
        trimmedDescription.toLowerCase().includes(vague) &&
        trimmedDescription.length < 20
    )
  ) {
    warnings.push(
      "Description is vague - consider adding more specific details"
    );
  }

  // High-amount expenses should have detailed descriptions
  if (amount > 100 && trimmedDescription.length < 10) {
    warnings.push("High-amount expenses should have detailed descriptions");
  }

  // Check for missing merchant information
  if (
    amount > 50 &&
    !trimmedDescription.includes("@") &&
    !trimmedDescription.match(
      /\b[A-Z][a-z]+\s*(Store|Market|Shop|Restaurant|Cafe)\b/i
    )
  ) {
    warnings.push("Consider including merchant name for better tracking");
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Comprehensive expense validation combining all validation rules
 */
export function validateExpenseComprehensive(
  expenseData: ExpenseCreateData | ExpenseUpdateData,
  context?: {
    payPeriodStart?: string;
    payPeriodEnd?: string;
    userBudgetLimit?: number;
    categoryLimit?: number;
    isRecurring?: boolean;
    existingExpenses?: Array<{
      amount: number;
      date: string;
      description: string;
      category: string;
    }>;
  }
): ExpenseValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate individual fields if they exist
  if (expenseData.amount !== undefined) {
    const amountValidation = validateExpenseAmount(
      expenseData.amount,
      expenseData.category || "",
      {
        isRecurring: context?.isRecurring,
        userBudgetLimit: context?.userBudgetLimit,
        categoryLimit: context?.categoryLimit,
      }
    );
    allErrors.push(...amountValidation.errors);
    allWarnings.push(...amountValidation.warnings);
  }

  if (expenseData.date) {
    const dateValidation = validateExpenseDate(expenseData.date, {
      payPeriodStart: context?.payPeriodStart,
      payPeriodEnd: context?.payPeriodEnd,
      isRecurring: context?.isRecurring,
    });
    allErrors.push(...dateValidation.errors);
    allWarnings.push(...dateValidation.warnings);
  }

  if (expenseData.category && expenseData.description) {
    const categoryValidation = validateExpenseCategory(
      expenseData.category,
      expenseData.description,
      expenseData.amount || 0
    );
    allErrors.push(...categoryValidation.errors);
    allWarnings.push(...categoryValidation.warnings);
  }

  if (expenseData.description) {
    const descriptionValidation = validateExpenseDescription(
      expenseData.description,
      expenseData.amount || 0
    );
    allErrors.push(...descriptionValidation.errors);
    allWarnings.push(...descriptionValidation.warnings);
  }

  // Business logic validations
  if (expenseData.type === "BUDGET_PAYMENT" && !expenseData.budget_item_id) {
    allErrors.push("Budget payments must be linked to a budget item");
  }

  if (expenseData.budget_item_id && expenseData.type !== "BUDGET_PAYMENT") {
    allWarnings.push(
      "Expenses linked to budget items should typically be marked as budget payments"
    );
  }

  // Spending pattern analysis
  if (context?.existingExpenses && expenseData.amount && expenseData.category) {
    const categoryExpenses = context.existingExpenses.filter(
      (e) => e.category === expenseData.category
    );
    const averageAmount =
      categoryExpenses.length > 0
        ? categoryExpenses.reduce((sum, e) => sum + e.amount, 0) /
          categoryExpenses.length
        : 0;

    if (averageAmount > 0 && expenseData.amount > averageAmount * 2) {
      allWarnings.push(
        `Amount is significantly higher than your average ${
          expenseData.category
        } expense ($${averageAmount.toFixed(2)})`
      );
    }
  }

  return {
    is_valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Validates bulk expense operations
 */
export function validateBulkExpenseOperation(
  expenses: ExpenseCreateData[],
  options?: {
    maxBatchSize?: number;
    allowDuplicates?: boolean;
  }
): ExpenseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const maxBatchSize = options?.maxBatchSize || 100;

  // Batch size validation
  if (expenses.length === 0) {
    errors.push("No expenses provided");
    return { is_valid: false, errors, warnings };
  }

  if (expenses.length > maxBatchSize) {
    errors.push(`Batch size exceeds maximum allowed (${maxBatchSize})`);
  }

  // Duplicate detection within batch
  if (!options?.allowDuplicates) {
    const duplicates = new Set<string>();
    const seen = new Set<string>();

    expenses.forEach((expense, index) => {
      const key = `${expense.amount}-${expense.date}-${expense.description}`;
      if (seen.has(key)) {
        duplicates.add(`Expense ${index + 1}`);
      }
      seen.add(key);
    });

    if (duplicates.size > 0) {
      warnings.push(
        `Potential duplicates found: ${Array.from(duplicates).join(", ")}`
      );
    }
  }

  // Validate each expense
  let validExpenses = 0;
  expenses.forEach((expense, index) => {
    const validation = validateExpenseComprehensive(expense);
    if (validation.is_valid) {
      validExpenses++;
    } else {
      errors.push(`Expense ${index + 1}: ${validation.errors.join(", ")}`);
    }
  });

  if (validExpenses === 0) {
    errors.push("No valid expenses in batch");
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}
