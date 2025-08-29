# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A fullstack application for managing company collections with a Python FastAPI backend and React/TypeScript frontend.

## Architecture

### Backend (FastAPI + PostgreSQL)
- **Entry Point**: `backend/main.py` - FastAPI app with automatic database seeding
- **Database Models**: `backend/backend/db/database.py` - SQLAlchemy models for Company, CompanyCollection, and associations
- **API Routes**: 
  - `/companies` - Paginated company listing with liked status
  - `/collections` - Collection management and company fetching by collection
- **Auto-seeding**: On first run, creates 10,000 companies with 3 pre-configured collections

### Frontend (React + TypeScript + Vite)
- **Entry Point**: `frontend/src/App.tsx` - Main app with Material-UI theming
- **API Client**: `frontend/src/utils/jam-api.ts` - Axios-based API wrapper
- **Components**: Company table with MUI DataGrid for pagination and display
- **Styling**: Tailwind CSS + Material-UI dark theme

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

# Reset database (removes all data)
docker compose down
docker volume rm backend_postgres_data
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
- **CORS**: Configured for `http://localhost:5173` (frontend dev server)
- **Ports**: API on 8000, debugpy on 5678, PostgreSQL on 5433

### Frontend
- **API Base URL**: Hardcoded to `http://localhost:8000` in `jam-api.ts`
- **Vite Config**: Uses React SWC plugin for fast refresh

## Development Notes

- Database includes a deliberate throttle trigger (100ms delay) on `company_collection_associations` inserts to simulate slow updates
- Backend auto-seeds on startup if `harmonic_settings.seeded` is not present
- Frontend uses MUI DataGrid for efficient handling of large datasets
- Collections sidebar dynamically updates URL params for state management