# **Café Aroma — Software Engineering Project**

A full-stack café management system developed for the Software Engineering course.
The project demonstrates end-to-end application of **software engineering principles**, including Scrum, CI/CD, secure backend architecture, and structured frontend development.

---

# Table of Contents

1. [Project Overview](#project-overview)
2. [Software Engineering Methodology](#software-engineering-methodology)
3. [Architecture](#architecture)
4. [Technologies Used](#technologies-used)
5. [Features](#features)
6. [Repository Structure](#repository-structure)
7. [Branching Strategy](#branching-strategy)
8. [Commit Style](#commit-style)
9. [Development Workflow](#development-workflow)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Testing](#testing)
12. [Environment Setup](#environment-setup)
13. [Running the Project](#running-the-project)
14. [Authentication & Roles](#authentication--roles)
15. [Database Overview](#database-overview)
16. [Security](#security)

---

# Project Overview

The Café Aroma application is a comprehensive role-based café management system enabling:

- **Customers** to browse the menu, manage a cart, checkout, track orders, and earn loyalty points
- **Staff** to accept/decline orders, manage the order queue, and toggle menu item availability
- **Managers** to manage menu items, staff, view analytics dashboards, handle staff invitations, and oversee operations
- **Admins** to perform all management functions with full system access

This application follows a rigorous software engineering workflow and demonstrates:

- Structured requirements and agile development
- Epics, user stories, and tasks
- Clean architecture with Next.js App Router
- Comprehensive automated testing (473 tests)
- CI/CD pipeline with automated testing
- Secure database access with Row-Level Security (RLS)
- Type-safe development with TypeScript

---

# Software Engineering Methodology

The project was developed using **Scrum** with lightweight ceremonies:

### Scrum Elements

- **Epics** define high-level objectives (e.g., Authentication, Menu Management, Order Processing)
- **User Stories** express end-user requirements using the standard format:
  > As a _role_, I want _feature_ so that _benefit_.
- **Tasks** break stories into implementable work units
- **Sprints** organize incremental delivery
- **Sprint Reviews** demonstrate completed increments
- **Backlog Refinement** ensures stories are well-scoped and testable

### Definition of Done

A story is considered _Done_ when:

- Code implemented and integrated
- Type-safe & lint-clean
- Tested manually
- Passing CI pipeline
- Accessible UI
- Code reviewed and merged
- Documentation updated

---

# Architecture

## High-Level Architecture

```
Frontend (Next.js 14 + React + TypeScript)
↓
Next.js API Routes (Server-Side Logic)
↓
Supabase Authentication
↓
PostgreSQL Database (RLS-secured)
```

### Key Architectural Decisions

- **Next.js App Router** with server and client components for optimal performance
- **API Routes** for secure server-side operations (auth, orders, menu management)
- **Role-Based Access Control (RBAC)** enforced both in database (RLS) and middleware
- **Schema-first development** using Supabase migrations
- **Type-safe development** with TypeScript and Zod validation
- **Modular component architecture** for reusability and maintainability
- **Server-side rendering (SSR)** for improved performance

---

# Technologies Used

### Frontend

- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **Sonner** - Toast notifications
- **clsx & tailwind-merge** - Conditional class management

### Backend & Database

- **Next.js API Routes** - Server-side endpoints
- **Supabase Auth** - Authentication service
- **Supabase PostgreSQL** - Database with real-time capabilities
- **Row-Level Security (RLS)** - Database-level access control
- **SQL migrations** - Schema version control
- **@supabase/ssr** - Server-side rendering support

### Testing & Quality Assurance

- **Jest 30.2.0** - Unit & integration testing framework
- **React Testing Library** - Component testing
- **@testing-library/jest-dom** - DOM matchers
- **@testing-library/user-event** - User interaction simulation
- **ts-jest** - TypeScript support for Jest
- **jest-environment-jsdom** - Browser environment simulation
- **Playwright 1.48+** - End-to-end testing across browsers
- **@playwright/test** - E2E test runner with visual regression testing

### DevOps & Tooling

- **GitHub** - Version control
- **GitHub Actions** - CI/CD pipeline with automated testing
- **Codecov** - Test coverage reporting and tracking
- **Vercel** - Hosting and deployment
- **Husky** - Git hooks
- **Lint-staged** - Pre-commit linting
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript Compiler** - Type checking
- **Rimraf** - Cross-platform file deletion for cache cleanup

---

# Features

## Customer Features

- Browse menu with real-time availability
- Add items to cart with customization
- Secure checkout with guest or authenticated orders
- Track order status in real-time
- View order history
- Loyalty points system (earn and redeem)
- Profile management

## Staff Features

- View incoming order queue
- Accept or decline orders
- Mark orders as completed
- Toggle menu item availability
- View and manage active orders

## Manager Features

- Dashboard with analytics and insights
- Full menu management (create, update, delete items)
- Staff management and invitation system
- Generate and manage staff invite codes
- View staff details and status
- Monitor order metrics

## Admin Features

- All manager features
- User account management
- Block/unblock users
- System-wide settings
- Full access to all operations

---

# Repository Structure

```
/
├── app/                       # Next.js App Router
│   ├── (public)/             # Public routes
│   │   └── blocked/          # Blocked user page
│   ├── __tests__/            # Shared test utilities
│   │   ├── setup.ts          # Jest test setup
│   │   ├── smoke.test.ts     # Basic sanity checks
│   │   └── test-utils.ts     # Mocking utilities & helpers
│   ├── account/              # Account settings page
│   ├── admin/                # Admin dashboard
│   │   └── staff/            # Admin staff management
│   ├── api/                  # API Routes (Server-side)
│   │   ├── __tests__/        # API test utilities
│   │   ├── admin/            # Admin API endpoints
│   │   │   ├── invites/      # Invite code management
│   │   │   │   ├── __tests__/
│   │   │   │   └── [id]/
│   │   │   │       └── __tests__/
│   │   │   └── staff/        # Staff management
│   │   │       ├── __tests__/
│   │   │       └── [id]/
│   │   │           ├── __tests__/
│   │   │           └── block/
│   │   │               └── __tests__/
│   │   ├── auth/             # Authentication endpoints
│   │   │   ├── __tests__/    # Auth tests (register, user)
│   │   │   ├── delete/
│   │   │   │   └── __tests__/
│   │   │   ├── register/
│   │   │   │   └── staff/
│   │   │   │       └── __tests__/
│   │   │   └── update/
│   │   │       └── __tests__/
│   │   ├── menu/             # Menu management endpoints
│   │   │   ├── items/
│   │   │   │   └── [id]/
│   │   │   │       └── __tests__/
│   │   │   └── upload/
│   │   │       └── __tests__/
│   │   └── orders/           # Order processing endpoints
│   │       ├── __tests__/
│   │       ├── [id]/
│   │       │   └── __tests__/
│   │       ├── history/
│   │       │   └── __tests__/
│   │       └── lookup/
│   │           └── __tests__/
│   ├── auth/                 # Auth pages
│   │   ├── login/            # Login page
│   │   ├── profile/          # User profile page
│   │   └── register/         # Registration (customer & staff)
│   ├── checkout/             # Checkout page
│   ├── customer/             # Customer portal
│   │   ├── account/          # Customer account settings
│   │   └── orders/           # Customer order history
│   ├── manager/              # Manager portal
│   │   ├── dashboard/        # Manager analytics dashboard
│   │   ├── menu/             # Manager menu management
│   │   └── staff-management/ # Manager staff tools
│   ├── menu/                 # Public menu browsing
│   ├── order-confirmation/   # Order confirmation pages
│   │   └── [id]/            # Dynamic order confirmation
│   ├── staff/                # Staff portal
│   │   ├── menu/             # Staff menu availability
│   │   └── orders/           # Staff order queue
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
│
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── __tests__/        # Component tests
│   │   ├── admin/            # Admin-specific components
│   │   ├── cart-modal.tsx    # Shopping cart modal
│   │   ├── client-layout.tsx # Client-side layout wrapper
│   │   ├── manager-menu-item-modal.tsx
│   │   ├── navbar.tsx        # Navigation bar
│   │   └── theme-provider.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── __tests__/        # Hook tests
│   │   ├── use-cart.tsx      # Cart state management
│   │   └── useUser.ts        # User authentication hook
│   ├── integrations/
│   │   └── supabase/         # Supabase client configuration
│   ├── lib/                  # Utility libraries
│   │   ├── __tests__/        # Library tests
│   │   ├── auth-utils.ts     # Authentication utilities
│   │   ├── auth.ts           # Auth helpers
│   │   ├── cart-utils.ts     # Cart utilities
│   │   ├── theme.ts          # Theme configuration
│   │   └── utils.ts          # General utilities
│   └── types/                # TypeScript type definitions
│       ├── cart.ts
│       ├── menu.ts
│       └── order.ts
│
├── supabase/
│   ├── migrations/           # SQL database migrations
│   ├── functions/            # Supabase Edge Functions
│   └── policies/             # RLS policy documentation
│
├── docs/                     # Project documentation
│   ├── PRs/                  # Pull request documentation
│   └── rulesets/             # Branch protection rules
│
├── e2e/                      # End-to-end tests (Playwright)
│   ├── helpers/
│   │   └── fixtures.ts       # Test utilities and helpers
│   ├── customer-checkout-flow.spec.ts  # Customer journey tests
│   ├── staff-order-workflow.spec.ts    # Staff workflow tests
│   ├── manager-menu-management.spec.ts # Manager operations tests
│   └── README.md             # E2E testing documentation
│
├── .github/workflows/        # CI/CD workflows
├── jest.config.js            # Jest configuration
├── jest.setup.js             # Jest global setup
├── middleware.ts             # Next.js middleware (auth)
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS config
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies
└── README.md                 # This file
```

---

# Testing

The project maintains a **comprehensive test suite** with **466 Jest tests** and **35 E2E test scenarios**, ensuring robust code quality and preventing regressions.

## Test Coverage

### Unit & Integration Tests (Jest)

| Category       | Test Suites   | Tests         | Description                                                              |
| -------------- | ------------- | ------------- | ------------------------------------------------------------------------ |
| **API Routes** | 13 suites     | ~200 tests    | Authentication, authorization, menu management, orders, admin operations |
| **Components** | 5 suites      | ~120 tests    | UI components, modals, navigation, theme provider                        |
| **Hooks**      | 3 suites      | ~50 tests     | Custom React hooks (cart, user authentication)                           |
| **Utilities**  | 8 suites      | ~100 tests    | Auth utilities, cart utilities, helpers                                  |
| **Total**      | **29 suites** | **466 tests** | 100% passing ✅                                                          |

### End-to-End Tests (Playwright)

| Test Suite                  | Scenarios | Coverage                                                                                    |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| **Customer Checkout Flow**  | 10 tests  | Menu browsing, cart management, checkout, order tracking                                    |
| **Staff Order Workflow**    | 11 tests  | Order queue, accept/decline, status updates, item availability                              |
| **Manager Menu Management** | 14 tests  | Menu CRUD operations, staff invites, analytics dashboard                                    |
| **Total**                   | **35**    | Covers critical user journeys across 3 browsers + 2 mobile viewports (200+ test variations) |

## Testing Philosophy

### Unit & Integration Tests (Jest)

All Jest tests follow a consistent pattern:

1. **Authentication** - Verify user identity
2. **Authorization** - Check role-based permissions
3. **Validation** - Test input validation and edge cases
4. **Success Paths** - Verify expected behavior
5. **Error Handling** - Ensure proper error responses

### End-to-End Tests (Playwright)

E2E tests validate complete user workflows:

1. **Real Browser Testing** - Chromium, Firefox, WebKit
2. **Mobile Responsive** - iPhone 13 & Pixel 5 viewports
3. **User Journeys** - Complete flows from login to completion
4. **Visual Testing** - Screenshot comparison for critical pages
5. **Network Simulation** - Test under various network conditions

## Running Tests

### Jest (Unit & Integration)

```bash
# Run all Jest tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- app/api/auth/__tests__/register.test.ts

# Run tests with coverage report
npm test -- --coverage

# Run tests for a specific directory
npm test -- app/api/admin
```

### Playwright (End-to-End)

```bash
# Run all E2E tests
npx playwright test

# Run E2E tests in UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test e2e/customer-checkout-flow.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests for specific browser
npx playwright test --project=chromium

# Run tests with debugging
npx playwright test --debug

# Generate HTML test report
npx playwright show-report
```

For detailed E2E testing information, see [e2e/README.md](e2e/README.md).

## Test File Organization

Tests are co-located with the code they test in `__tests__/` directories:

```
app/api/auth/
├── __tests__/
│   ├── register.test.ts     # Tests for register route
│   └── user.test.ts          # Tests for user route
├── register/
│   └── route.ts
└── user/
    └── route.ts
```

## Mock Patterns

### Supabase Client Mocking

```typescript
const mockSupabase = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    }),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: mockData,
    error: null,
  }),
};
```

### FormData Mocking (File Uploads)

```typescript
const formData = new FormData();
formData.append("image", new File([""], "test.jpg", { type: "image/jpeg" }));

const request = new Request("http://localhost:3000/api/menu/upload", {
  method: "POST",
});
request.formData = jest.fn().mockResolvedValue(formData);
```

### Multi-Query Routes

For routes that query the same table multiple times:

```typescript
let userRolesCallCount = 0;
mockFrom.mockImplementation((table) => {
  if (table === "user_roles") {
    userRolesCallCount++;
    if (userRolesCallCount === 1) {
      return firstQueryMock;
    }
    return secondQueryMock;
  }
  return defaultMock;
});
```

## API Route Testing Example

```typescript
describe("POST /api/auth/register", () => {
  it("should register a customer successfully", async () => {
    // 1. Setup mocks
    const mockSupabase = createMockSupabaseClient();
    const request = createMockRequest({ email, password });

    // 2. Execute route handler
    const response = await POST(request);

    // 3. Assert response
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.user.role).toBe("customer");

    // 4. Verify database interactions
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email,
      password,
      options: expect.any(Object),
    });
  });

  it("should reject invalid email format", async () => {
    const request = createMockRequest({ email: "invalid" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid email format",
    });
  });
});
```

## CI/CD Integration

Tests run automatically on every push and pull request via GitHub Actions:

```yaml
- name: Run Tests
  run: npm test -- --ci --coverage --maxWorkers=2

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

**Branch Protection Rules:**

- All tests must pass before merging to `dev`
- Coverage requirements enforced for critical paths
- Pre-commit hooks run linting and type checks

## Testing Best Practices

1. **Use descriptive test names** - `it('should reject orders when user is blocked')`
2. **Test one thing per test** - Each test should verify a single behavior
3. **Mock external dependencies** - Supabase, file system, network requests
4. **Clean up after tests** - Reset mocks with `beforeEach(() => jest.clearAllMocks())`
5. **Test edge cases** - Empty arrays, null values, boundary conditions
6. **Follow AAA pattern** - Arrange (setup), Act (execute), Assert (verify)

## Common Test Utilities

Located in `app/__tests__/test-utils.ts` and `app/api/__tests__/test-utils.ts`:

```typescript
// Mock Supabase client factory
export function createMockSupabaseClient(overrides?: Partial<SupabaseClient>);

// Mock request factory
export function createMockRequest(body: any, options?: RequestInit);

// Mock user factory
export function createMockUser(
  role: "customer" | "staff" | "manager" | "admin"
);
```

---

# Branching Strategy

> **Never commit directly to `main`. All development happens in `dev`.**

| Branch Prefix | Purpose                      |
| ------------- | ---------------------------- |
| `feature/`    | new features                 |
| `refactor/`   | restructures & optimizations |
| `bugfix/`     | fixes for known issues       |
| `hotfix/`     | urgent production fixes      |
| `chore/`      | maintenance work             |

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
2. Create a feature branch from `dev`
3. Implement story/tasks
4. Run tests locally: `npm test`
5. Run type checks and linting: `npm run type-check && npm run lint`
6. Commit with conventional commit messages
7. Push → GitHub triggers CI pipeline (tests + build)
8. Open PR targeting `dev` → team review → merge
9. Successful builds auto-deploy preview to Vercel
10. After sprint validation, `dev` → `main` for production

---

# CI/CD Pipeline

### Continuous Integration (GitHub Actions)

Every push and PR triggers automated checks in this order:

#### 1. **Code Quality**

- ESLint linting (`npm run lint`)
- Prettier format checking
- TypeScript type checking (`npm run typecheck`)

#### 2. **Testing** (Quality Gates)

- **Unit & Integration Tests**: 466 tests across 29 suites
  - Command: `npm test -- --ci --coverage --maxWorkers=2`
  - Coverage uploaded to Codecov
  - Must have 0 failures to proceed

- **End-to-End Tests**: 35 test scenarios
  - Command: `npm run test:e2e -- --project=chromium`
  - Tests customer checkout, staff workflow, manager operations
  - Runs in Chromium for speed (full browser matrix runs weekly)
  - Artifacts uploaded on failure (screenshots, traces, reports)

#### 3. **Build Verification**

- Next.js production build (`npm run build`)
- Only runs if all tests pass

**❌ Pipeline fails if ANY test fails. ✅ All checks must pass before merging.**

### Full Browser Matrix Testing

A separate workflow runs weekly (Sundays 2 AM UTC) and on releases:

- Tests across **5 browser configurations**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- 200+ test variations total
- Ensures cross-browser compatibility before releases

### Test Coverage Reporting

- Coverage reports automatically uploaded to **Codecov**
- PR comments show coverage changes
- Minimum coverage: >80% on new code
- Critical paths (auth, checkout, orders): >90% coverage

### Continuous Deployment

- **Merges to `dev`** → Vercel preview deployment
- **Merges to `main`** → Vercel production deployment
- Automatic rollbacks on build failures

### CI Documentation

For detailed CI testing information, troubleshooting, and best practices, see:

- **[CI Testing Guide](./docs/CI_TESTING_GUIDE.md)** - Comprehensive CI/CD testing documentation
- **[E2E Testing Guide](./e2e/README.md)** - End-to-end test documentation

---

# Environment Setup

### 1. Clone Repository

```bash
git clone <repo-url>
cd SE_Team_6_Project_Coffee_App
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.env.local` in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project settings:
https://app.supabase.com/project/_/settings/api

### 4. Run Database Migrations

Ensure your Supabase project has all migrations applied from the `supabase/migrations/` folder.

---

# **Running the Project**

### **Development Mode**

```bash
npm run dev
```

Opens on http://localhost:3000

### **Production Build**

```bash
npm run build
npm run start
```

### **Testing**

```bash
# Unit & Integration Tests (Jest)
npm test                    # Run all Jest tests (466 tests)
npm test -- --watch        # Watch mode for development
npm test -- --coverage     # With coverage report
npm run jest:coverage      # Alias for coverage report

# End-to-End Tests (Playwright)
npm run test:e2e           # Run all E2E tests (35 scenarios, all browsers)
npm run test:e2e:ui        # Interactive UI mode
npx playwright test --headed  # Watch browser execute tests
npx playwright show-report    # View test report

# CI Testing (matches GitHub Actions)
npm test -- --ci --coverage --maxWorkers=2  # Unit tests (CI mode)
npm run test:e2e -- --project=chromium      # E2E tests (chromium only)
```

### **Type Checking**

```bash
npm run typecheck
```

### **Linting & Formatting**

```bash
npm run lint
npm run format        # Auto-format code
npm run format:check  # Check formatting
```

---

# **Authentication & Roles**

Supabase authentication is used for all user types with role-based access control:

### **Roles**

- **customer** - Default role for regular users
- **staff** - Employees managing orders and menu
- **manager** - Supervisors with staff and analytics access
- **admin** - Full system access

### **Role Assignment**

- Customers: Self-registration via `/auth/register`
- Staff: Invitation-based registration via `/auth/register/staff` with invite codes
- Managers/Admins: Promoted by existing admins

### **Access Control**

- **Middleware** (`middleware.ts`) enforces route-based authentication
- **RLS Policies** in Supabase ensure database-level security
- **API Routes** validate user roles before operations
- Protected routes automatically redirect unauthorized users

---

# **Database Overview**

### **Core Tables**

- **profiles** - User profile information
- **items** - Menu items with pricing, descriptions, images
- **categories** - Menu categorization
- **beans** - Coffee bean inventory and details
- **orders** - Customer orders with status tracking
- **order_items** - Individual items within orders
- **carts** - Shopping cart persistence
- **loyalty_ledger** - Points earned and redeemed
- **staff_invite_codes** - Staff registration tokens
- **refunds** - Refund requests and processing
- **audit_log** - System activity tracking

### **Advanced Features**

- **Item Scheduling** - Schedule items for specific times
- **Inventory Thresholds** - Low stock alerts
- **Guest Orders** - Anonymous checkout support
- **Loyalty System** - Automated points calculation and redemption
- **Preparation Notes** - Order customization
- **Shift Notes** - Staff communication

### **Supabase Row-Level Security (RLS)**

The project implements strict security policies:

- Users can only access their own orders and profile data
- Staff can view and manage assigned orders
- Managers can access team data and analytics
- Admins have comprehensive system access
- All policies are defined in SQL migrations

---

# **Security**

The system incorporates multiple layers of security:

### **Database Security**

- **Row-Level Security (RLS)** on all tables
- Parameterized queries to prevent SQL injection
- Role-based access policies
- Audit logging for sensitive operations

### **Authentication Security**

- Supabase Auth with secure session management
- Server-side session validation
- Protected API routes with authentication checks
- Automatic session refresh

### **Application Security**

- **Middleware** for route protection
- **Zod schema validation** for all inputs
- **Type-safe** development with TypeScript
- No secrets exposed in client-side code
- HTTPS-only in production (enforced by Vercel)

### **Code Quality**

- ESLint for code quality enforcement
- Prettier for consistent formatting
- Husky pre-commit hooks
- Type checking in CI/CD pipeline

---

# **Contributing**

1. Check the backlog for available tasks
2. Create a feature branch following naming conventions
3. Implement changes with tests
4. Ensure all CI checks pass
5. Request review from team members
6. Merge after approval

---

# **License**

This project is developed for educational purposes as part of a Software Engineering course.

---

# **Team**

Software Engineering Team 6

---

# **Contact**

For questions or issues, please create an issue in the GitHub repository.
