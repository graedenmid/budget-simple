Budget Simple Product Requirements Document (PRD)
#1. Background and Purpose
##Objective: Simplify personal finance management by replacing cumbersome spreadsheet-based budgeting with an automated, user-friendly web application.

##Context:
###Current Problem: Manual budgeting with spreadsheets (e.g., Google Sheets) requires repetitive data entry, complex formulas, and lacks real-time tracking, historical analysis, or intelligent suggestions. This is error-prone and time-consuming.
###Solution: Budget Simple, a web-based application, automates calculations, tracks income, expenses, and savings in real-time, and supports envelope-style budgeting based on user income cadence.
###Key Features:
####Automates budget calculations and expense tracking.
####Supports fixed or percentage-based budget items (gross, net, or conditional net income).
####Tracks spending per paycheck and logs one-off expenses.
####Provides data-driven suggestions for allocating surplus funds (e.g., savings, debt repayment).
###Inspiration: Combines spreadsheet flexibility with an intuitive, mobile-friendly interface.
###Infrastructure: Hosted on Vercel (frontend) and Supabase (backend), prioritizing simplicity, speed, privacy, and flexibility.

#2. Vision and Goals
##Vision: Empower users to manage finances through a simple, intuitive, and automated budgeting application that blends spreadsheet flexibility with an easy-to-use interface.

##Goals:
###Automation: Enable budget items as fixed amounts or percentages, eliminating manual calculations.
###Flexibility: Support varied income/expense cadences (weekly, bi-weekly, monthly, quarterly, annually).
###Tracking: Allow marking bills/expenses as paid, maintain running budget records, and provide real-time budget health visibility.
###Categorization: Log and categorize budgeted and non-budgeted expenses.
###Recommendations: Offer data-driven suggestions for allocating surplus funds (e.g., savings, debt reduction).

##User Impact Objectives:
###Reduce monthly budgeting setup time by 80% compared to spreadsheets.
###Enable users to allocate ≥20% of discretionary income to savings or debt repayment.
###Achieve a Net Promoter Score (NPS) ≥40 within three months of beta launch.

#3. Target Users and Personas
##Target Users:
###Primary: Spreadsheet users seeking a streamlined, automated budgeting solution.
###Secondary: Users valuing percentage-based budgeting, cadence-specific tracking, or automated financial recommendations.
###Tertiary: Anyone seeking simplified budgeting with intelligent suggestions and minimal manual effort.

##User Personas:
###Spreadsheet Budgeter:
####Manages budgets in spreadsheets, understands gross vs. net income, uses formulas.
####Needs automation for marking bills as paid, tracking ad-hoc spending, and visualizing progress.
###Salary Earner Sam:
####Mid-20s to 40s professional with regular (e.g., bi-weekly) paychecks.
####Seeks automated budgeting and recurring expense management.
###Gig Worker Gia:
####Freelancer/gig worker with variable income cadence.
####Requires flexible budgeting and irregular income tracking.
###Family CFO Fran:
####Manages household budgets with multiple recurring bills.
####Needs simplified, automated family finance tools.

#4. Core Features
##a. User Authentication & Onboarding
###Secure account creation/login (email/password, social logins, passwordless).
###Password recovery.
###Onboarding: Input gross/net income, select income cadence (weekly, bi-weekly, semi-monthly, monthly, etc.).

##b. Income Management
###Add/manage multiple income sources (name, gross/net amounts, payment frequency).
###Support for cadences: weekly, bi-weekly, monthly, quarterly, annually.
###Automatic pro-rating and validation (net ≤ gross).
###Dynamic calculations based on income data.

##c. Budget Item Configuration
###Create/edit/delete budget items with:
####Name and category (Bills, Savings, Debt, Giving, Discretionary, Other).
####Calculation type: fixed amount, % of gross/net/conditional net income.
####Custom cadence (aligned to income or custom).
####Priority order for conditional calculations.
####Dependency management for “remaining income” calculations.

##d. Paycheck & Expense Tracking
###Auto-generate expected allocations per pay period; allow marking items as paid/fulfilled.
###Log non-budgeted expenses (amount, date, merchant, category: e.g., groceries, entertainment).
###Assign categories to budgeted/non-budgeted expenses.
###Real-time calculation of remaining budget and running balances.
###Historical expense tracking/reporting.

##e. Smart Recommendations & Leftover Allocation
###Calculate leftover funds after budget items/expenses.
###Provide prioritized suggestions for surplus allocation (e.g., savings, debt, buffer).
###One-click recommendation application.
###Customizable recommendation priorities.

##f. Additional Features (Stretch/Post-MVP)
###Dashboard: Snapshot of budget status, expected allocations, leftover funds, category charts, historical trends, month-over-month comparisons.
###Calendar view: Upcoming bills/obligations.
###Progress tracking: Savings/debt goals.
###CSV export: Transactions/budget history.
###Mobile PWA: Offline mode.
###Plaid integration: Automatic transaction imports.
###Shared budgets: Multi-user support.
###Localization: Multiple currencies.

#5. Technical Requirements and Data Models
##Architecture & Tech Stack
###Frontend:
###Next.js 14 (React 18) with TypeScript.
###Tailwind CSS, Shadcn/ui for styling.
###Deployed on Vercel.

##Backend & Database:
###Supabase (PostgreSQL) for database, authentication, storage, instant APIs.
###Supabase Edge Functions (TypeScript) for business logic (e.g., suggestions, calculations).
###Row-Level Security (RLS) per user.

##Authentication:
Supabase Auth (JWT-based, email/password, social logins, passwordless).
Secure login, password recovery, account management.

##Integrations & CI/CD:
###GitHub Actions: Linting, unit tests, type checks.
###Optional: Notification service, currency conversion API, Vercel analytics.

##Data Models (Supabase PostgreSQL)
###users:
####id (string, PK)
####email (string)
####name (string)
####created_at (Date)
####updated_at (Date)
###income_sources:
####id (string, PK)
####user_id (string, FK)
####name (string)
####gross_amount (number)
####net_amount (number)
####cadence (enum: weekly, bi-weekly, semi-monthly, monthly, quarterly, annual)
####start_date (Date)
####is_active (boolean)
###budget_items:
####id (string, PK)
####user_id (string, FK)
####name (string)
####category (string: Bills, Savings, Debt, Giving, Discretionary, Other)
####calc_type (enum: FIXED, GROSS_PERCENT, NET_PERCENT, REMAINING_PERCENT)
####value (number)
####cadence (enum)
####depends_on (array of budget_item_ids)
####priority (number)
####is_active (boolean)
###pay_periods:
####id (string, PK)
####user_id (string, FK)
####start_date (Date)
####end_date (Date)
####income_source_id (string, FK)
####expected_net (number)
####actual_net (number)
####status (enum: ACTIVE, COMPLETED)
###allocations:
####id (string, PK)
####pay_period_id (string, FK)
####budget_item_id (string, FK)
####expected_amount (number)
####actual_amount (number)
####status (enum: PAID, UNPAID)
###expenses:
####id (string, PK)
####user_id (string, FK)
####pay_period_id (string, FK)
####category (string)
####description (string)
####amount (number)
####date (Date)
####budget_item_id (string, FK, nullable)
####type (enum: BUDGET_PAYMENT, EXPENSE)
###suggestions:
####id (string, PK)
####pay_period_id (string, FK)
####type (string: savings, debt, buffer, etc.)
####amount (number)
####status (enum: PENDING, APPLIED)

##Non-Functional Requirements
###Performance:
####First Contentful Paint: <2s (desktop), <3.5s (mobile).
####Page load time: <3s.
####Database queries: <500ms.
####Real-time budget calculations.
###Availability & Scalability:
####99.5% monthly uptime.
####Support 100+ users with efficient DB indexes/edge functions.
###Security & Compliance:
####RLS and JWT-based authentication.
####Data encryption, HTTPS, input validation/sanitization, rate limiting.
####OWASP mitigations, GDPR-compliant.
###Accessibility: WCAG 2.1 AA compliance.
###Analytics: Vercel Analytics for usage tracking (onboarding, pay period reconciliation, suggestion acceptance).

##Assumptions & Dependencies
###Users comfortable with manual transaction entry (MVP).
###Supabase free tier sufficient for MVP.

#6. User Experience and Interface
##User Flow & Journey
###Setup:
####Account creation, input gross/net income, select cadence.
####Configure budget items (name, type, value, cadence, dependencies).
####Onboarding prepares users for first budgeting cycle.
###Budget Tracking:
####On payday, verify income, mark bills/items as paid, view surplus suggestions.
####Log non-budgeted expenses, assign categories, view updated funds.
####Running summary of budget status/spending history.
###Optimization:
####Calculate leftover funds, provide actionable recommendations.
####Review/apply recommendations to optimize budget.

##Key Screens & Interface Elements
###Dashboard: Budget status, remaining amounts, upcoming bills, suggestions, budget health visualization.
###Income Setup Page: Form for gross/net income, cadence updates.
###Budget Items Page: List/manage budget items (add/edit/delete; fields: name, type, value, cadence, dependencies).
###Expenses Page: Log non-budgeted expenses (amount, date, merchant, category); view history/trends.
###Bill Payment Page: List bills/items, mark as paid, view upcoming payments/due dates.
###Analytics Page: Charts/reports on spending trends, historical data, comparisons.
###Recommendations Page: Suggestions for surplus allocation, one-click application.

##Mobile & Accessibility
###Mobile-responsive design for on-the-go expense/budget management.
###Fast navigation: Complete payday actions in <2 minutes.
###WCAG 2.1 AA compliance for inclusivity.

#7. Success Metrics
##User Engagement & Retention
###Daily Active Users (DAU), Weekly Active Users (WAU).
###Retention rates (7-day, 30-day, 90-day).
###Average session duration.
###Feature adoption (recommendations, analytics, expense logging).
###Average budget items/expenses logged per user.

##Financial & Behavioral Outcomes
###Average budget adherence rate.
###Percentage of pay periods fully reconciled.
###Percentage of users accepting recommendations.
###Amount of suggested reallocations accepted.

##User Experience & Efficiency
###Average time for initial budget setup.
###Average time to log paycheck event (<2 minutes).
###User satisfaction with calculations/usability.

##Accuracy & Reliability
###Calculation error rate (<0.1%).
###Percentage of users satisfied with budget accuracy.
