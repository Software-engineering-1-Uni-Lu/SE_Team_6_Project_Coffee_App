# **Café Aroma — Software Engineering Project**

A full-stack café management system developed for the Software Engineering course.  
The project demonstrates end-to-end application of **software engineering principles**, including Scrum, CI/CD, secure backend architecture, and structured frontend development.

---

# Table of Contents

1. [Project Overview](#project-overview)  
2. [Software Engineering Methodology](#software-engineering-methodology)  
3. [Architecture](#architecture)  
4. [Technologies Used](#technologies-used)  
5. [Repository Structure](#repository-structure)  
6. [Branching Strategy](#branching-strategy)  
7. [Commit Style](#commit-style)  
8. [Development Workflow](#development-workflow)  
9. [CI/CD Pipeline](#cicd-pipeline)  
10. [Environment Setup](#environment-setup)  
11. [Running the Project](#running-the-project)  
12. [Authentication & Roles](#authentication--roles)  
13. [Database Overview](#database-overview)  
14. [Security](#security)

---

# Project Overview

The Café Aroma application is a role-based management system enabling:

- **Customers** to browse the menu, manage a cart, checkout, track orders, and earn loyalty points  
- **Staff** to process orders and manage workflow  
- **Managers/Admins** to manage menu items, staff, categories, operational settings, refunds, and customer issues  

This application follows a rigorous software engineering workflow and demonstrates:
- structured requirements  
- epics, user stories, tasks  
- clean architecture  
- automated testing  
- CI/CD  
- secure database access with Row-Level Security  

---

# Software Engineering Methodology

The project was developed using **Scrum** with lightweight ceremonies:

### Scrum Elements
- **Epics** define high-level objectives (e.g., Authentication, Menu, Orders)  
- **User Stories** express end-user requirements using the standard format:  
  > As a *role*, I want *feature* so that *benefit*.  
- **Tasks** break stories into implementable work units  
- **Sprints** organize incremental delivery  
- **Sprint Reviews** demonstrate completed increments  
- **Backlog Refinement** ensures stories are well-scoped and testable  

### Definition of Done
A story is considered _Done_ when:
- Code implemented  
- Type-safe & lint-clean  
- Tested manually  
- Passing CI pipeline  
- Accessible UI  
- Integrated into the main flow  

---

# Architecture

## High-Level Architecture
```
Frontend (React + Vite + TypeScript)
↓
Supabase Authentication
↓
Postgres Database (RLS-secured)
↓
Supabase Edge Functions (server logic)
```


### Key Architectural Decisions
- **Client-heavy model** with secure server-side enforcement via RLS  
- **Role-Based Access Control (RBAC)** enforced both in DB and in frontend routing  
- **Schema-first development** using Supabase migrations  
- **Strict JSON validation** for cart and orders  
- **Modular UI components** for reusability and testability  

---

# Technologies Used

### Frontend
- React  
- TypeScript  
- Vite  
- Tailwind CSS  
- shadcn/ui  
- TanStack Query (server-state management)  

### Backend & Database
- Supabase Auth  
- Supabase Postgres  
- Row-Level Security (RLS)  
- Supabase Edge Functions  
- SQL migrations  

### DevOps
- GitHub  
- GitHub Actions (CI)  
- Vercel (CD for frontend)  
- Supabase (backend hosting)  

---

# Repository Structure
```
/
├─ src/
│  ├─ components/      # Reusable UI
│  ├─ pages/           # Public routes
│  ├─ pages/admin/     # Admin/staff routes
│  ├─ hooks/           # Custom hooks (auth, cart, roles)
│  ├─ integrations/    # Supabase client configuration
│  ├─ lib/             # Utilities
│  └─ styles/          # Tailwind base styles
│
├─ supabase/
│  ├─ migrations/      # SQL migrations
│  ├─ functions/       # Edge functions
│  └─ policies/        # RLS policies
│
├─ .github/workflows/  # CI pipelines
├─ package.json
└─ README.md
```


---

# Branching Strategy

> **Never commit directly to `main`. All development happens in `dev`.**

| Branch Prefix | Purpose                     |
|---------------|-----------------------------|
| `feature/`    | new features                |
| `refactor/`   | restructures & optimizations|
| `bugfix/`     | fixes for known issues      |
| `hotfix/`     | urgent production fixes     |
| `chore/`      | maintenance work            |

### Examples
`feature/auth-flow`  
`feature/customer-checkout`  
`refactor/admin-ui`  
`bugfix/cart-sync`  
`hotfix/login-redirect`  
`chore/update-deps`

---

# Commit Style

Use clear and consistent commit messages:

- `feat:` add staff order queue  
- `fix:` resolve cart duplication  
- `refactor:` simplify auth provider  
- `chore:` update dependencies  

---

# Development Workflow

1. Pull latest `dev` branch  
2. Create a feature branch  
3. Implement story/tasks  
4. Run tests + type checks  
5. Push → GitHub triggers CI  
6. Open PR → reviewed → merged into `dev`  
7. Successful builds auto-deploy to Vercel preview  
8. After sprint, `dev` → `main`  

---

# CI/CD Pipeline

### Continuous Integration (GitHub Actions)
Every PR triggers automated checks:
- Install dependencies  
- TypeScript type checking  
- ESLint linting  
- Vite build verification  
- Preview deployment on Vercel  

### Continuous Deployment
- Merges to `dev` → preview deployment  
- Merges to `main` → production deployment  

---

# Environment Setup

### 1. Clone Repository
```bash
git clone <repo-url>
cd project
```

### 2. Install Dependencies
```
npm install
```

### 3. Configure Environment Variables
Create .env:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

----------

# **Running the Project**

### **Development**

`npm run dev` 

### **Production Build**

`npm run build
npm run preview` 

----------

# **Authentication & Roles**

Supabase authentication is used for all roles:

-   **customer**
-   **staff**
-   **admin**

Role assignment occurs during registration through metadata.  
Routing is protected using:

-   `AdminRoute` (admin-only)
-   `RoleEnforcer` (redirects users to allowed areas)
    

----------

# **Database Overview**

### **Core Tables**

-   `profiles`
-   `user_roles`
-   `items`
-   `categories`
-   `beans`
-   `orders`
-   `carts`
-   `loyalty_ledger`
-   `refunds`
-   `issues`
-   `settings`
    

### **Supabase RLS**

The project uses strict security rules:
-   Users can only access their own data
-   Staff can manage orders
-   Admins have complete visibility
    
----------

# **Security**

The system incorporates:
-   Row-Level Security (RLS)
-   Auth metadata validation
-   Role-based routing
-   Restricted admin operations
-   Validation for cart and order payloads
-   No secret keys exposed in frontend code
