-- Strategic Integration Schema for Dira ya Taifa 2050
-- This migration creates the foundation for linking activities to strategic objectives

-- Strategic Objectives (7 Flagships)
CREATE TABLE IF NOT EXISTS strategic_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    vision_statement TEXT,
    priority_level INT CHECK (priority_level >= 1 AND priority_level <= 7),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'planned')),

    -- Metadata for dashboard display
    flagship_badge VARCHAR(255),
    key_focus_areas TEXT, -- JSON array of focus areas
    geographical_focus TEXT, -- Region/area
    estimated_investment_usd DECIMAL(15,2),
    target_completion_year INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    INDEX idx_status (status),
    INDEX idx_priority (priority_level),
    INDEX idx_code (code)
);

-- Foundational Reforms
CREATE TABLE IF NOT EXISTS foundational_reforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    institution_responsible VARCHAR(255),
    issue_addressed TEXT,
    recommendations TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    target_completion_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_status (status)
);

-- Junction: Projects ↔ Strategic Objectives (Many-to-Many)
CREATE TABLE IF NOT EXISTS project_strategic_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    strategic_objective_id UUID NOT NULL,
    contribution_type VARCHAR(50) CHECK (contribution_type IN ('primary', 'secondary', 'supporting')),
    weighting DECIMAL(5,2) DEFAULT 100.00, -- % contribution this project makes to objective
    status VARCHAR(50) DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (strategic_objective_id) REFERENCES strategic_objectives(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_project_objective (project_id, strategic_objective_id),
    INDEX idx_objective (strategic_objective_id),
    INDEX idx_project (project_id)
);

-- Activity Indicator Mappings (How activities feed indicators)
CREATE TABLE IF NOT EXISTS activity_indicator_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL,
    indicator_id UUID NOT NULL,
    contribution_type VARCHAR(50) CHECK (contribution_type IN ('direct', 'indirect', 'supporting')),
    aggregation_method VARCHAR(50) CHECK (aggregation_method IN ('sum', 'average', 'weighted_average', 'count', 'percentage', 'formula')),
    weighting DECIMAL(5,2) DEFAULT 100.00, -- For weighted calculations
    calculation_formula VARCHAR(500), -- Custom formula if needed
    data_element_key VARCHAR(100), -- Maps to activity data field
    enabled BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_activity_indicator (activity_id, indicator_id),
    INDEX idx_indicator (indicator_id),
    INDEX idx_enabled (enabled)
);

-- Performance Data (auto-calculated indicator values)
CREATE TABLE IF NOT EXISTS performance_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_id UUID NOT NULL,
    period VARCHAR(20), -- 'Q1-2024', 'M06-2024', 'FY2024'
    period_start DATE,
    period_end DATE,
    actual_value DECIMAL(20,4),
    previous_value DECIMAL(20,4), -- For tracking changes
    target_value DECIMAL(20,4),
    baseline_value DECIMAL(20,4),
    achievement_percentage DECIMAL(5,2), -- (actual/target) * 100
    data_source VARCHAR(50) CHECK (data_source IN ('manual_entry', 'auto_calculated', 'imported')),
    source_activities TEXT, -- JSON array of activity IDs that contributed
    calculation_formula_used TEXT,
    confidence_score DECIMAL(5,2) DEFAULT 100, -- 0-100: how confident in this data
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'validated', 'final', 'archived')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,

    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
    INDEX idx_period (period_start, period_end),
    INDEX idx_indicator_period (indicator_id, period_start),
    INDEX idx_data_source (data_source),
    INDEX idx_status (status)
);

-- Project Progress Snapshots
CREATE TABLE IF NOT EXISTS project_progress_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    overall_completion_percentage INT,
    status VARCHAR(50) CHECK (status IN ('in_progress', 'tracking', 'on_schedule', 'at_risk', 'delayed')),
    activities_completed INT,
    activities_total INT,
    indicators_on_track INT,
    indicators_total INT,
    forecasted_completion_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_date (project_id, snapshot_date)
);

-- Strategic Objective Progress (aggregated)
CREATE TABLE IF NOT EXISTS strategic_objective_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategic_objective_id UUID NOT NULL,
    snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    overall_achievement_percentage INT,
    status VARCHAR(50) CHECK (status IN ('on_track', 'at_risk', 'off_track', 'completed')),
    projects_active INT,
    projects_on_track INT,
    projects_at_risk INT,
    key_indicators_achieved INT,
    key_indicators_total INT,
    flagged_risks TEXT, -- JSON array of risk descriptions

    FOREIGN KEY (strategic_objective_id) REFERENCES strategic_objectives(id) ON DELETE CASCADE,
    INDEX idx_objective_date (strategic_objective_id, snapshot_date)
);

-- Audit Trail for Automatic Updates
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) CHECK (entity_type IN ('indicator', 'project_progress', 'objective_progress', 'activity')),
    entity_id UUID NOT NULL,
    change_type VARCHAR(50) CHECK (change_type IN ('created', 'updated', 'auto_calculated', 'rolled_back')),
    previous_value VARCHAR(500),
    new_value VARCHAR(500),
    reason_code VARCHAR(100), -- 'activity_completion', 'manual_edit', 'recalculation'
    triggered_by_id UUID, -- Activity or user that caused change
    triggered_by_type VARCHAR(50) CHECK (triggered_by_type IN ('activity', 'user', 'system')),
    correlation_id UUID, -- Links related changes
    metadata JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,

    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_triggered_by (triggered_by_id, triggered_by_type),
    INDEX idx_correlation (correlation_id),
    INDEX idx_created_at (created_at)
);

-- Indicator Calculation Rules
CREATE TABLE IF NOT EXISTS indicator_calculation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL,
    indicator_id UUID NOT NULL,
    activity_selection_criteria TEXT, -- JSON object with filters
    aggregation_logic TEXT, -- SQL or formula
    time_window INT DEFAULT 90, -- Days to look back
    enabled BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (indicator_id) REFERENCES indicators(id) ON DELETE CASCADE,
    INDEX idx_indicator (indicator_id),
    INDEX idx_enabled (enabled)
);

-- Update existing indicators table to support auto-calculation
ALTER TABLE indicators ADD COLUMN IF NOT EXISTS is_auto_calculated BOOLEAN DEFAULT FALSE;
ALTER TABLE indicators ADD COLUMN IF NOT EXISTS calculation_method TEXT;
ALTER TABLE indicators ADD COLUMN IF NOT EXISTS last_manual_entry_at TIMESTAMP;
ALTER TABLE indicators ADD COLUMN IF NOT EXISTS last_manual_entered_by UUID;
ALTER TABLE indicators ADD INDEX IF NOT EXISTS idx_auto_calculated (is_auto_calculated);

-- Update existing activities table for strategic tracking
ALTER TABLE activities ADD COLUMN IF NOT EXISTS strategic_objective_id UUID;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS completion_percentage INT DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS validated_by UUID;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP;
