# Testing Guide

This document provides comprehensive guidance on testing in the Café Aroma application.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Getting Started](#getting-started)
- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [Best Practices](#best-practices)

## Overview

The Café Aroma application uses a multi-layered testing approach:

- **Unit Tests**: Test individual functions and utilities
- **Component Tests**: Test React components in isolation
- **Integration Tests**: Test components with their dependencies
- **E2E Tests**: Test complete user workflows

## Testing Stack

### Unit & Integration Testing

- **Jest**: Testing framework
- **React Testing Library**: Component testing utilities
- **@testing-library/jest-dom**: Custom DOM matchers
- **@testing-library/user-event**: User interaction simulation

### End-to-End Testing

- **Playwright**: Browser automation and E2E testing
- Supports multiple browsers (Chrome, Firefox, Safari)
- Mobile device emulation

## Getting Started

### Installation

All testing dependencies are included in the project. Simply run:

```bash
npm install
```

### First-Time E2E Setup

For Playwright E2E tests, install browser binaries:

```bash
npm run playwright:install
```

## Writing Tests

### Component Tests

Create test files next to components in `__tests__` directories:

```typescript
// src/components/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Utility Function Tests

```typescript
// src/lib/__tests__/myUtil.test.ts
import { myUtil } from "../myUtil";

describe("myUtil", () => {
  it("performs correct calculation", () => {
    expect(myUtil(2, 3)).toBe(5);
  });
});
```

### API Route Tests

```typescript
// app/api/__tests__/myRoute.test.ts
describe("API Route", () => {
  it("returns expected data", async () => {
    // Test your API logic
  });
});
```

### E2E Tests

Create test files in the `e2e/` directory:

```typescript
// e2e/feature.spec.ts
import { test, expect } from "@playwright/test";

test("user can complete workflow", async ({ page }) => {
  await page.goto("/");
  await page.click("text=Start");
  await expect(page).toHaveURL(/\/complete/);
});
```

## Running Tests

### Unit & Integration Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

## Best Practices

### General

- Write tests alongside the code they test
- Use descriptive test names that explain what is being tested
- Follow the AAA pattern: Arrange, Act, Assert
- Keep tests isolated and independent

### Component Testing

- Test user-visible behavior, not implementation details
- Use `screen.getByRole` for accessibility-friendly queries
- Mock external dependencies (APIs, hooks)
- Test different user scenarios

### E2E Testing

- Test critical user paths first
- Keep E2E tests focused and fast
- Use data-testid sparingly (prefer accessible queries)
- Clean up test data after tests

### Mocking

- Mock Next.js router in `jest.setup.js`
- Mock external API calls
- Mock Supabase client for unit tests
- Use relative imports in mocks

### Coverage

- Aim for meaningful coverage, not 100%
- Focus on critical paths and edge cases
- Use coverage reports to find untested code
- Don't test external libraries

## Test Organization

```
project-root/
├── e2e/                          # E2E tests
│   └── *.spec.ts
├── src/
│   ├── components/
│   │   ├── __tests__/           # Component tests
│   │   │   └── *.test.tsx
│   │   └── MyComponent.tsx
│   ├── lib/
│   │   ├── __tests__/           # Utility tests
│   │   │   └── *.test.ts
│   │   └── myUtil.ts
│   └── hooks/
│       ├── __tests__/           # Hook tests
│       │   └── *.test.ts
│       └── useMyHook.ts
├── app/
│   └── api/
│       └── __tests__/           # API tests
│           └── *.test.ts
├── jest.config.ts               # Jest configuration
├── jest.setup.js                # Jest global setup
└── playwright.config.ts         # Playwright configuration
```

## Troubleshooting

### Jest Issues

- **Module not found**: Check import paths and `moduleNameMapper` in `jest.config.ts`
- **Next.js errors**: Ensure `next/jest` is properly configured
- **Mock not working**: Verify mock path matches actual module path

### Playwright Issues

- **Browser not found**: Run `npm run playwright:install`
- **Timeout errors**: Increase timeout in `playwright.config.ts`
- **Port conflicts**: Ensure port 3000 is available

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
