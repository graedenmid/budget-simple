# Budget Simple Database Schema

This directory contains the database schema and migration files for the Budget Simple application.

## Schema Overview

The Budget Simple database consists of the following core tables:

### Core Tables

1. **users** - User profiles (extends Supabase auth.users)
2. **income_sources** - User income sources with cadence settings
3. **budget_items** - Budget line items with calculation rules
4. **pay_periods** - Paycheck cycles and allocation periods
5. **allocations** - Budget item allocations per pay period
6. **expenses** - Tracked spending and categorization
7. **suggestions** - System-generated allocation recommendations

### Key Features

- **Row-Level Security (RLS)** enabled on all tables
- **Automatic user profile creation** when auth user is created
- **Comprehensive indexes** for optimal query performance
- **Data validation** with CHECK constraints
- **Automatic timestamp updates** via triggers
- **Foreign key constraints** to maintain data integrity

## Migrations

### 001_create_core_schema.sql

Creates all core tables, enums, indexes, and triggers.

### 002_row_level_security.sql

Implements comprehensive RLS policies for data isolation.

## Applying Migrations

### Option 1: Supabase Dashboard (Recommended for initial setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of each migration file
4. Execute them in order (001, then 002)

### Option 2: Supabase CLI (For future migrations)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

## Schema Verification

After applying migrations, verify the setup:

```sql
-- Check that all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';

-- Check that RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check that enums are created
SELECT typname FROM pg_type
WHERE typtype = 'e';
```

## Data Model Relationships

```
auth.users (Supabase)
    ↓
users (profile)
    ↓
income_sources ← pay_periods → allocations → budget_items
    ↓                ↓
expenses        suggestions
```

## Important Notes

- All monetary values are stored as DECIMAL(10,2) for precision
- Dates are stored as DATE type for day-level precision
- UUIDs are used for all primary keys
- Array fields (depends_on) support budget item dependencies
- Triggers automatically update timestamps on all tables

## Security

- **RLS policies** ensure users can only access their own data
- **Foreign key constraints** prevent orphaned records
- **CHECK constraints** validate data integrity
- **Automatic user profile creation** via trigger on auth.users
