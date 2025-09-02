# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A fullstack application for managing company collections with bulk operations, featuring a Python FastAPI backend and React/TypeScript frontend with Material-UI.

## Quick Start

```bash
# Terminal 1: Start backend services
cd backend
docker compose up

# Terminal 2: Start frontend
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173 in your browser. The backend will auto-seed 10,000 companies on first run.

## Architecture

### Backend (FastAPI + PostgreSQL + Elasticsearch)
- **Entry Point**: `backend/main.py` - FastAPI app with automatic database seeding and CORS configuration
- **Database Models**: `backend/backend/db/database.py` - SQLAlchemy models for Company, CompanyCollection, and associations
- **API Routes**: 
  - `/companies` - Paginated company listing with liked/ignored status
  - `/companies/check-statuses` - Check which companies have liked/ignored statuses
  - `/companies/check-conflicts` - Check for conflicts before bulk operations
  - `/collections` - Collection management with bulk add/remove operations
  - `/collections/{id}/companies/bulk-add` - Bulk add companies to collection
  - `/collections/{id}/companies/bulk-remove` - Bulk remove companies from collection
  - `/search` - Elasticsearch-powered natural language search
  - `/search/ids` - Search and return only company IDs for bulk operations
  - `/search/suggest` - Autocomplete suggestions for search queries
  - `/ws/operations/{id}` - WebSocket endpoint for real-time operation progress
- **Search Engine**: Elasticsearch integration for advanced text search and aggregations
- **Auto-seeding**: On first run, creates 10,000 companies with 3 pre-configured collections (My List, Liked Companies List, Companies to Ignore List)

### Frontend (React + TypeScript + Vite)
- **Entry Point**: `frontend/src/App.tsx` - Main app with Google Docs-inspired light theme
- **API Clients**: 
  - `frontend/src/utils/jam-api.ts` - Core API wrapper for companies and collections
  - `frontend/src/utils/search-api.ts` - Elasticsearch search API integration
- **Key Components**: 
  - `EnhancedCompanyTable` - MUI DataGrid with custom selection, status toggles, and keyboard shortcuts
  - `SmartSearchBar` - Natural language search with autocomplete and history
  - `BulkActionBar` - Context-aware bulk actions (Like, Ignore, Clear Statuses, Delete)
  - `ConflictResolutionDialog` - Handle conflicts when moving companies between collections
  - `ClearStatusesDialog` - Review dialog showing affected companies by status
  - `ProgressModal` - Real-time progress tracking for bulk operations via WebSocket
  - `CompanyFilters` - Advanced filtering UI for company attributes
  - Charts components - Industry distribution, funding timeline, valuation trends
- **Features**:
  - Natural language search ("fintech in NYC", "series B with 18 employees")
  - Multi-select with shift-click and Ctrl/Cmd-click
  - Keyboard shortcuts (Ctrl+A select all, Delete remove, Escape clear)
  - Status cycling (none → liked → ignored → none)
  - Context-specific bulk actions per collection
  - Real-time progress updates for bulk operations
  - Smart filtering with visual indicators
  - Column visibility controls and sticky columns
- **Styling**: Material-UI light theme with Google Docs-inspired design

## Commands

### Backend Development

```bash
cd backend

# Install dependencies (Python 3.9+ required)
poetry install

# Start backend with PostgreSQL (port 8000)
docker compose up

# Development with hot reload
docker compose up --build

# Linting
poetry run ruff check .

# Reset database and Elasticsearch (removes all data)
docker compose down
docker volume rm backend_postgres_data backend_elasticsearch_data
docker compose build --no-cache
docker compose up
```

### Frontend Development

```bash
cd frontend

# Install dependencies (Node 18+ or 20+ required)
npm install

# Development server (port 5173)
npm run dev

# Production build
npm run build

# Type checking
npm run build  # Uses tsc -b

# Linting
npm run lint
```

### Database Access

```bash
# SSH into PostgreSQL container
docker exec -it backend_postgres-jam-db_1 /bin/bash

# Access PostgreSQL CLI
psql -U postgres harmonicjam

# Useful queries
\dt                    # List all tables
SELECT * FROM companies LIMIT 10;
SELECT * FROM company_collections;
```

## Key Configuration

### Backend
- **Database URL**: Set via `DATABASE_URL` env var in docker-compose.yml
- **Elasticsearch URL**: Set via `ELASTICSEARCH_URL` env var (http://elasticsearch:9200)
- **CORS**: Configured for `http://localhost:5173-5175` (frontend dev servers)
- **Ports**: 
  - API: 8000
  - Debugpy: 5678
  - PostgreSQL: 5433
  - Elasticsearch: 9200

### Frontend
- **API Base URL**: Hardcoded to `http://localhost:8000` in `jam-api.ts` and `search-api.ts`
- **Vite Config**: Uses React SWC plugin for fast refresh
- **Selection Context**: Global state management for multi-select operations
- **WebSocket**: Connects to `ws://localhost:8000/ws/operations/{id}` for progress tracking

## Development Notes

### Performance Considerations
- Database includes a deliberate throttle trigger (100ms delay) on `company_collection_associations` inserts to simulate slow updates
- Elasticsearch indexes are automatically created on startup with proper mappings
- Virtual scrolling via MUI DataGrid handles 10,000+ rows efficiently
- WebSocket connections provide real-time updates without polling overhead
- Search queries are debounced (300ms) to reduce API calls

### Data Management
- Backend auto-seeds on startup if `harmonic_settings.seeded` is not present
- Creates 10,000 companies with randomized but realistic data
- Collection IDs are dynamically generated - use collection names for identification
- Three default collections: "My List", "Liked Companies List", "Companies to Ignore List"

### UI/UX Features
- Frontend uses MUI DataGrid (free version) with custom selection implementation
- Collections sidebar shows real-time counts for each collection
- Bulk operations support WebSocket progress tracking with estimated time remaining
- Clear Statuses feature only processes companies with actual statuses, not all selected
- Conflict resolution dialog handles duplicate detection when moving between collections
- Smart search supports natural language queries like "fintech in NYC" or "series B with 18 employees"
- Sticky columns for important fields (name, location) during horizontal scrolling

### Testing & Debugging
- Debugpy enabled on port 5678 for Python debugging
- React Developer Tools and Redux DevTools compatible
- Hot module replacement (HMR) for rapid frontend development
- Docker logs accessible via `docker compose logs -f [service-name]`