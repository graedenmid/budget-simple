-- Budget Simple Row-Level Security Policies
-- Migration: 002_row_level_security.sql
-- Description: Implements comprehensive RLS policies for all tables

-- Enable Row-Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Income sources policies
CREATE POLICY "Users can view their own income sources" ON income_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own income sources" ON income_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income sources" ON income_sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income sources" ON income_sources
  FOR DELETE USING (auth.uid() = user_id);

-- Budget items policies
CREATE POLICY "Users can view their own budget items" ON budget_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budget items" ON budget_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget items" ON budget_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget items" ON budget_items
  FOR DELETE USING (auth.uid() = user_id);

-- Pay periods policies
CREATE POLICY "Users can view their own pay periods" ON pay_periods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pay periods" ON pay_periods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pay periods" ON pay_periods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pay periods" ON pay_periods
  FOR DELETE USING (auth.uid() = user_id);

-- Allocations policies (access through related pay_periods)
CREATE POLICY "Users can view allocations for their pay periods" ON allocations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pay_periods 
      WHERE pay_periods.id = allocations.pay_period_id 
      AND pay_periods.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create allocations for their pay periods" ON allocations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pay_periods 
      WHERE pay_periods.id = allocations.pay_period_id 
      AND pay_periods.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update allocations for their pay periods" ON allocations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM pay_periods 
      WHERE pay_periods.id = allocations.pay_period_id 
      AND pay_periods.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete allocations for their pay periods" ON allocations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM pay_periods 
      WHERE pay_periods.id = allocations.pay_period_id 
      AND pay_periods.user_id = auth.uid()
    )
  );

-- Expenses policies
CREATE POLICY "Users can view their own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Suggestions policies (access through related pay_periods)
CREATE POLICY "Users can view suggestions for their pay periods" ON suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pay_periods 
      WHERE pay_periods.id = suggestions.pay_period_id 
      AND pay_periods.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create suggestions for their pay periods" ON suggestions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pay_periods 
      WHERE pay_periods.id = suggestions.pay_period_id 
      AND pay_periods.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update suggestions for their pay periods" ON suggestions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM pay_periods 
      WHERE pay_periods.id = suggestions.pay_period_id 
      AND pay_periods.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete suggestions for their pay periods" ON suggestions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM pay_periods 
      WHERE pay_periods.id = suggestions.pay_period_id 
      AND pay_periods.user_id = auth.uid()
    )
  );

-- Create function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 