# Gym Manager SaaS — Local Development & Database Setup Guide

This guide details the local development lifecycle, database connectivity options, pre-flight health diagnostics, and troubleshooting procedures.

---

## 1. Prerequisites

- **Node.js**: v20.x or v22.x LTS
- **npm**: v10+
- **Supabase Account / Project** OR **Local PostgreSQL / Docker**

---

## 2. Environment Configuration

1. Copy the template to create your local `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure your database settings based on your chosen development workflow below.

---

## 3. Database Workflow Options

### Option A: Supabase Direct Connection (Recommended for Local Dev & Migrations)

Connects directly to the Supabase PostgreSQL instance over TLS (Port 5432).

1. Retrieve the **Direct Connection String** from your Supabase Dashboard:
   - Navigate to **Project Settings** → **Database** → **Connection String** → **URI** (Direct, Port 5432).
2. Configure `.env`:
   ```ini
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?sslmode=require
   DATABASE_MODE=supabase
   SQL_SSL=true
   SQL_MAX_CONNECTIONS=5
   ```

---

### Option B: Supabase Session Pooler (For Cloud Run & IPv4 Restricted Environments)

Recommended for Cloud Run production and local environments lacking direct IPv6 resolution:

1. Retrieve the **Session Pooler Connection String** from your Supabase Dashboard:
   - Navigate to **Project Settings** → **Database** → **Connection String** → **Session Mode** (Port 5432).
2. Configure `.env`:
   ```ini
   DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
   DATABASE_MODE=supabase
   SQL_SSL=true
   SQL_MAX_CONNECTIONS=5
   ```

---

### Option C: Local PostgreSQL or Docker (Offline Development)

If developing offline:

1. **Start PostgreSQL via Docker (Terminal 1)**:
   ```bash
   docker run --name gym-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=postgres -d postgres:16-alpine
   ```

2. **Configure `.env`**:
   ```ini
   DATABASE_MODE=local
   SQL_HOST=127.0.0.1
   SQL_PORT=5432
   SQL_USER=postgres
   SQL_PASSWORD=postgres
   SQL_DB_NAME=postgres
   SQL_SSL=false
   ```

---

### Option D: Legacy Google Cloud SQL / Cloud SQL Auth Proxy (Rollback Fallback)

If rollback to Google Cloud SQL is ever required:

1. **Start the Cloud SQL Proxy**:
   ```bash
   cloud-sql-proxy <PROJECT_ID>:<REGION>:<INSTANCE_NAME> --port 5432
   ```
2. **Configure `.env`**:
   ```ini
   DATABASE_MODE=local-proxy
   SQL_HOST=127.0.0.1
   SQL_PORT=5432
   SQL_USER=postgres
   SQL_PASSWORD=<your_cloud_sql_password>
   SQL_DB_NAME=postgres
   SQL_SSL=false
   ```

---

## 4. Database Migrations & Schema Synchronization

Apply version-controlled schema migrations with Drizzle:

```bash
# Apply version-controlled migration files to database
npm run db:migrate

# Generate new migration files after modifying src/db/schema.ts
npm run db:generate

# Visual database inspector (Drizzle Studio)
npm run db:studio
```

---

## 5. Running the Application

In your main terminal:

```bash
# Start the full-stack development server
npm run dev
```

### Expected Startup Lifecycle:
1. **Environment Initialization**: Loads `.env` variables.
2. **Pre-flight Database Check**: Executes `SELECT 1` ping and measures latency.
3. **Safe Idempotent Seed**: Checks if `gyms` table contains records; seeds demo dataset if empty.
4. **HTTP Server Listen**: Starts Express + Vite on `http://localhost:3000`.

---

## 6. Health & Diagnostics Endpoints

You can verify application health at any time:

- **Process / Application Health**:
  ```bash
  curl http://localhost:3000/api/health
  # Response: {"status":"ok","service":"gym-manager-saas","uptimeSeconds":14,"timestamp":"..."}
  ```

- **Database Connectivity Health**:
  ```bash
  curl http://localhost:3000/api/health/db
  # When connected (200 OK):
  # {"status":"ok","database":"connected","latencyMs":3,"config":{"host":"db...","port":5432,"database":"postgres","mode":"supabase","ssl":true}}
  ```

---

## 7. Troubleshooting Common Database Errors

| Error Code | Meaning | Actionable Fix |
|---|---|---|
| `ECONNREFUSED` | Nothing listening on target host/port | Verify `DATABASE_URL` in `.env`. Check Supabase project status or local Docker. |
| `28P01` | Password authentication failed | Verify DB password in `DATABASE_URL` or `SQL_PASSWORD` in `.env`. |
| `3D000` | Database does not exist | Supabase default database is `postgres`. |
| `42P01` | Relation / table does not exist | Run `npm run db:migrate` to apply version-controlled migrations. |
| `ETIMEDOUT` | Connection timed out | Check network connection, firewall, or use the Supabase Session Pooler (IPv4). |
