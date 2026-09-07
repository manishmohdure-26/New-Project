# Test Strategy: [Project/Feature Name]

**Created by**: QA Architect Agent
**Date**: [Date]
**Version**: 1.0

---

## 1. Project Overview

| Item | Details |
|------|---------|
| Project Name | [Name] |
| Description | [Brief description] |
| Frontend Stack | [React/Angular/Vue/etc.] |
| Backend Stack | [Node/Python/Java/etc.] |
| Database | [MongoDB/PostgreSQL/etc.] |
| Deployment | [AWS/Azure/Vercel/etc.] |

## 2. Scope

### In Scope
| # | Feature/Module | Description |
|---|---------------|-------------|
| 1 | [Feature] | [Description] |

### Out of Scope
| # | Feature/Module | Reason |
|---|---------------|--------|
| 1 | [Feature] | [Why excluded] |

## 3. Test Types Required

| Test Type | Applicable | Tools | Coverage Target |
|-----------|-----------|-------|----------------|
| Unit Tests | Yes/No | Jest/Mocha | 80% |
| Integration Tests | Yes/No | Playwright | Critical paths |
| E2E Tests | Yes/No | Playwright | All user flows |
| Visual Tests | Yes/No | Playwright Screenshots | Key pages |
| Performance Tests | Yes/No | Lighthouse/k6 | Core pages |
| Security Tests | Yes/No | Manual + OWASP ZAP | Auth flows |
| Accessibility Tests | Yes/No | axe-core | WCAG 2.1 AA |

## 4. Risk Assessment Matrix

| Module | Risk Level | Reason | Test Priority |
|--------|-----------|--------|--------------|
| [Auth] | Critical | Security, data access | P1 |
| [Payments] | Critical | Financial transactions | P1 |
| [Dashboard] | Medium | Display only | P3 |

## 5. Feature-to-Test Mapping

| Feature | Unit | Integration | E2E | API | Est. Test Cases |
|---------|------|-------------|-----|-----|----------------|
| Login | 5 | 2 | 3 | 4 | 14 |
| Registration | 5 | 2 | 3 | 4 | 14 |
| [Feature] | - | - | - | - | - |
| **Total** | **-** | **-** | **-** | **-** | **-** |

## 6. Test Environment Requirements

| Environment | URL | Purpose | Data |
|------------|-----|---------|------|
| Local | localhost:3000 | Development testing | Mock/seed data |
| Staging | staging.app.com | Pre-release testing | Test data |
| Production | app.com | Smoke tests only | Real data (read-only) |

### Prerequisites
- [ ] Node.js v18+
- [ ] Database running locally or accessible
- [ ] Environment variables configured
- [ ] Test user accounts created
- [ ] API keys available for third-party services

## 7. Test Data Requirements

| Entity | Records Needed | Special Requirements |
|--------|---------------|---------------------|
| Users | 5+ (different roles) | Admin, user, guest accounts |
| [Entity] | [Count] | [Notes] |

## 8. Test Schedule & Priority

| Phase | Activities | Priority |
|-------|-----------|----------|
| Phase 1 | Smoke tests for critical flows | P1 |
| Phase 2 | Functional testing of all features | P2 |
| Phase 3 | Edge case and negative testing | P2 |
| Phase 4 | Performance and security testing | P3 |
| Phase 5 | Regression testing | P1 |

## 9. Entry & Exit Criteria

### Entry Criteria
- [ ] Code is deployed to test environment
- [ ] Test data is seeded
- [ ] All dependencies are available
- [ ] Test environment is stable

### Exit Criteria
- [ ] All P1 test cases executed and passed
- [ ] All P2 test cases executed (90%+ pass rate)
- [ ] No open S1/S2 bugs
- [ ] Test coverage meets target
- [ ] Test report generated and reviewed

## 10. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| [Risk] | High/Medium/Low | High/Medium/Low | [Action] |

---

**Next Steps**: Invoke **Test Case Generator Agent** to create detailed test cases based on this strategy.
