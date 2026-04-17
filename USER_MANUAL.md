# MIT M&E System — User Manual

**Ministry of Industry and Trade — Monitoring & Evaluation System**
**Version 1.0 | April 2026**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Getting Started](#3-getting-started)
4. [Dashboard](#4-dashboard)
5. [Results Framework](#5-results-framework)
6. [Indicators](#6-indicators)
7. [Data Entry](#7-data-entry)
8. [Approval Queue](#8-approval-queue)
9. [Industry Statistics](#9-industry-statistics)
10. [Projects](#10-projects)
11. [Activity Workplan](#11-activity-workplan)
12. [Budget](#12-budget)
13. [Reports](#13-reports)
14. [Analytics](#14-analytics)
15. [Documents](#15-documents)
16. [Administration](#16-administration)
17. [Contact Support & Helpdesk](#17-contact-support--helpdesk)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. System Overview

The MIT Monitoring & Evaluation (M&E) System is a web-based platform used by the **Ministry of Industry and Trade (MIT)** and its **14 institutions** (MIT-HQ and 13 affiliated agencies) to:

- Track performance against the MIT Strategic Plan 2026/27–2030/31
- Collect and approve indicator data from institutions
- Monitor project implementation and activity workplans
- Manage budgets and expenditures
- Generate reports and analytical insights
- Store and share official documents

### Institutions in the System

| Code | Full Name |
|------|-----------|
| MIT-HQ | Ministry of Industry and Trade (Headquarters) |
| BRELA | Business Registrations and Licensing Agency |
| CAMARTEC | Centre for Agricultural Mechanization and Rural Technology |
| CBE | College of Business Education |
| FCC | Fair Competition Commission |
| FCT | Fair Competition Tribunal |
| NDC | National Development Corporation |
| SIDO | Small Industries Development Organisation |
| TBS | Tanzania Bureau of Standards |
| TEMDO | Tanzania Engineering and Manufacturing Design Organisation |
| TIRDO | Tanzania Industrial Research and Development Organisation |
| TANTRADE | Tanzania Trade Development Authority |
| WMA | Weights and Measures Agency |
| WRRB | Work and Research Review Board |

### Strategic Objectives Tracked

| Code | Objective |
|------|-----------|
| A | HIV/AIDS and NCDs (Crosscutting) |
| B | Anti-Corruption Strategy (Crosscutting) |
| C | Industrial Performance Improved and Sustained |
| D | Business Environment Improved |
| E | Trade and Market Competitiveness Enhanced |
| F | Institutional Capacity Strengthened |
| X | Environment and Ecosystems (Crosscutting) |
| Y | Multi-sectoral Nutrition (Crosscutting) |

---

## 2. User Roles & Permissions

The system has five user roles. Each user is assigned one role by an administrator.

### Role Summary Table

| Feature | Viewer | Data Collector | M&E Officer | Admin | Super Admin |
|---------|--------|---------------|-------------|-------|-------------|
| View dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| View indicators | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit data | — | ✓ | ✓ | ✓ | ✓ |
| Approve data | — | — | ✓ | ✓ | ✓ |
| Manage indicators | — | — | ✓ | ✓ | ✓ |
| Manage projects | — | — | ✓ | ✓ | ✓ |
| Manage workplan | — | — | ✓ | ✓ | ✓ |
| Manage budget | — | — | ✓ | ✓ | ✓ |
| Generate reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage users | — | — | — | ✓ | ✓ |
| Manage institutions | — | — | — | — | ✓ |
| System configuration | — | — | — | — | ✓ |

### Role Descriptions

**Viewer**
Read-only access. Can view the dashboard, indicators, framework, reports, and documents. Cannot submit or modify any data.

**Data Collector**
Assigned to an institution. Can submit indicator data and track submission status. Cannot approve or reject submissions.

**M&E Officer**
Can manage the full data cycle — create indicators, submit data, approve or reject submissions, manage projects, workplan, and budget for their institution.

**Admin**
Institution-level administrator. All M&E Officer permissions plus managing users within their institution.

**Super Admin**
Full system access. Can manage all institutions, all users, system configuration, framework versions, period locks, and reporting calendar.

---

## 3. Getting Started

### 3.1 Accessing the System

Open a web browser and navigate to:

```
https://[your-server-ip-address]:5443
```

For example: `https://172.20.10.3:5443`

> **Note:** The system uses a self-signed SSL certificate for internal network use.
> On first access, your browser will show a security warning. This is expected.
> Click **Advanced** → **Proceed to [address]** to add a browser exception and continue.
> You only need to do this once per browser.

### 3.2 Logging In

1. Enter your **Email Address** and **Password**
2. Click **Sign In**
3. You will be redirected to the Dashboard upon successful login

**Default credentials (demo):**
- Super Admin: `admin@mit.go.tz` / `Admin@1234`
- Institution Admin (e.g. BRELA): `admin@brela.go.tz` / `Passw0rd@MIT`

### 3.3 Forgot Password

1. Click **Forgot password?** on the login page
2. Enter your registered email address
3. Click **Send Reset Link**
4. Check your email for a password reset link
5. Click the link and enter your new password

### 3.4 Requesting a New Account

1. Click **Request an account** on the login page
2. Fill in your full name, email, institution, and role
3. Submit the request
4. An administrator will review and activate your account

### 3.5 Changing Your Password

Once logged in:
1. Click **Change Password** at the bottom of the left sidebar
2. Enter your current password
3. Enter and confirm your new password
4. Click **Update Password**

### 3.6 Session & Security

- Your session automatically expires after **15 minutes of inactivity**
- A countdown timer is visible at the bottom of the screen — it turns red when less than 2 minutes remain
- Click anywhere or interact with the page to reset the timer
- You will see a warning message before being logged out
- You will be redirected to the login page when the session expires — your saved data is not lost

---

## 4. Dashboard

The Dashboard is the first page you see after logging in. It provides a high-level summary of system-wide performance.

### What You See

**Summary Cards (top row)**
- Total Indicators
- Indicators On Track / At Risk / Behind
- Overall Achievement Percentage
- Pending Approvals (if you are an M&E Officer or Admin)

**Charts**
- Achievement by Strategic Objective — bar chart showing performance per objective
- Submission Status — breakdown of submitted, pending, and approved data
- Recent Activity — latest data submissions and approvals

**Quick Links**
- Quick access to Data Entry, Approval Queue, and Reports

> **Note:** Data displayed is scoped to your institution. Super Admin and M&E Officers see system-wide data.

---

## 5. Results Framework

**Navigation:** Results Framework (sidebar)

The Results Framework page shows the full logical hierarchy of the MIT Strategic Plan:

```
Strategic Objective → Outcome → Output → Activity → Indicator
```

### 5.1 Viewing the Framework

1. Click **Results Framework** in the sidebar
2. The Ministerial view shows all Strategic Objectives
3. Click on an Objective to expand its Outcomes
4. Click on an Outcome to see its Outputs
5. Click on an Output to see its Activities and linked Indicators

### 5.2 Framework Hierarchy

| Level | Description | Example |
|-------|-------------|---------|
| Strategic Objective | Top-level goal | Industrial Performance Improved |
| Outcome | Expected result | Increased industrial output |
| Output | Deliverable | Number of industries supported |
| Activity | Action taken | Conduct industrial surveys |
| Indicator | Measurement | % increase in industrial production |

### 5.3 Framework Versions (Admin/Super Admin)

The system maintains versions of the Results Framework to track changes over time.

1. Go to **Administration → FW Versions** in the sidebar
2. View all published versions
3. Compare versions to see what changed between periods

---

## 6. Indicators

**Navigation:** Indicators (sidebar)

Indicators are the measurable metrics used to track progress against the Results Framework.

### 6.1 Viewing Indicators

1. Click **Indicators** in the sidebar
2. Use the search bar to find an indicator by name or code
3. Filter by Strategic Objective, Status, or Reporting Frequency
4. Click on any indicator to open its detail page

### 6.2 Indicator Detail Page

Each indicator detail page shows:
- **Definition** — what the indicator measures
- **Disaggregation** — how data is broken down (by gender, region, etc.)
- **Targets** — annual and quarterly targets per fiscal year
- **Actuals** — submitted and approved data values
- **Achievement Chart** — visual trend of performance over time
- **Responsible Institutions** — which institutions report on this indicator

### 6.3 Creating a New Indicator (M&E Officer / Super Admin)

1. Click **Indicators** in the sidebar
2. Click the **+ New Indicator** button (top right)
3. Fill in:
   - **Name** — full indicator name
   - **Code** — short reference code
   - **Definition** — clear description of what is being measured
   - **Unit of Measure** — e.g. Number, Percentage, TZS
   - **Reporting Frequency** — Quarterly or Annual
   - **Formula Type** — how achievement is calculated
   - **Output** — link to the Results Framework Output
   - **Responsible Institutions** — which institutions report on it
4. Set **Targets** for the current fiscal year (annual and by quarter)
5. Click **Save Indicator**

### 6.4 Formula Types

| Formula | Description |
|---------|-------------|
| Achievement % | (Actual ÷ Target) × 100 |
| Cumulative Total | Sum of all period actuals |
| Proportion % | Part ÷ Whole × 100 |
| Complement % | 100 minus the proportion |
| Multi-input | Combined formula using multiple values |
| Manual | Score entered directly by M&E Officer |

---

## 7. Data Entry

**Navigation:** Data Entry (sidebar)

Data Entry is where institutions submit their indicator performance data for each reporting period.

### 7.1 Submitting Data

1. Click **Data Entry** in the sidebar
2. Click **+ Submit Data**
3. Select the **Fiscal Year** and **Reporting Period** (Q1, Q2, Q3, Q4, or Annual)
4. Select the **Indicator** you are reporting on
5. Enter the **Actual Value** achieved
6. Add any relevant **Notes or Comments**
7. Attach supporting files if required
8. Click **Submit**

> **Note:** You can only submit data for indicators assigned to your institution. Periods that are locked by the administrator cannot receive new submissions.

### 7.2 Submission Statuses

| Status | Meaning |
|--------|---------|
| Draft | Saved but not yet submitted |
| Submitted | Sent for supervisor review |
| Pending Supervisor | Awaiting supervisor approval |
| Pending M&E | Awaiting M&E Officer review |
| Approved | Accepted and finalised |
| Rejected | Returned for correction |

### 7.3 Editing a Submission

- You can edit a submission while it is in **Draft** or **Rejected** status
- Once submitted, contact your M&E Officer to reject it back for correction
- Approved submissions cannot be edited (audit trail is preserved)

### 7.4 Viewing Your Submissions

1. Click **Data Entry** in the sidebar
2. The list shows all submissions by your institution
3. Filter by period, status, or indicator
4. Click any row to view full details and comments

---

## 8. Approval Queue

**Navigation:** Approval Queue (sidebar)
**Available to:** M&E Officers, Admins, Super Admin

The Approval Queue shows all data submissions waiting for review.

### 8.1 Approving a Submission

1. Click **Approval Queue** in the sidebar
2. You will see all pending submissions for your institution
3. Click a submission to open it
4. Review the submitted value, notes, and attachments
5. Click **Approve** to accept the data
6. The submission status changes to **Approved** and is locked

### 8.2 Rejecting a Submission

1. Open the submission from the Approval Queue
2. Click **Reject**
3. Enter a reason for rejection in the comment box
4. Click **Confirm Rejection**
5. The submitter will be notified and can correct and resubmit

### 8.3 Bulk Actions

- Use the checkboxes to select multiple submissions
- Click **Bulk Approve** to approve all selected submissions at once

---

## 9. Industry Statistics

**Navigation:** Data Entry → Industry Statistics (sidebar)
**Available to:** M&E Officers, Admins, Super Admin

This section captures aggregate industry-level statistics for the MIT dashboard.

### 9.1 Entering Industry Statistics

1. Click **Industry Statistics** in the sidebar
2. Select the **Fiscal Year** and **Quarter**
3. Enter values for each statistical indicator (e.g. number of registered businesses, export value, employment figures)
4. Click **Save**

---

## 10. Projects

**Navigation:** Projects (sidebar)

The Projects module tracks implementation of development projects across MIT and its institutions.

### 10.1 Viewing Projects

1. Click **Projects** in the sidebar
2. Browse the project list — filter by status, institution, or fiscal year
3. Click any project to view its details

### 10.2 Project Detail Page

Each project shows:
- **Overview** — name, description, budget, start/end dates, status
- **Milestones** — key deliverables with due dates and completion status
- **Activities** — specific tasks under each milestone
- **Expenditure** — actual spending against the project budget
- **Progress** — overall completion percentage

### 10.3 Creating a New Project (M&E Officer and above)

1. Click **Projects** → **+ New Project**
2. Fill in:
   - Project name and description
   - Responsible institution
   - Start and end dates
   - Total budget (TZS)
   - Funding source
   - Status (Planned, Ongoing, Completed, Delayed, Cancelled)
3. Add **Milestones** — key deliverables with due dates
4. Add **Activities** under each milestone
5. Click **Save Project**

### 10.4 Updating Project Progress

1. Open the project
2. Click **Edit** to update the status, completion percentage, or add remarks
3. Update individual milestones as they are completed
4. Click **Save**

### 10.5 Project Statuses

| Status | Meaning |
|--------|---------|
| Planned | Not yet started |
| Ongoing | Implementation in progress |
| Completed | All milestones achieved |
| Delayed | Behind schedule |
| Cancelled | Project has been cancelled |

---

## 11. Activity Workplan

**Navigation:** Activity Workplan (sidebar)

The Activity Workplan tracks the implementation schedule and progress of activities in the Results Framework.

### 11.1 Viewing the Workplan

1. Click **Activity Workplan** in the sidebar
2. Summary cards show total activities, completion counts, and overall progress
3. Use filters to narrow by status or search by activity name
4. Each Activity Card shows:
   - Activity name and linked Output/Objective
   - Start and end dates
   - Progress percentage
   - Workplan status
   - Milestone list

### 11.2 Updating an Activity (M&E Officer and above)

1. Click the activity card to expand it
2. Click **Edit**
3. Update:
   - **Start Date** / **End Date**
   - **Progress %** — overall completion (0–100)
   - **Status** — Not Started, In Progress, Completed, Delayed, On Hold
   - **Remarks** — notes on progress or challenges
4. Click **Save**

### 11.3 Managing Milestones

1. Expand an activity card
2. Click **+ Add Milestone** to create a new milestone
3. Enter the milestone name and due date
4. Click any milestone row to cycle its status (Not Started → Ongoing → Completed → Delayed)
5. Hover over a milestone and click the trash icon to delete it (Admin only)

### 11.4 Workplan Statuses

| Status | Description |
|--------|-------------|
| Not Started | Activity has not begun |
| In Progress | Activity is underway |
| Completed | Activity fully achieved |
| Delayed | Behind planned schedule |
| On Hold | Temporarily paused |

> **Overdue indicator:** Activities past their end date that are not completed are highlighted in red.

---

## 12. Budget

**Navigation:** Budget (sidebar)

The Budget module tracks financial plans and actual expenditures for each institution.

### 12.1 Budget Overview

1. Click **Budget** in the sidebar
2. The overview shows:
   - Total approved budget
   - Total expenditure to date
   - Remaining balance
   - Budget utilisation chart by quarter

### 12.2 Budget Plans

1. Click **Budget → Budget Plan**
2. View the planned budget breakdown by activity, quarter, and funding source
3. Click **+ New Budget Plan** (M&E Officer and above) to create a plan
4. Fill in activity, amount, funding source, and quarter
5. Click **Save**

### 12.3 Recording Expenditures

1. Click **Budget → Expenditures**
2. Click **+ Record Expenditure**
3. Fill in:
   - Activity reference
   - Amount spent (TZS)
   - Quarter
   - Description and supporting reference number
4. Click **Save**

---

## 13. Reports

**Navigation:** Reports (sidebar)

The Reports module allows you to generate formatted performance reports.

### 13.1 Generating a Report

1. Click **Reports** in the sidebar
2. Select the **Report Type**:
   - **Performance Report** — achievement against targets by indicator
   - **Submission Summary** — status of all data submissions
   - **Budget Report** — budget utilisation summary
   - **Project Status Report** — overview of all projects
3. Select the **Fiscal Year** and **Reporting Period**
4. Select the **Institution(s)** to include (Super Admin can select all)
5. Click **Generate Report**

### 13.2 Exporting Reports

- Click **Export PDF** to download a PDF version
- Click **Export Excel** to download a spreadsheet
- Reports include charts, tables, and summary narratives

---

## 14. Analytics

**Navigation:** Analytics (sidebar)

The Analytics page provides advanced visual analysis of system-wide performance data.

### 14.1 Available Charts

- **Achievement by Objective** — radar/bar chart of performance per strategic objective
- **Trend Analysis** — indicator performance over multiple periods
- **Institution Comparison** — side-by-side performance of all institutions
- **Submission Heatmap** — data submission activity by institution and period
- **Budget vs. Expenditure** — financial utilisation trends

### 14.2 Filtering Analytics

Use the filter panel to narrow data by:
- Fiscal Year
- Reporting Period
- Strategic Objective
- Institution
- Indicator

---

## 15. Documents

**Navigation:** Documents (sidebar)

The Documents module is a central repository for official files shared across MIT and its institutions.

### 15.1 Browsing Documents

1. Click **Documents** in the sidebar
2. Browse by category or use the search bar
3. Click a document to preview or download it

### 15.2 Uploading a Document (M&E Officer and above)

1. Click **+ Upload Document**
2. Select the file from your computer (PDF, Word, Excel, PNG supported)
3. Fill in:
   - Document title
   - Category (Policy, Report, Template, Guideline, Other)
   - Description (optional)
4. Click **Upload**

### 15.3 Document Categories

| Category | Examples |
|----------|----------|
| Policy | Ministry policies, circulars |
| Report | Quarterly and annual performance reports |
| Template | Data collection forms, reporting templates |
| Guideline | M&E manuals, indicator guides |
| Other | Miscellaneous official documents |

---

## 16. Administration

Administration features are only visible to users with **Admin** or **Super Admin** roles.

### 16.1 Managing Users

**Navigation:** Administration → Users

#### Creating a New User

1. Click **Administration → Users**
2. Click **+ New User**
3. Fill in:
   - Full name
   - Email address
   - Role (Viewer, Data Collector, M&E Officer, Admin)
   - Institution
   - Department (for MIT-HQ staff)
4. Click **Create User**
5. A welcome email with a temporary password is sent to the user

#### Editing a User

1. Find the user in the list
2. Click the **Edit** (pencil) icon
3. Update name, role, or institution as needed
4. Click **Save**

#### Deactivating a User

1. Find the user in the list
2. Click the **Deactivate** toggle
3. The user will no longer be able to log in

### 16.2 Managing Institutions

**Navigation:** Administration → Institutions
**Available to:** Super Admin only

1. Click **Administration → Institutions**
2. View all 14 institutions (MIT-HQ + 13 affiliated agencies) with their details
3. Click an institution to edit its name, code, logo, or contact details
4. Click **+ New Institution** to add a new agency

### 16.3 MIT Organisational Structure

**Navigation:** Administration → MIT

This section manages the internal structure of MIT-HQ:
- Departments
- Units within departments
- Staff assignments

### 16.4 Reporting Calendar

**Navigation:** Administration → Calendar

The Reporting Calendar defines when each institution must submit data for each reporting period.

1. Click **Administration → Calendar**
2. View the current fiscal year calendar
3. Each reporting period shows:
   - Opening date (when submissions open)
   - Closing date (when submissions close)
   - Current status (Open / Closed)

### 16.5 Period Locks

**Navigation:** Administration → Period Locks
**Available to:** Admin, M&E Officer, Super Admin

Period Locks prevent new submissions for a reporting period that has been closed.

#### Locking a Period

1. Click **Administration → Period Locks**
2. Select the **Fiscal Year** and **Period**
3. Click **Lock Period**
4. No new submissions can be made for that period after locking

#### Unlocking a Period

1. Find the locked period in the list
2. Click **Unlock**
3. Submissions can be made again

> **Warning:** Unlocking a period should only be done to correct errors and should be re-locked promptly.

### 16.6 API Integrations

**Navigation:** Administration → Integrations

The Integrations module allows institutions to connect external systems via API keys.

1. Click **Administration → Integrations**
2. Click **Generate API Key** to create a new key for an institution
3. Share the key securely with the institution's technical team
4. Monitor API sync logs to track data exchanges

### 16.7 Framework Versions

**Navigation:** Administration → FW Versions

1. Click **FW Versions** in the sidebar
2. View all saved versions of the Results Framework
3. Click a version to compare it against the current framework
4. Click **+ Save Version** to snapshot the current framework

---

## 17. Contact Support & Helpdesk

### 17.1 Contact Support (Without Logging In)

If you cannot log in or need help before accessing the system:

1. Go to the login page
2. Click **Contact Support** (below the login form)
3. A support panel opens with two tabs:

**Frequently Asked Questions tab**
Browse common questions and answers about:
- Login issues
- Account requests
- Data submission problems
- Report generation
- Password resets

**Submit a Request tab**
1. Enter your **Name** and **Email**
2. Select the **Category** of your issue
3. Enter a **Subject** and detailed **Description**
4. Click **Submit Request**
5. You will receive a ticket number for tracking

### 17.2 Helpdesk (After Logging In)

Once logged in, you can manage your support tickets:

1. Navigate to **https://[server]:5443/helpdesk** (or ask your admin for access)
2. Click **+ New Ticket** to submit a request
3. Fill in the subject, description, category, and priority
4. Click **Submit Ticket**

#### Ticket Statuses

| Status | Meaning |
|--------|---------|
| Open | Ticket received, awaiting response |
| In Progress | Support team is working on it |
| Resolved | Issue has been resolved |
| Closed | Ticket is closed — no further replies |

#### Replying to a Ticket

1. Click on a ticket to open it
2. Read the conversation thread
3. Type your reply in the text box at the bottom
4. Click **Send**

### 17.3 Ticket Priority Levels

| Priority | Use For |
|----------|---------|
| Low | General questions, minor issues |
| Medium | Standard problems affecting your work |
| High | Significant issue affecting multiple users |
| Urgent | System down, data loss, security concern |

---

## 18. Troubleshooting

### I cannot log in

- Check that your email and password are correct (passwords are case-sensitive)
- Click **Forgot password?** to reset your password
- If your account is locked after multiple failed attempts, wait 5 minutes and try again
- Contact your institution administrator if the issue persists

### The page shows a security warning

The system uses a self-signed SSL certificate for internal network use. Your browser will show a security warning on first access — this is expected for systems hosted within a government intranet.
- In Chrome/Edge: Click **Advanced** → **Proceed to [address] (unsafe)**
- In Firefox: Click **Advanced** → **Accept the Risk and Continue**
- This only needs to be done once per browser per device
- When the system is deployed on a public government server, a trusted SSL certificate will be installed and this warning will no longer appear

### My session expired

Your session expires after 15 minutes of inactivity. Log in again — your work in the system is saved.

### I cannot submit data

Possible reasons:
- The reporting period is **locked** — contact your M&E Officer or Admin
- The indicator is not assigned to your institution — contact your M&E Officer
- Your role does not have Data Collector or higher permissions

### I cannot find my submission

- Check the **Data Entry** page and filter by **All Statuses**
- Approved submissions may have been archived — check the approved filter

### The system is slow or unresponsive

- Check your internet/WiFi connection
- Refresh the page (F5)
- Clear your browser cache (Ctrl+Shift+Delete)
- If the problem persists, contact support

### I get "Access Denied" on a page

Your user role does not have permission to access that page. Contact your administrator to request elevated access if needed.

### Charts or data are not loading

- Ensure you are connected to the same network as the server
- Try refreshing the page
- Check the notification bell (top of sidebar) for any system alerts

---

## Appendix A — Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| F5 | Refresh page |
| Ctrl + F | Search within a page |
| Escape | Close a modal/popup |
| Tab | Move between form fields |

---

## Appendix B — Glossary

| Term | Definition |
|------|------------|
| Actual | The measured value achieved for an indicator in a reporting period |
| Baseline | The starting value of an indicator before the strategic plan begins |
| Data Collector | A user responsible for submitting indicator data for their institution |
| Fiscal Year | Tanzania government fiscal year (July–June, e.g. 2025/2026) |
| Indicator | A measurable metric used to track progress toward a strategic objective |
| M&E | Monitoring and Evaluation |
| Outcome | The medium-term result expected from a set of outputs |
| Output | A direct deliverable produced by activities |
| Period Lock | A system control that prevents new submissions for a closed reporting period |
| Reporting Period | Q1 (Jul–Sep), Q2 (Oct–Dec), Q3 (Jan–Mar), Q4 (Apr–Jun), or Annual |
| Results Framework | The structured hierarchy linking activities to strategic objectives |
| Strategic Objective | A high-level goal in the MIT Strategic Plan 2026/27–2030/31 |
| Target | The planned value an indicator should reach in a given period |

---

## Appendix C — System Information

| Item | Detail |
|------|--------|
| System Name | MIT M&E System |
| Version | 1.0 |
| Developer | ICT Unit, Ministry of Industry and Trade |
| Database | PostgreSQL 16 |
| Technology | Node.js + React 18 |
| Access | HTTPS (port 5443) |
| Support Email | helpdesk@mit.go.tz |

---

*Ministry of Industry and Trade — M&E System User Manual v1.0*
*For technical support, use the Contact Support button on the login page or submit a ticket through the Helpdesk.*
