-- Budget Simple Income Source End Date Enhancement
-- Migration: 006_add_income_source_end_date.sql
-- Description: Add end_date field to income_sources to support job transitions and contract work

-- ========================================
-- ADD END_DATE COLUMN
-- ========================================

-- Add end_date column to income_sources table
ALTER TABLE income_sources 
ADD COLUMN end_date DATE;

-- ========================================
-- UPDATE INCOME HISTORY TABLE
-- ========================================

-- Add end_date to income_history table to track end date changes
ALTER TABLE income_history 
ADD COLUMN end_date DATE;

-- ========================================
-- UPDATE HISTORY TRACKING FUNCTIONS
-- ========================================

-- Update the create_income_history_record function to include end_date
CREATE OR REPLACE FUNCTION create_income_history_record(
    p_income_source_id UUID,
    p_user_id UUID,
    p_change_type income_change_type,
    p_name TEXT,
    p_gross_amount DECIMAL(10,2),
    p_net_amount DECIMAL(10,2),
    p_cadence income_cadence,
    p_start_date DATE,
    p_end_date DATE DEFAULT NULL,
    p_is_active BOOLEAN,
    p_changed_fields TEXT[] DEFAULT NULL,
    p_previous_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    history_id UUID;
BEGIN
    INSERT INTO income_history (
        income_source_id,
        user_id,
        change_type,
        name,
        gross_amount,
        net_amount,
        cadence,
        start_date,
        end_date,
        is_active,
        changed_fields,
        previous_values,
        new_values,
        change_reason
    ) VALUES (
        p_income_source_id,
        p_user_id,
        p_change_type,
        p_name,
        p_gross_amount,
        p_net_amount,
        p_cadence,
        p_start_date,
        p_end_date,
        p_is_active,
        p_changed_fields,
        p_previous_values,
        p_new_values,
        p_change_reason
    ) RETURNING id INTO history_id;
    
    RETURN history_id;
END;
$$ LANGUAGE plpgsql;

-- Update the detect_income_changes function to include end_date
CREATE OR REPLACE FUNCTION detect_income_changes(
    old_record income_sources,
    new_record income_sources
)
RETURNS TABLE (
    changed_fields TEXT[],
    previous_values JSONB,
    new_values JSONB
) AS $$
DECLARE
    fields TEXT[] := '{}';
    prev_vals JSONB := '{}';
    new_vals JSONB := '{}';
BEGIN
    -- Check each field for changes
    IF old_record.name IS DISTINCT FROM new_record.name THEN
        fields := array_append(fields, 'name');
        prev_vals := prev_vals || jsonb_build_object('name', old_record.name);
        new_vals := new_vals || jsonb_build_object('name', new_record.name);
    END IF;
    
    IF old_record.gross_amount IS DISTINCT FROM new_record.gross_amount THEN
        fields := array_append(fields, 'gross_amount');
        prev_vals := prev_vals || jsonb_build_object('gross_amount', old_record.gross_amount);
        new_vals := new_vals || jsonb_build_object('gross_amount', new_record.gross_amount);
    END IF;
    
    IF old_record.net_amount IS DISTINCT FROM new_record.net_amount THEN
        fields := array_append(fields, 'net_amount');
        prev_vals := prev_vals || jsonb_build_object('net_amount', old_record.net_amount);
        new_vals := new_vals || jsonb_build_object('net_amount', new_record.net_amount);
    END IF;
    
    IF old_record.cadence IS DISTINCT FROM new_record.cadence THEN
        fields := array_append(fields, 'cadence');
        prev_vals := prev_vals || jsonb_build_object('cadence', old_record.cadence);
        new_vals := new_vals || jsonb_build_object('cadence', new_record.cadence);
    END IF;
    
    IF old_record.start_date IS DISTINCT FROM new_record.start_date THEN
        fields := array_append(fields, 'start_date');
        prev_vals := prev_vals || jsonb_build_object('start_date', old_record.start_date);
        new_vals := new_vals || jsonb_build_object('start_date', new_record.start_date);
    END IF;
    
    -- NEW: Check end_date for changes
    IF old_record.end_date IS DISTINCT FROM new_record.end_date THEN
        fields := array_append(fields, 'end_date');
        prev_vals := prev_vals || jsonb_build_object('end_date', old_record.end_date);
        new_vals := new_vals || jsonb_build_object('end_date', new_record.end_date);
    END IF;
    
    IF old_record.is_active IS DISTINCT FROM new_record.is_active THEN
        fields := array_append(fields, 'is_active');
        prev_vals := prev_vals || jsonb_build_object('is_active', old_record.is_active);
        new_vals := new_vals || jsonb_build_object('is_active', new_record.is_active);
    END IF;
    
    RETURN QUERY SELECT fields, prev_vals, new_vals;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to include end_date
CREATE OR REPLACE FUNCTION trigger_income_source_history()
RETURNS TRIGGER AS $$
DECLARE
    change_type income_change_type;
    changed_fields TEXT[];
    previous_values JSONB;
    new_values JSONB;
    change_detection RECORD;
BEGIN
    -- Determine change type
    IF TG_OP = 'INSERT' THEN
        change_type := 'CREATED';
        changed_fields := NULL;
        previous_values := NULL;
        new_values := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Detect specific change type for updates
        IF OLD.is_active = true AND NEW.is_active = false THEN
            change_type := 'DEACTIVATED';
        ELSIF OLD.is_active = false AND NEW.is_active = true THEN
            change_type := 'ACTIVATED';
        ELSE
            change_type := 'UPDATED';
        END IF;
        
        -- Detect changed fields
        SELECT * INTO change_detection FROM detect_income_changes(OLD, NEW);
        changed_fields := change_detection.changed_fields;
        previous_values := change_detection.previous_values;
        new_values := change_detection.new_values;
        
        -- Skip history record if no actual changes
        IF array_length(changed_fields, 1) IS NULL THEN
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        change_type := 'DELETED';
        changed_fields := NULL;
        previous_values := NULL;
        new_values := NULL;
        
        -- Create history record for deleted item
        PERFORM create_income_history_record(
            OLD.id,
            OLD.user_id,
            change_type,
            OLD.name,
            OLD.gross_amount,
            OLD.net_amount,
            OLD.cadence,
            OLD.start_date,
            OLD.end_date,
            OLD.is_active,
            changed_fields,
            previous_values,
            new_values,
            'Income source deleted'
        );
        
        RETURN OLD;
    END IF;
    
    -- Create history record for INSERT/UPDATE
    PERFORM create_income_history_record(
        NEW.id,
        NEW.user_id,
        change_type,
        NEW.name,
        NEW.gross_amount,
        NEW.net_amount,
        NEW.cadence,
        NEW.start_date,
        NEW.end_date,
        NEW.is_active,
        changed_fields,
        previous_values,
        new_values,
        CASE 
            WHEN change_type = 'CREATED' THEN 'Income source created'
            WHEN change_type = 'ACTIVATED' THEN 'Income source activated'
            WHEN change_type = 'DEACTIVATED' THEN 'Income source deactivated'
            ELSE 'Income source updated'
        END
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- UPDATE VIEWS
-- ========================================

-- Update the income_source_timeline view to include end_date
CREATE OR REPLACE VIEW income_source_timeline AS
SELECT 
    ih.id,
    ih.income_source_id,
    ih.user_id,
    ih.change_type,
    ih.name,
    ih.gross_amount,
    ih.net_amount,
    ih.cadence,
    ih.start_date,
    ih.end_date,
    ih.is_active,
    ih.changed_fields,
    ih.previous_values,
    ih.new_values,
    ih.change_reason,
    ih.created_at,
    -- Calculate annual amounts for comparison
    CASE ih.cadence
        WHEN 'weekly' THEN ih.gross_amount * 52
        WHEN 'bi-weekly' THEN ih.gross_amount * 26
        WHEN 'semi-monthly' THEN ih.gross_amount * 24
        WHEN 'monthly' THEN ih.gross_amount * 12
        WHEN 'quarterly' THEN ih.gross_amount * 4
        WHEN 'annual' THEN ih.gross_amount
    END as annual_gross_amount,
    CASE ih.cadence
        WHEN 'weekly' THEN ih.net_amount * 52
        WHEN 'bi-weekly' THEN ih.net_amount * 26
        WHEN 'semi-monthly' THEN ih.net_amount * 24
        WHEN 'monthly' THEN ih.net_amount * 12
        WHEN 'quarterly' THEN ih.net_amount * 4
        WHEN 'annual' THEN ih.net_amount
    END as annual_net_amount,
    -- Add helper fields for date analysis
    CASE 
        WHEN ih.end_date IS NULL THEN 'ONGOING'
        WHEN ih.end_date > CURRENT_DATE THEN 'FUTURE_END'
        ELSE 'ENDED'
    END as status,
    CASE 
        WHEN ih.end_date IS NOT NULL THEN 
            ih.end_date - ih.start_date
        ELSE 
            CURRENT_DATE - ih.start_date
    END as duration_days
FROM income_history ih
ORDER BY ih.created_at DESC;

-- ========================================
-- INDEXES
-- ========================================

-- Add index for end_date queries
CREATE INDEX idx_income_sources_end_date ON income_sources(end_date) WHERE end_date IS NOT NULL;
CREATE INDEX idx_income_sources_active_dates ON income_sources(start_date, end_date, is_active);
CREATE INDEX idx_income_history_end_date ON income_history(end_date) WHERE end_date IS NOT NULL;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

-- This migration adds comprehensive end_date support to the income management system
-- allowing users to track job transitions, contract endings, and other income changes
-- while maintaining full audit history and backward compatibility. 