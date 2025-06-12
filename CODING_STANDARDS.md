# Budget Simple - Coding Standards

## Overview

This document outlines the coding standards and best practices for the Budget Simple application. All developers must follow these guidelines to ensure code consistency, maintainability, and quality.

## General Principles

### Code Quality

- **Readability First**: Code should be self-documenting and easy to understand
- **Consistency**: Follow established patterns throughout the codebase
- **Simplicity**: Choose simple solutions over complex ones when possible
- **Performance**: Consider performance implications of code decisions
- **Security**: Always consider security implications

### Development Approach

- **File-by-File Changes**: Make incremental changes for easier review
- **TypeScript Strict Mode**: Enable and maintain strict TypeScript settings
- **Error Handling**: Implement comprehensive error handling
- **Testing**: Write tests for critical business logic
- **Documentation**: Document complex logic and business rules

## Project Structure

### Directory Organization

```
budget-simple/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── dashboard/         # Dashboard pages
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Shadcn/ui components
│   ├── forms/            # Form components
│   ├── dashboard/        # Dashboard components
│   ├── budget/           # Budget management
│   ├── income/           # Income management
│   ├── expenses/         # Expense tracking
│   └── common/           # Shared components
├── lib/                  # Utility libraries
│   ├── supabase/         # Supabase client and utilities
│   ├── utils/            # General utilities
│   ├── validations/      # Form validation schemas
│   └── hooks/            # Custom React hooks
├── types/                # TypeScript type definitions
├── public/               # Static assets
└── tests/                # Test files
```

### File Naming Conventions

- **Components**: PascalCase (`BudgetItemCard.tsx`)
- **Pages**: kebab-case (`budget-items.tsx`)
- **Utilities**: camelCase (`formatCurrency.ts`)
- **Types**: PascalCase (`BudgetItem.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)

## TypeScript Standards

### Type Definitions

```typescript
// Use interfaces for object shapes
interface BudgetItem {
  id: string;
  name: string;
  category: BudgetCategory;
  amount: number;
  isActive: boolean;
}

// Use type aliases for unions and primitives
type BudgetCategory = "Bills" | "Savings" | "Debt" | "Giving" | "Discretionary";
type Currency = number; // Always in cents
```

### Function Signatures

```typescript
// Explicit return types for exported functions
export function calculateBudgetTotal(items: BudgetItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

// Use async/await for asynchronous operations
export async function fetchBudgetItems(userId: string): Promise<BudgetItem[]> {
  // Implementation
}
```

### Error Handling

```typescript
// Custom error types
export class BudgetValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = "BudgetValidationError";
  }
}

// Proper error handling in functions
export async function createBudgetItem(
  item: CreateBudgetItemRequest
): Promise<BudgetItem> {
  try {
    // Validation
    if (!item.name.trim()) {
      throw new BudgetValidationError("Name is required", "name");
    }

    // Database operation
    const result = await supabase.from("budget_items").insert(item);

    if (result.error) {
      throw new Error(`Database error: ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    console.error("Failed to create budget item:", error);
    throw error;
  }
}
```

## React Component Standards

### Component Structure

```typescript
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface BudgetItemCardProps {
  item: BudgetItem;
  onEdit?: (item: BudgetItem) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function BudgetItemCard({
  item,
  onEdit,
  onDelete,
  className,
}: BudgetItemCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = () => {
    onEdit?.(item);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete?.(item.id);
    } catch (error) {
      console.error("Failed to delete item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("p-4 border rounded-lg", className)}>
      <h3 className="font-semibold">{item.name}</h3>
      <p className="text-sm text-muted-foreground">{item.category}</p>
      <p className="font-mono">{formatCurrency(item.amount)}</p>

      <div className="flex gap-2 mt-4">
        <Button onClick={handleEdit} variant="outline" size="sm">
          Edit
        </Button>
        <Button
          onClick={handleDelete}
          variant="destructive"
          size="sm"
          disabled={isLoading}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
```

### Hooks Guidelines

```typescript
// Custom hook for budget data
export function useBudgetItems(userId: string) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true);
        const data = await getBudgetItems(userId);
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, [userId]);

  return { items, loading, error, refetch: () => fetchItems() };
}
```

## Styling Standards

### Tailwind CSS Usage

```typescript
// Group related classes logically
<div
  className="
  flex items-center justify-between
  p-4 mb-4
  bg-white dark:bg-gray-800
  border border-gray-200 dark:border-gray-700
  rounded-lg shadow-sm
"
>
  <span className="text-lg font-semibold text-gray-900 dark:text-white">
    {title}
  </span>
</div>;

// Use consistent spacing scale
const SPACING = {
  xs: "p-2",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
  xl: "p-12",
};
```

### Responsive Design

```typescript
// Mobile-first responsive design
<div
  className="
  grid grid-cols-1 gap-4
  sm:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-4
"
>
  {items.map((item) => (
    <BudgetItemCard key={item.id} item={item} />
  ))}
</div>
```

## Database Standards

### Query Patterns

```typescript
// Always include error handling
export async function getBudgetItems(userId: string): Promise<BudgetItem[]> {
  const { data, error } = await supabase
    .from("budget_items")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch budget items: ${error.message}`);
  }

  return data || [];
}

// Use transactions for related operations
export async function createPayPeriodWithAllocations(
  payPeriod: CreatePayPeriodRequest,
  allocations: CreateAllocationRequest[]
): Promise<PayPeriod> {
  const { data, error } = await supabase.rpc(
    "create_pay_period_with_allocations",
    {
      pay_period: payPeriod,
      allocations: allocations,
    }
  );

  if (error) {
    throw new Error(`Failed to create pay period: ${error.message}`);
  }

  return data;
}
```

## Testing Standards

### Unit Tests

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { BudgetItemCard } from "./BudgetItemCard";

describe("BudgetItemCard", () => {
  const mockItem: BudgetItem = {
    id: "1",
    name: "Rent",
    category: "Bills",
    amount: 150000, // $1,500.00 in cents
    isActive: true,
  };

  it("displays budget item information correctly", () => {
    render(<BudgetItemCard item={mockItem} />);

    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Bills")).toBeInTheDocument();
    expect(screen.getByText("$1,500.00")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    const mockOnEdit = jest.fn();
    render(<BudgetItemCard item={mockItem} onEdit={mockOnEdit} />);

    fireEvent.click(screen.getByText("Edit"));
    expect(mockOnEdit).toHaveBeenCalledWith(mockItem);
  });
});
```

## Security Standards

### Input Validation

```typescript
import { z } from "zod";

// Define validation schemas
export const CreateBudgetItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  category: z.enum(["Bills", "Savings", "Debt", "Giving", "Discretionary"]),
  amount: z.number().positive("Amount must be positive"),
  calcType: z.enum(["FIXED", "GROSS_PERCENT", "NET_PERCENT"]),
  value: z.number().positive(),
});

// Validate input in API routes
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CreateBudgetItemSchema.parse(body);

    // Process validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    throw error;
  }
}
```

### Environment Variables

```typescript
// Use environment variables for sensitive config
const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!, // Server-side only
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!,
    environment: process.env.NODE_ENV,
  },
};

// Validate required environment variables
function validateEnvironment() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
```

## Performance Standards

### Optimization Techniques

```typescript
// Use React.memo for expensive components
export const BudgetSummary = React.memo(function BudgetSummary({
  items,
}: {
  items: BudgetItem[];
}) {
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.amount, 0),
    [items]
  );

  return <div>Total: {formatCurrency(total)}</div>;
});

// Implement proper loading states
export function BudgetItemsList() {
  const { items, loading, error } = useBudgetItems();

  if (loading) return <BudgetItemsSkeleton />;
  if (error) return <ErrorMessage message={error} />;
  if (items.length === 0) return <EmptyState />;

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <BudgetItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

## Documentation Standards

### Code Comments

```typescript
/**
 * Calculates the total allocation amount for a pay period based on budget items
 * and their calculation types (fixed amount vs percentage of income).
 *
 * @param budgetItems - Array of budget items to calculate allocations for
 * @param grossIncome - Gross income for the pay period
 * @param netIncome - Net income for the pay period
 * @returns Object containing individual allocations and total amount
 */
export function calculatePayPeriodAllocations(
  budgetItems: BudgetItem[],
  grossIncome: number,
  netIncome: number
): PayPeriodAllocation {
  // Implementation with inline comments for complex logic
}
```

### README Documentation

- Keep README.md updated with setup instructions
- Document environment variables required
- Include examples of common development tasks
- Maintain changelog for significant updates

This coding standards document should be referenced throughout development and updated as the project evolves.
