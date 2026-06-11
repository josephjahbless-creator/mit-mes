# Deployment Checklist - Dira Strategic Integration Phase 1

**Time Required:** 10-15 minutes  
**Date:** June 2, 2026  
**Version:** 1.0

---

## Pre-Deployment (5 minutes)

### Database
- [ ] PostgreSQL running (`psql -U postgres -c "SELECT 1;"`)
- [ ] Database `mit_mes_db` exists
- [ ] User `postgres` has access
- [ ] Current database backed up

### Application
- [ ] Backend PM2 service stopped (`pm2 stop mit-backend`)
- [ ] No port conflicts on 5000 (`netstat -ano | findstr :5000`)
- [ ] Git status clean (no uncommitted changes)

### Files Verified
- [ ] `prisma/migrations/create_strategic_integration.sql` exists (300 lines)
- [ ] `prisma/seeds/seed-strategic-objectives.js` exists (250 lines)
- [ ] `src/services/indicatorCalculationService.js` exists (350 lines)
- [ ] `src/modules/strategic-integration/strategicObjectives.controller.js` exists
- [ ] `src/routes/strategicIntegration.routes.js` exists (400+ lines)
- [ ] `prisma/schema.prisma` updated with new models

---

## Deployment (10 minutes)

### Step 1: Create Database Tables (2 min)

```bash
cd D:\MIT\mit-mes\backend

# Run migration
psql -U postgres -d mit_mes_db -f prisma/migrations/create_strategic_integration.sql

# Expected output:
# CREATE TABLE
# CREATE TABLE
# ... (9 tables total)
```

**Verification:**
```bash
psql -U postgres -d mit_mes_db -c "\dt" | grep -E "strategic|foundational|activity_indicator|performance|audit_trail"

# Should show:
# ├─ strategic_objectives_dira
# ├─ foundational_reforms
# ├─ project_strategic_objectives
# ├─ activity_indicator_mappings
# ├─ performance_data
# ├─ project_progress_snapshots
# ├─ strategic_objective_progress
# ├─ audit_trail_dira
# └─ indicator_calculation_rules
```

- [ ] All 9 tables created successfully

### Step 2: Generate Prisma Client (1 min)

```bash
cd D:\MIT\mit-mes\backend

npx prisma generate
```

**Expected output:**
```
✔ Generated Prisma Client (v5.x.x) to .\node_modules\.prisma\client
```

- [ ] Prisma client generated

### Step 3: Load Seed Data (2 min)

```bash
cd D:\MIT\mit-mes\backend

node prisma/seeds/seed-strategic-objectives.js
```

**Expected output:**
```
Starting seed: Strategic Objectives (7 Flagships)...

✓ Created: Bagamoyo Eco-Maritime City (SO-001)
✓ Created: Liganga–Mchuchuma Iron & Steel Complex (SO-002)
✓ Created: National Irrigation & Agro-Industrial Transformation (SO-003)
✓ Created: Dodoma Mineral Silicon Valley (SO-004)
✓ Created: LNG Industrialisation Platform (SO-005)
✓ Created: Great Lakes Smart Industrial Hub (SO-006)
✓ Created: Tanzania Urban Growth Nexus (SO-007)

---

Starting seed: Foundational Reforms...

✓ Created: Fair Competition Commission - M&A Framework (FR-001)
✓ Created: Business Registration - Limited Liability Partnership (FR-002)
✓ Created: Industrial and Market Intelligence Unit (FR-003)
✓ Created: SME Certification and Standards Access (FR-004)
✓ Created: SME Upgrading and Value Chain Integration (FR-005)
✓ Created: National Development Corporation Strengthening (FR-006)

✓ Seed completed successfully!
```

- [ ] 7 flagships seeded
- [ ] 6 foundational reforms seeded

### Step 4: Verify Database Content (1 min)

```bash
# Count flagships
psql -U postgres -d mit_mes_db -c "SELECT COUNT(*) FROM strategic_objectives_dira;"
# Expected: 7

# Count reforms
psql -U postgres -d mit_mes_db -c "SELECT COUNT(*) FROM foundational_reforms;"
# Expected: 6

# List flagships
psql -U postgres -d mit_mes_db -c "SELECT code, name, priority_level FROM strategic_objectives_dira ORDER BY priority_level;"

# Expected output:
#  code |                                   name                                   | priority_level
# ------+--------------------------------------------------------------------------+----------------
#  SO-001 | Bagamoyo Eco-Maritime City                                             |              1
#  SO-002 | Liganga–Mchuchuma Iron & Steel Complex                                 |              2
#  SO-003 | National Irrigation & Agro-Industrial Transformation                   |              3
#  SO-004 | Dodoma Mineral Silicon Valley                                          |              4
#  SO-005 | LNG Industrialisation Platform                                         |              5
#  SO-006 | Great Lakes Smart Industrial Hub                                       |              6
#  SO-007 | Tanzania Urban Growth Nexus                                            |              7
```

- [ ] Exactly 7 flagships in database
- [ ] Exactly 6 reforms in database
- [ ] All records have correct codes and names

### Step 5: Update Application Code (2 min)

**Edit:** `D:\MIT\mit-mes\backend\src\app.js`

**Find:** (usually after other route mounts like indicators, activities)
```javascript
// app.use('/api/v1/activities', activityRoutes);
// app.use('/api/v1/reports', reportRoutes);
```

**Add:**
```javascript
// Strategic Integration Routes (Dira ya Taifa 2050)
const strategicIntegrationRoutes = require('./routes/strategicIntegration.routes');
app.use('/api/v1', strategicIntegrationRoutes);
```

**Verify edit:**
```bash
grep -n "strategicIntegrationRoutes" D:\MIT\mit-mes\backend\src\app.js
# Should show the line number of the import and app.use()
```

- [ ] Routes imported in app.js
- [ ] Routes mounted at `/api/v1`

### Step 6: Start Backend Service (1 min)

```bash
pm2 start "D:\MIT\mit-mes\backend\src\app.js" --name "mit-backend" --cwd "D:\MIT\mit-mes\backend" --restart-delay 3000

# Or if updating existing:
pm2 restart mit-backend

# Verify running
pm2 status
```

**Expected output:**
```
┌─────┬──────────────┬─────────┬─────────┬──────────┬────────┐
│ id  │ name         │ version │ mode    │ ↺        │ status │
├─────┼──────────────┼─────────┼─────────┼──────────┼────────┤
│ 0   │ mit-backend  │ 24.14.1 │ fork    │ 0        │ online │
│ 1   │ mit-frontend │ ...     │ fork    │ 0        │ online │
└─────┴──────────────┴─────────┴─────────┴──────────┴────────┘
```

- [ ] Backend showing "online" status
- [ ] No error messages in PM2

### Step 7: Check Backend Logs (1 min)

```bash
pm2 logs mit-backend --lines 50 --nostream
```

**Look for:**
- [ ] No "TypeError" or "ReferenceError" messages
- [ ] No "Cannot find module" errors
- [ ] No "ECONNREFUSED" database errors
- [ ] Look for: "Server running on port 5000" or similar

**If errors found:**
```bash
# View full logs
pm2 logs mit-backend

# Or check logs file
cat "C:\Users\josep\.pm2\logs\mit-backend-error-0.log" | tail -100
```

- [ ] No critical errors in logs

---

## Post-Deployment Verification (5 minutes)

### API Endpoint Tests

**You'll need:** A valid JWT token from your system (get from login response)

```bash
# Save token to variable
TOKEN="your_jwt_token_here"

# Test 1: Get all strategic objectives
curl -X GET http://localhost:5000/api/v1/strategic-objectives \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 OK with array of 7 flagships
# Response should include SO-001 through SO-007
```

**Check response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "SO-001",
      "name": "Bagamoyo Eco-Maritime City",
      "priority_level": 1,
      "status": "active",
      ...
    },
    ... (6 more)
  ]
}
```

- [ ] Endpoint returns 200 OK
- [ ] Response includes all 7 flagships
- [ ] JSON structure is valid

```bash
# Test 2: Get flagship status dashboard
curl -X GET http://localhost:5000/api/v1/dashboard/flagship-status \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with comprehensive dashboard data
```

**Check response contains:**
- [ ] All 7 objectives with stats
- [ ] `current_progress` values
- [ ] `projects_total` and `projects_active`
- [ ] `status` field (on_track/at_risk/completed)

```bash
# Test 3: Get foundational reforms
curl -X GET http://localhost:5000/api/v1/foundational-reforms \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with array of 6 reforms
```

**Check response:**
- [ ] Returns 6 reforms
- [ ] Each has code (FR-001 to FR-006)
- [ ] Includes name, description, institution

```bash
# Test 4: Get integration status
curl -X GET http://localhost:5000/api/v1/integration-status \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with system metrics
```

**Check response includes:**
```json
{
  "success": true,
  "data": {
    "strategic_objectives": 7,
    "linked_projects": 0,  // Will be 0 initially
    "activity_indicator_mappings": 0,  // Will be 0 initially
    "indicators": 123,  // or whatever your count is
    "foundational_reforms": 6,
    "recent_performance_data": 0,  // Will increase after activities
    "auto_calculated_percentage": "0.00%",  // Will increase
    "average_confidence_score": "0.00"  // Will increase
  }
}
```

- [ ] Integration status endpoint works
- [ ] Shows 7 strategic objectives
- [ ] Shows 6 foundational reforms

### Database Verification

```bash
# Check audit trail is working (should be empty initially)
psql -U postgres -d mit_mes_db -c "SELECT COUNT(*) FROM audit_trail_dira;"
# Expected: 0 (until activities are submitted)

# Check performance data table (should be empty initially)
psql -U postgres -d mit_mes_db -c "SELECT COUNT(*) FROM performance_data;"
# Expected: 0 (until calculations run)

# Check new indices exist
psql -U postgres -d mit_mes_db -c "SELECT indexname FROM pg_indexes WHERE tablename = 'strategic_objectives_dira';"
# Should show indexes created by migration
```

- [ ] Audit trail table exists
- [ ] Performance data table exists
- [ ] Indices are in place

---

## Success Criteria

**All of the following must be true:**

- [x] Database: 9 new tables created
- [x] Database: 7 flagships loaded
- [x] Database: 6 foundational reforms loaded
- [x] Prisma: Client generated successfully
- [x] Application: Routes imported in app.js
- [x] Application: Backend service running (online)
- [x] Application: No errors in logs
- [x] API: GET /strategic-objectives returns 7 items
- [x] API: GET /dashboard/flagship-status responds with stats
- [x] API: GET /foundational-reforms returns 6 items
- [x] API: GET /integration-status shows metrics
- [x] Security: All endpoints require authentication token
- [x] Security: All responses include success/error fields

**If all criteria passed:** ✅ **DEPLOYMENT SUCCESSFUL**

---

## Troubleshooting

### Issue: "Table does not exist"

**Symptom:** API returns error like `relation "strategic_objectives_dira" does not exist`

**Fix:**
```bash
# Rerun migration
psql -U postgres -d mit_mes_db -f prisma/migrations/create_strategic_integration.sql

# Verify tables created
psql -U postgres -d mit_mes_db -c "\dt" | grep strategic
```

### Issue: "Cannot find module 'routes/strategicIntegration'"

**Symptom:** Backend won't start, error about missing module

**Fix:**
1. Verify file exists: `ls -la D:\MIT\mit-mes\backend\src\routes\strategicIntegration.routes.js`
2. Check app.js import path is correct (should be `./routes/strategicIntegration.routes`)
3. Check for typos in app.js

### Issue: API returns "Unauthorized"

**Symptom:** Requests return 401 even with token

**Fix:**
1. Verify token is valid: `curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/v1/auth/verify`
2. Token may have expired - get a new one from login
3. Check Bearer prefix is correct: `Authorization: Bearer <token>` (with space)

### Issue: Database connection fails

**Symptom:** "ECONNREFUSED" errors in logs

**Fix:**
```bash
# Check PostgreSQL running
psql -U postgres -c "SELECT 1;"

# Check DATABASE_URL in .env
cat D:\MIT\mit-mes\backend\.env | grep DATABASE_URL

# Should be something like:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/mit_mes_db"

# Test connection:
psql -U postgres -d mit_mes_db -c "SELECT 1;"
```

### Issue: Seed script fails

**Symptom:** "Error creating strategic_objectives" messages

**Fix:**
1. Make sure Prisma client is generated: `npx prisma generate`
2. Check DATABASE_URL is set: `echo $DATABASE_URL`
3. Verify database connection: `psql -U postgres -d mit_mes_db -c "SELECT 1;"`
4. Try again: `node prisma/seeds/seed-strategic-objectives.js`

---

## Rollback Procedure

If deployment fails and you need to rollback:

```bash
# 1. Stop backend
pm2 stop mit-backend

# 2. Undo the routes import from app.js (remove the strategic integration lines)

# 3. Drop new tables (WARNING: This deletes data!)
psql -U postgres -d mit_mes_db << EOF
DROP TABLE IF EXISTS indicator_calculation_rules;
DROP TABLE IF EXISTS audit_trail_dira;
DROP TABLE IF EXISTS strategic_objective_progress;
DROP TABLE IF EXISTS project_progress_snapshots;
DROP TABLE IF EXISTS performance_data;
DROP TABLE IF EXISTS activity_indicator_mappings;
DROP TABLE IF EXISTS project_strategic_objectives;
DROP TABLE IF EXISTS foundational_reforms;
DROP TABLE IF EXISTS strategic_objectives_dira;
EOF

# 4. Restore from backup (if you have one)
# psql -U postgres -d mit_mes_db < backup.sql

# 5. Restart backend
pm2 start "D:\MIT\mit-mes\backend\src\app.js" --name "mit-backend" --cwd "D:\MIT\mit-mes\backend"
```

---

## Support & Next Steps

### If Deployment Successful ✅

1. **Document Completion**
   - Mark PHASE1_SUMMARY.md as "DEPLOYED"
   - Update timestamp in this file

2. **Notify Team**
   - Share API endpoints with frontend team
   - Share Prisma models with backend team
   - Share IMPLEMENTATION_GUIDE.md with documentation team

3. **Begin Phase 2**
   - Frontend team: Start building Flagship Status dashboard
   - API team: Create activity submission with indicator preview
   - M&E team: Begin mapping activities to indicators

### If Issues Found

1. **Review Troubleshooting** section above
2. **Check logs:** `pm2 logs mit-backend`
3. **Test database:** `psql -U postgres -d mit_mes_db -c "\dt"`
4. **Verify files:** All 6 files exist and have correct content

### Resources

- **Full Guide:** `D:\MIT\mit-mes\IMPLEMENTATION_GUIDE.md`
- **Architecture Plan:** Earlier sections of context summary
- **Database Schema:** `D:\MIT\mit-mes\backend\prisma\migrations\create_strategic_integration.sql`
- **API Code:** `D:\MIT\mit-mes\backend\src\routes\strategicIntegration.routes.js`

---

**Status:** ✅ READY FOR DEPLOYMENT  
**Version:** 1.0  
**Date:** June 2, 2026  
**Prepared By:** Implementation Team

