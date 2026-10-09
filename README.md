# RepoLens - GitHub Repository Architecture Visualizer & Module Analyzer

A full-stack developer tool built with **React**, **Node.js (Express)**, and **PostgreSQL** that analyzes any GitHub repository or uploaded `.zip` archive, generates an interactive module dependency graph, and provides deep code explanations of how modules work and what they do.

---

## Features

- **GitHub Repo & Zip Upload Support**:
  - Analyze public GitHub repositories directly by pasting the URL (e.g., `https://github.com/expressjs/express`).
  - Upload local codebase `.zip` archives via drag-and-drop.
- **Interactive Inter-Module Graph**:
  - Visual dependency graph powered by `@xyflow/react` (React Flow).
  - Node layout by architectural layer (routes, controllers, services, models, components, utils).
  - Interactive edge highlighting (inbound callers in green, outbound imports in indigo).
  - Search modules by name or file path.
  - Filter by architectural layer.
- **Deep Module Inspector**:
  - **What It Does**: High-level single-responsibility explanation.
  - **How The Code Works**: Step-by-step breakdown of execution flow, declared classes/functions, and dependency call patterns.
  - **Source Code Viewer**: Embedded syntax viewer with line numbers and one-click copy.
  - **Interconnection Navigator**: Click any inbound/outbound module to jump straight to it.
- **Architecture & Health Dashboard**:
  - Project scale metrics: total modules, lines of code (LOC), dependency density.
  - Architectural layer distribution.
  - Central hubs identification (most-coupled modules).
- **PostgreSQL Persistence**:
  - Relational schema storing repositories, AST modules, and dependency links.
  - Includes `docker-compose.yml` for instant database startup.

---

## Quick Start

### 1. Start PostgreSQL (Docker)
```bash
docker compose up -d
```
*(If you do not have Docker running, the server automatically uses an in-memory database fallback so you can test immediately without interruption).*

### 2. Install Server Dependencies & Start
```bash
cd server
npm install
npm run dev
```
Server runs on: `http://localhost:5000`

### 3. Install Client Dependencies & Start
```bash
cd ../client
npm install
npm run dev
```
Frontend runs on: `http://localhost:5173`

---

## Database Schema (PostgreSQL)

- **`repositories`**: Stores repository metadata, tech stack, and architectural summary.
- **`modules`**: Stores parsed module files, LOC, AST symbols, and explanations.
- **`module_dependencies`**: Stores directed edges between modules with imported specifiers.
