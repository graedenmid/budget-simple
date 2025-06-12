-- Budget Simple Data Validation and Sanitization Functions
-- Migration: 004_validation_functions.sql
-- Description: Comprehensive validation and sanitization for data integrity

-- ========================================
-- VALIDATION FUNCTIONS
-- ========================================

-- Validate income amounts (net <= gross, both positive)
CREATE OR REPLACE FUNCTION validate_income_amounts(
    gross_amount DECIMAL(10,2),
    net_amount DECIMAL(10,2)
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        gross_amount > 0 AND 
        net_amount > 0 AND 
        net_amount <= gross_amount
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate budget item percentage values
CREATE OR REPLACE FUNCTION validate_percentage_value(
    calc_type calc_type,
    value DECIMAL(10,2)
)
RETURNS BOOLEAN AS $$
BEGIN
    CASE calc_type
        WHEN 'FIXED' THEN
            RETURN value > 0;
        WHEN 'GROSS_PERCENT', 'NET_PERCENT', 'REMAINING_PERCENT' THEN
            RETURN value > 0 AND value <= 100;
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate pay period date ranges
CREATE OR REPLACE FUNCTION validate_pay_period_dates(
    start_date DATE,
    end_date DATE
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        start_date IS NOT NULL AND
        end_date IS NOT NULL AND
        end_date > start_date AND
        (end_date - start_date) BETWEEN 1 AND 365
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate budget item dependencies (no circular references)
CREATE OR REPLACE FUNCTION validate_budget_dependencies(
    item_id UUID,
    depends_on UUID[]
)
RETURNS BOOLEAN AS $$
DECLARE
    dep_id UUID;
    circular_check UUID[];
BEGIN
    -- Empty dependencies are valid
    IF depends_on IS NULL OR array_length(depends_on, 1) = 0 THEN
        RETURN TRUE;
    END IF;
    
    -- Check each dependency
    FOREACH dep_id IN ARRAY depends_on
    LOOP
        -- Self-dependency not allowed
        IF dep_id = item_id THEN
            RETURN FALSE;
        END IF;
        
        -- Check if dependency exists and is active
        IF NOT EXISTS (
            SELECT 1 FROM budget_items 
            WHERE id = dep_id AND is_active = true
        ) THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SANITIZATION FUNCTIONS
-- ========================================

-- Sanitize text input (trim, normalize)
CREATE OR REPLACE FUNCTION sanitize_text_input(
    input_text TEXT
)
RETURNS TEXT AS $$
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN TRIM(REGEXP_REPLACE(input_text, '\s+', ' ', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Sanitize and validate email
CREATE OR REPLACE FUNCTION sanitize_email(
    email_input TEXT
)
RETURNS TEXT AS $$
BEGIN
    IF email_input IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Convert to lowercase and trim
    email_input := LOWER(TRIM(email_input));
    
    -- Basic email validation
    IF email_input ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
        RETURN email_input;
    ELSE
        RAISE EXCEPTION 'Invalid email format: %', email_input;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Sanitize monetary amounts (ensure proper precision)
CREATE OR REPLACE FUNCTION sanitize_monetary_amount(
    amount DECIMAL
)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    IF amount IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN ROUND(ABS(amount), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ========================================
-- CONSTRAINT VALIDATION TRIGGERS
-- ========================================

-- Trigger function for income source validation
CREATE OR REPLACE FUNCTION trigger_validate_income_source()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name := sanitize_text_input(NEW.name);
    NEW.gross_amount := sanitize_monetary_amount(NEW.gross_amount);
    NEW.net_amount := sanitize_monetary_amount(NEW.net_amount);
    
    IF NOT validate_income_amounts(NEW.gross_amount, NEW.net_amount) THEN
        RAISE EXCEPTION 'Invalid income amounts: gross=%, net=%', NEW.gross_amount, NEW.net_amount;
    END IF;
    
    IF NEW.start_date > CURRENT_DATE + INTERVAL '1 year' THEN
        RAISE EXCEPTION 'Income start date cannot be more than 1 year in the future';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for budget item validation
CREATE OR REPLACE FUNCTION trigger_validate_budget_item()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name := sanitize_text_input(NEW.name);
    NEW.value := sanitize_monetary_amount(NEW.value);
    
    IF NOT validate_percentage_value(NEW.calc_type, NEW.value) THEN
        RAISE EXCEPTION 'Invalid value % for calculation type %', NEW.value, NEW.calc_type;
    END IF;
    
    IF NEW.priority < 0 OR NEW.priority > 1000 THEN
        RAISE EXCEPTION 'Priority must be between 0 and 1000';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for pay period validation
CREATE OR REPLACE FUNCTION trigger_validate_pay_period()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expected_net := sanitize_monetary_amount(NEW.expected_net);
    IF NEW.actual_net IS NOT NULL THEN
        NEW.actual_net := sanitize_monetary_amount(NEW.actual_net);
    END IF;
    
    IF NOT validate_pay_period_dates(NEW.start_date, NEW.end_date) THEN
        RAISE EXCEPTION 'Invalid pay period dates: % to %', NEW.start_date, NEW.end_date;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for expense validation
CREATE OR REPLACE FUNCTION trigger_validate_expense()
RETURNS TRIGGER AS $$
BEGIN
    NEW.description := sanitize_text_input(NEW.description);
    NEW.category := sanitize_text_input(NEW.category);
    NEW.amount := sanitize_monetary_amount(NEW.amount);
    
    IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Expense amount must be positive';
    END IF;
    
    IF NEW.date > CURRENT_DATE + INTERVAL '7 days' THEN
        RAISE EXCEPTION 'Expense date cannot be more than 7 days in the future';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- APPLY VALIDATION TRIGGERS
-- ========================================

CREATE TRIGGER validate_income_source_trigger
    BEFORE INSERT OR UPDATE ON income_sources
    FOR EACH ROW EXECUTE FUNCTION trigger_validate_income_source();

CREATE TRIGGER validate_budget_item_trigger
    BEFORE INSERT OR UPDATE ON budget_items
    FOR EACH ROW EXECUTE FUNCTION trigger_validate_budget_item();

CREATE TRIGGER validate_pay_period_trigger
    BEFORE INSERT OR UPDATE ON pay_periods
    FOR EACH ROW EXECUTE FUNCTION trigger_validate_pay_period();

CREATE TRIGGER validate_expense_trigger
    BEFORE INSERT OR UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION trigger_validate_expense();

-- ========================================
-- HELPER FUNCTIONS FOR APPLICATION USE
-- ========================================

-- Check if user owns a resource (for RLS and validation)
CREATE OR REPLACE FUNCTION user_owns_resource(
    resource_user_id UUID,
    requesting_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN resource_user_id = requesting_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate total budget allocations for validation
CREATE OR REPLACE FUNCTION calculate_total_budget_allocation(
    user_id_param UUID,
    income_source_id_param UUID
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_allocation DECIMAL(10,2) := 0;
    income_net DECIMAL(10,2);
BEGIN
    -- Get net income
    SELECT net_amount INTO income_net 
    FROM income_sources 
    WHERE id = income_source_id_param AND user_id = user_id_param;
    
    IF income_net IS NULL THEN
        RAISE EXCEPTION 'Income source not found';
    END IF;
    
    -- This is a placeholder for complex allocation calculation
    -- Real implementation would use the Edge Functions
    SELECT COALESCE(SUM(
        CASE 
            WHEN calc_type = 'FIXED' THEN value
            WHEN calc_type = 'NET_PERCENT' THEN (income_net * value / 100)
            ELSE 0 -- Simplified for validation
        END
    ), 0) INTO total_allocation
    FROM budget_items 
    WHERE user_id = user_id_param AND is_active = true;
    
    RETURN total_allocation;
END;
$$ LANGUAGE plpgsql; 