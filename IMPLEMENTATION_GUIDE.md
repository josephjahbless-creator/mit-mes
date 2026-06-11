# Dira ya Taifa 2050 Strategic Integration - Implementation Guide

**Phase 1: Foundation & Database Setup**

## Overview

This document outlines the complete implementation of the Dira ya Taifa 2050 strategic integration system, which enables:

- **7 Strategic Flagships** linked to projects and activities
- **Automatic Indicator Updates** when activities are completed
- **Cascading Calculations** from activities → indicators → projects → objectives
- **Real-Time Dashboards** showing progress across all flagships
- **Complete Audit Trail** tracking all automatic updates
- **Data Quality Metrics** with confidence scoring

---

## Files Created

### 1. Database Schema & Migrations

**Location:** `D:\MIT\mit-mes\backend\prisma\migrations\create_strategic_integration.sql`

Contains 9 new tables:
- `strategic_objectives` - 7 flagships
- `foundational_reforms` - 6 reforms
- `project_strategic_objectives` - links projects to objectives
- `activity_indicator_mappings` - defines how activities feed indicators
- `performance_data` - stores calculated indicator values
- `project_progress_snapshots` - tracks project progress over time
- `strategic_objective_progress` - aggregated objective progress
- `audit_trail_dira` - audit history of all automatic changes
- `indicator_calculation_rules` - configuration for custom calculations

**Prisma Schema:** `D:\MIT\mit-mes\backend\prisma\schema.prisma`

Added models:
- `StrategicObjectiveDira` - models for the 7 flagships
- `FoundationalReform` - reform management
- `ProjectStrategicObjective` - project-objective linkage
- `ActivityIndicatorMapping` - activity-indicator relationship
- `PerformanceData` - calculated indicator values
- And 4 more models (see schema file)

### 2. Seed Data

**Location:** `D:\MIT\mit-mes\backend\prisma\seeds\seed-strategic-objectives.js`

Contains complete data for:
- **7 Strategic Flagships** with detailed descriptions, focus areas, and investment estimates:
  1. Bagamoyo Eco-Maritime City ($2.5B)
  2. Liganga–Mchuchuma Iron & Steel Complex ($3.0B)
  3. National Irrigation & Agro-Industrial Transformation ($2.2B)
  4. Dodoma Mineral Silicon Valley ($1.8B)
  5. LNG Industrialisation Platform ($3.5B)
  6. Great Lakes Smart Industrial Hub ($1.5B)
  7. Tanzania Urban Growth Nexus ($1.2B)

- **6 Foundational Reforms** supporting implementation

### 3. Services

**Location:** `D:\MIT\mit-mes\backend\src\services\indicatorCalculationService.js`

Provides:
- `calculateIndicatorValue()` - Calculate indicator from linked activities
- `recalculateAllIndicators()` - Batch recalculation for entire period
- `getCalculationTrace()` - Audit trail for indicator calculations
- `rollbackIndicator()` - Rollback when activity fails

Features:
- Multiple aggregation methods: sum, average, weighted_average, count, percentage, formula
- Confidence scoring based on data completeness and recency
- Automatic audit trail creation
- Transaction safety for rollbacks

### 4. API Controllers

**Location:** `D:\MIT\mit-mes\backend\src\modules\strategic-integration\strategicObjectives.controller.js`

Endpoints:
- `GET /strategic-objectives` - List all flagships
- `GET /strategic-objectives/:id` - Get flagship details
- `GET /strategic-objectives/:id/progress` - Progress history
- `GET /dashboard/flagship-status` - Dashboard with all flagships
- `POST /strategic-objectives/:id/link-project` - Link project to objective
- `GET /foundational-reforms` - List reforms
- `GET /integration-status` - System status and metrics

### 5. API Routes

**Location:** `D:\MIT\mit-mes\backend\src\routes\strategicIntegration.routes.js`

All HTTP endpoints with:
- Role-based access control (RBAC)
- Token authentication
- Error handling
- JSON responses

---

## Installation & Setup Steps

### Step 1: Run Database Migration

```bash
cd D:\MIT\mit-mes\backend

# 1. Create the new tables
npm run db:migrate -- create_strategic_integration

# Or use raw SQL:
psql -U postgres -d mit_mes_db -f prisma/migrations/create_strategic_integration.sql

# 2. Verify tables were created
psql -U postgres -d mit_mes_db -c "\dt"
```

### Step 2: Run Seed Data

```bash
cd D:\MIT\mit-mes\backend

# Run the seed script
node prisma/seeds/seed-strategic-objectives.js

# Expected output:
# ✓ Created: Bagamoyo Eco-Maritime City (SO-001)
# ✓ Created: Liganga–Mchuchuma Iron & Steel Complex (SO-002)
# ... (7 flagships total)
# ✓ Created: Fair Competition Commission - M&A Framework (FR-001)
# ... (6 foundational reforms)
```

### Step 3: Regenerate Prisma Client

```bash
cd D:\MIT\mit-mes\backend

npx prisma generate
```

### Step 4: Update App Router

Add the strategic integration routes to your main `app.js`:

```javascript
// In D:\MIT\mit-mes\backend\src\app.js

// Import the new routes
const strategicIntegrationRoutes = require('./routes/strategicIntegration.routes');

// Mount at /api/v1/
app.use('/api/v1', strategicIntegrationRoutes);

// Example: After other route mounts like:
// app.use('/api/v1/users', userRoutes);
// app.use('/api/v1/indicators', indicatorRoutes);
// Add:
// app.use('/api/v1', strategicIntegrationRoutes);
```

### Step 5: Restart Backend Service

```bash
# Stop current process
pm2 stop mit-backend

# Start fresh
pm2 start "D:\MIT\mit-mes\backend\src\app.js" --name "mit-backend" --cwd "D:\MIT\mit-mes\backend"

# Verify running
pm2 status
```

---

## Workflow: How Automation Works

### Flow 1: Activity Submission → Automatic Indicator Update

```
1. Data Collector submits Activity (e.g., "Installed 500 units")
   └─ POST /api/v1/data-entry/submit
   └─ Status: submitted

2. ME Officer validates Activity
   └─ PUT /api/v1/activities/{id}/validate
   └─ Status: validated
   └─ Triggers: calculateIndicatorValue()

3. System automatically calculates linked Indicators
   └─ Queries: activity_indicator_mappings WHERE activity_id = {id}
   └─ Fetches: all linked indicators
   └─ Applies: aggregation rules (sum, average, etc.)
   └─ Creates: performance_data record

4. Performance Data saved with metadata
   └─ actual_value: 500
   └─ confidence_score: 85 (based on completeness)
   └─ data_source: auto_calculated
   └─ source_activities: [activity_id]

5. Audit Trail created automatically
   └─ Records: previous_value → new_value
   └─ Reason: activity_completion
   └─ Timestamp & user tracked

6. Dashboards updated in real-time via WebSocket
   └─ Indicator cards refresh
   └─ Project progress updates
   └─ Objective progress recalculates
```

### Flow 2: Project Progress Cascading

```
Activity Completion
    ↓
Indicator Value Updated (+5%)
    ↓
Project Progress Recalculated (85% → 90%)
    ↓
Strategic Objective Progress Aggregated (45% → 48%)
    ↓
Flagship Dashboard Updated
    ↓
Real-Time Notifications Sent
```

---

## API Endpoints Reference

### Strategic Objectives

```bash
# Get all 7 flagships
GET /api/v1/strategic-objectives

# Get specific flagship (e.g., Bagamoyo)
GET /api/v1/strategic-objectives/{id}

# Get flagship progress history (last 90 days)
GET /api/v1/strategic-objectives/{id}/progress?days=90

# Dashboard view (all flagships)
GET /api/v1/dashboard/flagship-status

# Link project to objective
POST /api/v1/strategic-objectives/{id}/link-project
{
  "projectId": "uuid",
  "contributionType": "primary",
  "weighting": 100
}
```

### Indicators & Calculations

```bash
# Recalculate specific indicator
POST /api/v1/indicators/{id}/recalculate
{
  "period": {
    "period": "Q2-2026",
    "fiscalYear": "2025-2026",
    "reportingPeriod": "Q2",
    "start_date": "2025-01-01",
    "end_date": "2025-03-31"
  }
}

# Get calculation audit trail
GET /api/v1/indicators/{id}/calculation-trace

# Submit activity & trigger calculations
POST /api/v1/activities/{id}/submit
{
  "status": "validated"
}
```

### Reporting

```bash
# Integration status & metrics
GET /api/v1/integration-status

# Cascade analysis report
GET /api/v1/reports/cascade-analysis?from_date=2025-01-01&to_date=2025-03-31

# Data quality metrics
GET /api/v1/reports/data-quality
```

---

## Aggregation Methods

When linking an activity to an indicator, choose how to combine multiple activities:

| Method | Formula | Use Case |
|--------|---------|----------|
| `sum` | value₁ + value₂ + ... | Total output (units produced, people trained) |
| `average` | (value₁ + value₂ + ...) / n | Average rate or percentage |
| `weighted_average` | Σ(value × weight) | Different activities contribute differently |
| `count` | # of completed activities | Completion count |
| `percentage` | (completed / total) × 100 | % completion |
| `formula` | Custom SQL/JS expression | Complex calculations |

**Example:**
- Activity 1: "Train 50 SMEs" → Indicator "SME Training Count" (sum)
- Activity 2: "Establish cluster" → Indicator "SME Training Count" (count)
- Combined: Total = 50 + 1 = 51

---

## Confidence Scoring

Each indicator value gets a confidence score (0-100) based on:

- **Data Completeness (60%)**
  - How many linked activities have actual values?
  - 100% = all activities reported; 0% = none reported

- **Recency (40%)**
  - Were values submitted in the last 7 days?
  - 100% = all recent; 0% = all stale

**Example:**
- 8 linked activities, 6 reported (75% complete)
- 5 submitted in last 7 days (62% recent)
- Confidence = 75% × 0.6 + 62% × 0.4 = **70%**

Dashboards show:
- Green (80-100%): High confidence
- Yellow (50-79%): Medium confidence
- Red (0-49%): Low confidence - may need review

---

## Audit Trail

Every automatic update creates an audit record:

```json
{
  "entity_type": "indicator",
  "entity_id": "ind-001",
  "change_type": "auto_calculated",
  "previous_value": "100",
  "new_value": "125",
  "reason_code": "activity_completion",
  "triggered_by_id": "act-042",
  "triggered_by_type": "activity",
  "correlation_id": "perf-data-uuid",
  "metadata": {
    "contributing_activities": 3,
    "achievement_percentage": 58,
    "period": "Q2-2026"
  },
  "created_at": "2026-06-02T14:30:00Z",
  "created_by": null  // system-generated
}
```

View via:
```bash
GET /api/v1/indicators/{id}/calculation-trace
```

---

## Rollback Scenario

If an activity is marked as failed:

```
Activity marked as FAILED
    ↓
System finds all Performance Data records that included this activity
    ↓
Archives current values
    ↓
Restores previous values
    ↓
Creates rollback audit entry
    ↓
Notifies responsible officers
```

---

## Frontend Integration Points

### 1. Results Framework Page
- Show linked strategic objectives badge
- Display "Auto-updated" label next to indicator values
- Show confidence score indicator

### 2. Activity Submission Form
- **Step 3 (Select Indicators):** Show preview of which indicators will be auto-updated
- **Step 4 (Enter Values):** Display "These will auto-update the following indicators:"
- Display activity-indicator mappings graphically

### 3. Dashboard Enhancements
- **New Tab:** "Flagship Status" showing all 7 objectives with progress
- **New Widget:** "Recent Auto-Calculations" showing last 10 updates
- **New Chart:** Activity → Indicator flow diagram
- **Real-time Updates:** WebSocket notifications when indicators change

### 4. Indicator Cards
- Badge: "Auto-calculated from X activities"
- Link: "View calculation details"
- Line chart: Last 30 days of values with auto/manual indicators
- Manual override option (if needed)

### 5. Project View
- Show linked strategic objectives
- Display "Progress cascading to: [Objective Name]"
- Impact forecast: "Current progress will achieve X% of objective by [date]"

---

## Troubleshooting

### Issue: "Table does not exist"

**Solution:**
```bash
# Run migration again
psql -U postgres -d mit_mes_db -f prisma/migrations/create_strategic_integration.sql

# Verify
psql -U postgres -d mit_mes_db -c "SELECT * FROM strategic_objectives_dira LIMIT 1;"
```

### Issue: Seed data not loading

**Solution:**
```bash
# Check if Prisma client is generated
npx prisma generate

# Run seed with debug output
DEBUG=* node prisma/seeds/seed-strategic-objectives.js

# Check for password/connection issues
npm run db:test
```

### Issue: Calculations not triggering on activity submission

**Solution:**
1. Check that `activityToIndicatorMappings` table has records
   ```bash
   SELECT * FROM activity_indicator_mappings WHERE enabled = true;
   ```

2. Verify routes are mounted in app.js
   ```bash
   curl -H "Authorization: Bearer {token}" http://localhost:5000/api/v1/strategic-objectives
   ```

3. Check backend logs
   ```bash
   pm2 logs mit-backend | grep "indicator"
   ```

### Issue: Confidence scores all showing 0

**Solution:**
- Ensure activities have actual submitted data
- Check that `reportingPeriod` matches the calculation period
- Verify dates in performance_data are correct

---

## Next Steps (Phase 2)

After Phase 1 is deployed:

### Phase 2: Frontend Integration
- Update Results Framework page with flagship indicators
- Add "Flagship Status" dashboard component
- Create activity-indicator mapping UI
- Implement WebSocket real-time updates

### Phase 3: Advanced Analytics
- Implement forecasting algorithm
- Add anomaly detection
- Create comparison reports (target vs. actual)
- Build data reconciliation workflows

### Phase 4: Mobile & Offline
- Mobile app for field staff to submit activities
- Offline submission queue with sync
- SMS notifications for milestone achievements
- Bulk upload from Excel/CSV

---

## Key Contacts & Support

For questions about:
- **Database & Schema:** [Backend Team]
- **API Endpoints:** [API Documentation]
- **Frontend Integration:** [UI Team]
- **Data Quality & Audit:** [M&E Officer]

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-02 | Initial implementation of Phase 1 foundation |

---

**Document Status:** Complete - Ready for Phase 1 Implementation
**Last Updated:** 2026-06-02
**Next Review:** After Phase 1 deployment
