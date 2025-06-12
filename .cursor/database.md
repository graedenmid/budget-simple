# Database & Supabase Rules

## Database Schema Standards

### Table Naming

- Use snake_case for table and column names
- Use descriptive, singular nouns for table names
- Prefix junction tables with related table names: `user_budget_items`

### Column Standards

- Always include `id` (UUID, primary key)
- Include `created_at` and `updated_at` timestamps
- Use descriptive column names: `gross_amount` not `gross`
- Use consistent data types across similar columns

### Core Tables Structure

```sql
-- users: managed by Supabase Auth
users (
  id UUID PRIMARY KEY,
  email TEXT,
  name TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- income_sources
income_sources (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  cadence income_cadence NOT NULL,
  start_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Row-Level Security (RLS)

### RLS Policy Template

```sql
-- Enable RLS on all tables
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Standard user policy
CREATE POLICY "Users can manage their own data" ON table_name
FOR ALL USING (auth.uid() = user_id);

-- Read-only policy example
CREATE POLICY "Users can view their own data" ON table_name
FOR SELECT USING (auth.uid() = user_id);
```

### Security Rules

- Enable RLS on ALL user data tables
- Never allow direct access without user authentication
- Use `auth.uid()` to filter user-specific data
- Test policies thoroughly before deployment
- Grant minimal permissions required

## Supabase Client Usage

### Client Initialization

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
```

### Type Safety

- Generate TypeScript types from database schema
- Use typed Supabase client: `createClient<Database>`
- Define interfaces for all database operations
- Use proper typing for queries and mutations

### Query Patterns

#### Standard CRUD Operations

```typescript
// Create
const { data, error } = await supabase
  .from("budget_items")
  .insert({
    user_id: userId,
    name: "Rent",
    category: "Bills",
  })
  .select();

// Read with filtering
const { data, error } = await supabase
  .from("budget_items")
  .select("*")
  .eq("user_id", userId)
  .eq("is_active", true);

// Update
const { data, error } = await supabase
  .from("budget_items")
  .update({ name: "Updated Name" })
  .eq("id", itemId)
  .eq("user_id", userId);

// Delete (soft delete preferred)
const { data, error } = await supabase
  .from("budget_items")
  .update({ is_active: false })
  .eq("id", itemId)
  .eq("user_id", userId);
```

#### Complex Queries

```typescript
// Join with related data
const { data, error } = await supabase
  .from("pay_periods")
  .select(
    `
    *,
    allocations (
      *,
      budget_items (
        name,
        category
      )
    )
  `
  )
  .eq("user_id", userId);

// Aggregation queries
const { data, error } = await supabase
  .from("expenses")
  .select("amount.sum()")
  .eq("user_id", userId)
  .gte("date", startDate)
  .lte("date", endDate);
```

## Error Handling

### Database Error Patterns

```typescript
export async function getBudgetItems(userId: string) {
  try {
    const { data, error } = await supabase
      .from("budget_items")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Database error:", error);
      throw new Error("Failed to fetch budget items");
    }

    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    throw error;
  }
}
```

### Error Types to Handle

- Network connectivity issues
- Authentication errors (expired tokens)
- Authorization errors (RLS policy violations)
- Validation errors (constraint violations)
- Rate limiting errors

## Authentication Integration

### User Session Management

```typescript
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

### Protected Route Pattern

```typescript
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <LoginForm />;

  return <>{children}</>;
}
```

## Edge Functions

### Function Structure

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Get user from JWT
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Business logic here

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

## Performance Guidelines

### Query Optimization

- Use indexes on frequently queried columns
- Limit result sets with pagination
- Use select() to fetch only needed columns
- Implement proper caching strategies

### Real-time Features

- Use Supabase Realtime sparingly
- Subscribe only to necessary changes
- Clean up subscriptions properly
- Handle connection errors gracefully

### Connection Management

- Reuse Supabase client instance
- Handle connection pooling appropriately
- Monitor connection limits
- Implement retry logic for failed connections
