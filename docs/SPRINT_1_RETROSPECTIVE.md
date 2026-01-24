# Sprint 1 Retrospective - Café Aroma Coffee Shop Application

**Sprint Duration:** December 11, 2025 - December 18, 2025
**Team:** SE Team 6
**Project:** Coffee Shop Management System

---

## Executive Summary

Sprint 1 successfully delivered a production-ready foundation for the Café Aroma application, including complete project setup with database migrations, authentication system with role-based access control, customer ordering flow, staff order management, and comprehensive testing infrastructure. The team delivered **15 major features** across **466 passing tests** with **35 E2E scenarios** and established a robust CI/CD pipeline.

---

## Sprint Goals vs. Achievements

| Goal                                              | Status      | Notes                                            |
| ------------------------------------------------- | ----------- | ------------------------------------------------ |
| Complete authentication system with RBAC          | ✅ Achieved | 4-role system with invite-based registration     |
| Customer ordering flow (browse → cart → checkout) | ✅ Achieved | Full flow with pickup time selection             |
| Staff order queue and management                  | ✅ Achieved | Real-time queue with status updates              |
| Admin/Manager staff management                    | ✅ Achieved | User blocking, deletion, invite codes            |
| Testing infrastructure (Unit + E2E)               | ✅ Exceeded | 466 unit tests + 35 E2E tests + CI/CD            |
| DevOps pipeline setup                             | ✅ Achieved | Automated testing, deployment, branch protection |

**Overall Sprint Success Rate: 100%** (6/6 goals achieved)

---

## Team Contributions

| Team Member          | Features Delivered                                                                  | User Stories                                        | LOC Added | Key Achievements                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hedi**             | Project setup, Database migrations, Design system, Development tools                | Project initialization                              | ~2,000    | • Next.js 14 + Supabase configuration<br>• 30 database migrations (RLS, roles, orders)<br>• Coffee-themed design system<br>• Dev tools (ESLint, Prettier, Husky) |
| **Anthony Stassart** | Authentication system, RBAC, Staff management, Critical bug fixes                   | CSA-13, 19, 24, 29, 33, 38, 43, 48, 53, 57, 132-134 | ~2,500    | • 4-role authentication model<br>• Invite-based registration system<br>• Database-driven role management<br>• Fixed account deletion & blocking bugs             |
| **Federico Newton**  | UI foundation, Menu browsing, Cart system, Staff order queue                        | CSA-86-94, 118-125                                  | ~3,200    | • Complete page structure & navigation<br>• Add-to-cart with Supabase persistence<br>• Staff menu availability view<br>• Order queue with priority sorting       |
| **Filip Zekonja**    | Order confirmation, Pickup time selection, Order tracking, Invoice generation       | CSA-104-105, Order history                          | ~1,800    | • Pickup time picker component<br>• Order confirmation with invoice download<br>• Guest order lookup system<br>• PDF invoice generation (jsPDF)                  |
| **Eric Damian**      | Testing infrastructure, API testing, Component testing, E2E testing, CI/CD pipeline | Testing stories 1-4                                 | ~4,500    | • Jest + Playwright setup<br>• 466 unit/integration tests (29 suites)<br>• 35 E2E test scenarios<br>• GitHub Actions CI/CD pipeline                              |

**Total Lines of Code:** ~14,000 lines
**Total User Stories Completed:** 40+
**Total PRs Merged:** 15

---

## What Went Well 🎉

### Technical Excellence

- **Solid foundation:** Professional project setup with Next.js 14, Supabase, and 30 comprehensive database migrations
- **Zero-defect authentication:** 4-role RBAC system with database-driven security and invite codes working flawlessly
- **Test coverage:** Achieved 466 passing tests with comprehensive coverage of API routes, components, and E2E flows
- **Real-time updates:** Successfully implemented Supabase subscriptions for live order queue updates
- **Type safety:** Full TypeScript coverage with zero type errors across 14,000+ lines
- **Cohesive design:** Coffee-themed design system with accessibility features and consistent UI patterns

### Process & Collaboration

- **Strong project foundation:** Well-structured project setup enabled smooth parallel development from day one
- **Clear documentation:** Every PR included detailed documentation with implementation details and testing checklists
- **Parallel development:** Team worked efficiently in parallel without merge conflicts
- **Fast iteration:** Bug fixes (account deletion, user blocking) identified and resolved within 24 hours
- **DevOps automation:** CI/CD pipeline catches issues early with automated testing on every push
- **Excellent coordination:** Team coordination and support throughout the sprint maintained momentum

### Feature Delivery

- **Complete user flows:** Customer can browse → add to cart → checkout → receive confirmation in a seamless flow
- **Staff productivity:** Real-time order queue with quick action buttons for efficient order management
- **Admin capabilities:** Full staff management with blocking, deletion, and invite code generation
- **Guest support:** Non-authenticated users can place orders and track them via email lookup

---

## What Could Be Improved 🔄

### Technical Challenges

- **Initial RLS complexity:** Spent significant time debugging Row Level Security policies and metadata vs. database role conflicts
  - _Impact:_ Delayed authentication completion by 1 day
  - _Learning:_ Database-driven roles > metadata from the start

- **API route cookie handling:** Next.js 14 cookie API changes required multiple iterations to get session handling correct
  - _Impact:_ 401 errors on authenticated endpoints
  - _Resolution:_ Centralized cookie-aware Supabase client factory

- **Type mismatches:** Order confirmation had price/price_cents and label/name inconsistencies
  - _Impact:_ Display bugs in order details
  - _Prevention:_ Earlier type definition alignment across team

### Process Improvements

- **Testing earlier:** Some features were built before test infrastructure was ready
  - _Suggestion:_ Establish testing patterns at sprint start

- **Design system coordination:** Multiple team members created similar UI components independently
  - _Suggestion:_ Create shared component library earlier in sprint

- **Dependency communication:** jsPDF added late in sprint for invoice feature
  - _Suggestion:_ Review external dependencies at sprint planning

---

## Key Metrics

### Velocity & Delivery

- **Story Points Completed:** 50+ (including project setup and 40+ user stories)
- **PR Merge Rate:** 15 PRs in 8 days (~2 PRs/day average)
- **Bug Resolution Time:** < 24 hours average
- **Build Success Rate:** 100% (all CI checks passing)

### Code Quality

- **Test Pass Rate:** 100% (466/466 tests passing)
- **Type Coverage:** 100% (zero TypeScript errors)
- **Lint Compliance:** 98% (minor warnings only)
- **E2E Test Coverage:** 6 critical user flows (35 scenarios)

### Technical Debt

- **Known Issues:** 2 minor lint warnings (img tag, dependency array)
- **TODO Items:** 0 blocking items
- **Security Issues:** 0 (all auth/RBAC working correctly)

---

## Action Items for Sprint 2

### High Priority

1. **[Eric]** Resolve remaining lint warnings in manager-menu-item-modal.tsx and pickup-time-picker.tsx
2. **[Team]** Create shared component library (buttons, modals, badges) to prevent duplication
3. **[Anthony]** Document RLS policies and common patterns for new features
4. **[Federico]** Add loading skeletons for better perceived performance on slow connections

### Medium Priority

5. **[Filip]** Add SMS/email notifications for order status updates
6. **[Team]** Implement error boundary components for graceful error handling
7. **[Eric]** Expand E2E test coverage to mobile viewport scenarios
8. **[Anthony]** Add audit logging for admin actions (user deletion, blocking)

### Low Priority

9. **[Federico]** Optimize cart persistence (debounce Supabase updates)
10. **[Team]** Add accessibility audit and WCAG 2.1 AA compliance testing

---

## Lessons Learned

### Technical Insights

1. **Strong foundation is critical:** Well-structured project setup with proper tooling and migrations enabled rapid feature development
2. **Database-first approach wins:** Moving roles from metadata to database eliminated entire classes of bugs
3. **RLS is powerful but complex:** Invest time upfront to understand policies before building features
4. **Real-time subscriptions are magical:** Supabase subscriptions provided instant UI updates with minimal code
5. **Testing infrastructure pays dividends:** Caught multiple regressions before they reached production
6. **Design systems accelerate development:** Coffee-themed design tokens enabled consistent UI across all features

### Process Insights

1. **PR documentation is invaluable:** Detailed PRs made code review faster and onboarding easier
2. **Parallel work requires coordination:** Early alignment on types/interfaces prevents integration issues
3. **CI/CD catches issues early:** Automated testing found bugs that manual testing missed
4. **Cross-functional features need planning:** Order flow touched 4 different subsystems (auth, cart, orders, payment)

---

## Team Morale & Collaboration

**Overall Team Health:** ✅ Excellent

- **Communication:** Strong async communication via PR reviews and documentation
- **Collaboration:** Team helped each other debug complex issues (RLS policies, cookie handling)
- **Knowledge Sharing:** Comprehensive PR descriptions served as learning resources
- **Work-Life Balance:** Sustainable pace with no crunch time needed

**Shoutouts:**

- 🏆 **Hedi:** For the exceptional project setup that gave everyone a solid foundation to build on, and excellent team coordination throughout the sprint
- 🏆 **Anthony:** For the elegant invite-based registration system and quick bug fixes
- 🏆 **Federico:** For the beautiful UI foundation and real-time order queue
- 🏆 **Filip:** For the polished order confirmation flow with invoice generation
- 🏆 **Eric:** For the comprehensive testing infrastructure that gives us confidence to ship

---

## Sprint 2 Preview

### Planned Features

- Manager menu management (create, edit, archive items)
- Inventory tracking and low-stock alerts
- Order analytics and reporting dashboard
- Customer loyalty program
- Payment processing integration (Stripe)
- Mobile-responsive improvements

### Goals

- Maintain 100% test pass rate
- Reduce technical debt to zero
- Implement accessibility improvements
- Add performance monitoring

---

## Conclusion

Sprint 1 was a **highly successful** sprint that established a solid foundation for the Café Aroma application. The team delivered a production-ready authentication system, complete customer ordering flow, staff management tools, and comprehensive testing infrastructure. All 6 sprint goals were achieved with high code quality and zero critical bugs.

The team demonstrated excellent collaboration, technical expertise, and commitment to quality. The extensive documentation and test coverage provide a strong foundation for Sprint 2 and future development.

**Next Steps:** Address action items and continue momentum into Sprint 2.

---

**Retrospective Facilitator:** Eric Damian
**Date:** December 18, 2025
