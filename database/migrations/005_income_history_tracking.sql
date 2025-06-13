-- Budget Simple Income History Tracking
-- Migration: 005_income_history_tracking.sql
-- Description: Comprehensive income history tracking and audit trail

-- ========================================
-- INCOME HISTORY TABLE
-- ========================================

-- Create enum for change types
CREATE TYPE income_change_type AS ENUM (
  'CREATED',
  'UPDATED',
  'ACTIVATED',
  'DEACTIVATED',
  'DELETED'
);

-- Income history table for tracking all changes
CREATE TABLE income_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  change_type income_change_type NOT NULL,
  
  -- Snapshot of income source data at time of change
  name TEXT NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  cadence income_cadence NOT NULL,
  start_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL,
  
  -- Change tracking
  changed_fields TEXT[], -- Array of field names that changed
  previous_values JSONB, -- Previous values for changed fields
  new_values JSONB, -- New values for changed fields
  
  -- Metadata
  change_reason TEXT, -- Optional reason for change
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (gross_amount > 0),
  CHECK (net_amount > 0),
  CHECK (net_amount <= gross_amount)
);

-- ========================================
-- HISTORY TRACKING FUNCTIONS
-- ========================================

-- Function to create income history record
CREATE OR REPLACE FUNCTION create_income_history_record(
    p_income_source_id UUID,
    p_user_id UUID,
    p_change_type income_change_type,
    p_name TEXT,
    p_gross_amount DECIMAL(10,2),
    p_net_amount DECIMAL(10,2),
    p_cadence income_cadence,
    p_start_date DATE,
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
        p_is_active,
        p_changed_fields,
        p_previous_values,
        p_new_values,
        p_change_reason
    ) RETURNING id INTO history_id;
    
    RETURN history_id;
END;
$$ LANGUAGE plpgsql;

-- Function to detect changed fields between old and new income source records
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
    IF old_record.name != new_record.name THEN
        fields := array_append(fields, 'name');
        prev_vals := prev_vals || jsonb_build_object('name', old_record.name);
        new_vals := new_vals || jsonb_build_object('name', new_record.name);
    END IF;
    
    IF old_record.gross_amount != new_record.gross_amount THEN
        fields := array_append(fields, 'gross_amount');
        prev_vals := prev_vals || jsonb_build_object('gross_amount', old_record.gross_amount);
        new_vals := new_vals || jsonb_build_object('gross_amount', new_record.gross_amount);
    END IF;
    
    IF old_record.net_amount != new_record.net_amount THEN
        fields := array_append(fields, 'net_amount');
        prev_vals := prev_vals || jsonb_build_object('net_amount', old_record.net_amount);
        new_vals := new_vals || jsonb_build_object('net_amount', new_record.net_amount);
    END IF;
    
    IF old_record.cadence != new_record.cadence THEN
        fields := array_append(fields, 'cadence');
        prev_vals := prev_vals || jsonb_build_object('cadence', old_record.cadence);
        new_vals := new_vals || jsonb_build_object('cadence', new_record.cadence);
    END IF;
    
    IF old_record.start_date != new_record.start_date THEN
        fields := array_append(fields, 'start_date');
        prev_vals := prev_vals || jsonb_build_object('start_date', old_record.start_date);
        new_vals := new_vals || jsonb_build_object('start_date', new_record.start_date);
    END IF;
    
    IF old_record.is_active != new_record.is_active THEN
        fields := array_append(fields, 'is_active');
        prev_vals := prev_vals || jsonb_build_object('is_active', old_record.is_active);
        new_vals := new_vals || jsonb_build_object('is_active', new_record.is_active);
    END IF;
    
    RETURN QUERY SELECT fields, prev_vals, new_vals;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- AUTOMATIC HISTORY TRACKING TRIGGERS
-- ========================================

-- Trigger function for income source history tracking
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

-- Apply history tracking trigger
CREATE TRIGGER income_source_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON income_sources
    FOR EACH ROW EXECUTE FUNCTION trigger_income_source_history();

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Primary lookup indexes
CREATE INDEX idx_income_history_source_id ON income_history(income_source_id);
CREATE INDEX idx_income_history_user_id ON income_history(user_id);
CREATE INDEX idx_income_history_created_at ON income_history(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_income_history_user_source_date 
ON income_history(user_id, income_source_id, created_at DESC);

CREATE INDEX idx_income_history_user_change_type 
ON income_history(user_id, change_type, created_at DESC);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on income_history table
ALTER TABLE income_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own income history
CREATE POLICY income_history_user_isolation ON income_history
    FOR ALL USING (user_id = auth.uid());

-- ========================================
-- HELPER VIEWS FOR REPORTING
-- ========================================

-- View for income source timeline
CREATE VIEW income_source_timeline AS
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
    END as annual_net_amount
FROM income_history ih
ORDER BY ih.created_at DESC;

-- View for income trends analysis
CREATE VIEW income_trends AS
SELECT 
    user_id,
    income_source_id,
    name,
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as changes_count,
    COUNT(*) FILTER (WHERE change_type = 'UPDATED') as updates_count,
    COUNT(*) FILTER (WHERE change_type = 'ACTIVATED') as activations_count,
    COUNT(*) FILTER (WHERE change_type = 'DEACTIVATED') as deactivations_count,
    AVG(gross_amount) as avg_gross_amount,
    AVG(net_amount) as avg_net_amount,
    MIN(created_at) as first_change,
    MAX(created_at) as last_change
FROM income_history
WHERE change_type IN ('CREATED', 'UPDATED', 'ACTIVATED', 'DEACTIVATED')
GROUP BY user_id, income_source_id, name, DATE_TRUNC('month', created_at)
ORDER BY month DESC, name; 