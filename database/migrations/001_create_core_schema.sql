-- Budget Simple Core Database Schema
-- Migration: 001_create_core_schema.sql
-- Description: Creates all core tables, enums, and constraints for Budget Simple application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom enums
CREATE TYPE income_cadence AS ENUM (
  'weekly',
  'bi-weekly', 
  'semi-monthly',
  'monthly',
  'quarterly',
  'annual'
);

CREATE TYPE budget_category AS ENUM (
  'Bills',
  'Savings', 
  'Debt',
  'Giving',
  'Discretionary',
  'Other'
);

CREATE TYPE calc_type AS ENUM (
  'FIXED',
  'GROSS_PERCENT',
  'NET_PERCENT', 
  'REMAINING_PERCENT'
);

CREATE TYPE pay_period_status AS ENUM (
  'ACTIVE',
  'COMPLETED'
);

CREATE TYPE allocation_status AS ENUM (
  'PAID',
  'UNPAID'
);

CREATE TYPE expense_type AS ENUM (
  'BUDGET_PAYMENT',
  'EXPENSE'
);

CREATE TYPE suggestion_status AS ENUM (
  'PENDING',
  'APPLIED'
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Income sources table
CREATE TABLE income_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL CHECK (gross_amount > 0),
  net_amount DECIMAL(10,2) NOT NULL CHECK (net_amount > 0 AND net_amount <= gross_amount),
  cadence income_cadence NOT NULL,
  start_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget items table
CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category budget_category NOT NULL,
  calc_type calc_type NOT NULL,
  value DECIMAL(10,2) NOT NULL CHECK (value > 0),
  cadence income_cadence NOT NULL,
  depends_on UUID[] DEFAULT NULL, -- Array of budget_item IDs for dependencies
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pay periods table
CREATE TABLE pay_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  expected_net DECIMAL(10,2) NOT NULL CHECK (expected_net > 0),
  actual_net DECIMAL(10,2) CHECK (actual_net >= 0),
  status pay_period_status DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure end_date is after start_date
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Allocations table (budget item allocations per pay period)
CREATE TABLE allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
  budget_item_id UUID NOT NULL REFERENCES budget_items(id) ON DELETE CASCADE,
  expected_amount DECIMAL(10,2) NOT NULL CHECK (expected_amount >= 0),
  actual_amount DECIMAL(10,2) CHECK (actual_amount >= 0),
  status allocation_status DEFAULT 'UNPAID',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate allocations for same budget item in same pay period
  UNIQUE(pay_period_id, budget_item_id)
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pay_period_id UUID REFERENCES pay_periods(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  budget_item_id UUID REFERENCES budget_items(id) ON DELETE SET NULL,
  type expense_type NOT NULL DEFAULT 'EXPENSE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suggestions table (for surplus allocation recommendations)
CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'savings', 'debt', 'buffer', etc.
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status suggestion_status DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_income_sources_user_id ON income_sources(user_id);
CREATE INDEX idx_income_sources_active ON income_sources(user_id, is_active);

CREATE INDEX idx_budget_items_user_id ON budget_items(user_id);
CREATE INDEX idx_budget_items_active ON budget_items(user_id, is_active);
CREATE INDEX idx_budget_items_category ON budget_items(user_id, category);

CREATE INDEX idx_pay_periods_user_id ON pay_periods(user_id);
CREATE INDEX idx_pay_periods_status ON pay_periods(user_id, status);
CREATE INDEX idx_pay_periods_dates ON pay_periods(user_id, start_date, end_date);

CREATE INDEX idx_allocations_pay_period ON allocations(pay_period_id);
CREATE INDEX idx_allocations_budget_item ON allocations(budget_item_id);
CREATE INDEX idx_allocations_status ON allocations(pay_period_id, status);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_pay_period ON expenses(pay_period_id);
CREATE INDEX idx_expenses_date ON expenses(user_id, date);
CREATE INDEX idx_expenses_category ON expenses(user_id, category);

CREATE INDEX idx_suggestions_pay_period ON suggestions(pay_period_id);
CREATE INDEX idx_suggestions_status ON suggestions(pay_period_id, status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_income_sources_updated_at BEFORE UPDATE ON income_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_items_updated_at BEFORE UPDATE ON budget_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pay_periods_updated_at BEFORE UPDATE ON pay_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_allocations_updated_at BEFORE UPDATE ON allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suggestions_updated_at BEFORE UPDATE ON suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 