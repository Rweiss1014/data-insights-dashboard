# Data Insights Dashboard - Changelog

## [Unreleased]

### 2025-12-06 - Supabase Integration & UI Cleanup

#### Added
- **Supabase Authentication System**
  - Magic link (passwordless) email authentication
  - Sign In button in header
  - Auth modal with email input
  - Session persistence across page refreshes

- **Dashboard Persistence**
  - Save dashboards to cloud (Supabase)
  - Load saved dashboards
  - Delete saved dashboards
  - "My Dashboards" modal to browse saved dashboards
  - "Save" button appears when user is logged in and has charts

- **Backend API Endpoints**
  - `GET /api/config` - Provides Supabase URL and anon key to frontend
  - `GET /api/dashboards` - List user's saved dashboards
  - `POST /api/dashboards` - Save a new dashboard
  - `GET /api/dashboards/:id` - Get a specific dashboard
  - `DELETE /api/dashboards/:id` - Delete a dashboard
  - `GET /api/sessions` - List user's sessions
  - `POST /api/sessions` - Save a session
  - `PUT /api/sessions/:id` - Update a session
  - `DELETE /api/sessions/:id` - Delete a session

- **Database Schema** (`supabase-schema.sql`)
  - `dashboards` table - stores dashboard metadata
  - `dashboard_cards` table - stores individual chart configurations
  - `sessions` table - stores chat history and analysis sessions
  - `datasets` table - stores dataset metadata
  - `dataset_joins` table - stores multi-file join configurations
  - Row Level Security (RLS) policies for user data isolation
  - Performance indexes

- **New Files**
  - `auth.js` - Frontend authentication and dashboard persistence logic
  - `supabase-schema.sql` - Database schema for Supabase

#### Changed
- **Removed Settings/API Key Modal** - API keys (OpenAI, Supabase) are now configured only in backend `.env` file, not exposed to frontend users
- **Updated `.env.example`** - Added Supabase configuration variables
- **Updated `server.js`** - Added Supabase client, auth middleware, and persistence endpoints
- **Updated `index.html`** - Added auth modals, removed settings button

#### Security
- API keys no longer exposed in frontend
- JWT token verification for authenticated endpoints
- Row Level Security ensures users can only access their own data

---

## Previous Changes (from conversation history)

### 2025-12-06 - Chart Fixes & Testing

#### Fixed
- **Pie Chart Data Accuracy** - Pie charts now sum across ALL colKeys instead of just the first one
- **Blank Dashboard Charts** - Fixed filter conflict between global dashboard filters and chart-specific filters
- **Dashboard Sorting Bug** - Fixed `pivotResult.grid` reference (doesn't exist) to use `pivotResult.getValue()`

#### Added
- **Auto-Resize Charts** - `calculateChartHeight()` function dynamically adjusts chart height based on data size
- **Jest Tests** - 28 tests covering pivot, parseNumericValue, calculateChartHeight, applyQueryFilters, preparePieChartData, prepareBarChartData
- **Test Files**
  - `chartFunctions.js` - Extracted functions for testing
  - `chartFunctions.test.js` - Jest test suite

### Earlier - Initial Development

#### Features
- Excel/CSV file upload and parsing
- Multi-sheet support
- Natural language query processing with OpenAI
- Pivot table generation
- Multiple chart types (bar, line, pie, doughnut, area, horizontal bar)
- Dashboard with pinnable charts
- Global filters/slicers
- Presentation mode
- Export to Excel
- AI-generated query suggestions

---

## Configuration

### Environment Variables (`.env`)
```
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-key-here

# Server Configuration
PORT=3001

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Supabase Setup
1. Create a Supabase project at https://supabase.com
2. Run `supabase-schema.sql` in the SQL Editor
3. Copy API credentials to `.env` file
4. Restart server

---

## File Structure
```
PivotTables/
├── index.html          # Main HTML file
├── script.js           # Core frontend logic
├── auth.js             # Authentication & persistence
├── style.css           # Custom styles
├── server.js           # Express backend
├── analytics_handlers.js
├── analytics_service.py
├── chartFunctions.js   # Extracted chart functions
├── chartFunctions.test.js # Jest tests
├── supabase-schema.sql # Database schema
├── package.json
├── .env                # Environment variables (not committed)
├── .env.example        # Environment template
└── CHANGELOG.md        # This file
```
