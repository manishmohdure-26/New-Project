# Project Context

> This file is loaded by ALL SDET agents to maintain consistency across the QA lifecycle.
> Copy this template to `project-context.md` in the project root and fill in your values.

## Project Info

- **Name**: [Project Name]
- **Description**: [Brief description of the application]
- **Repository**: [Git URL]
- **Team**: [Team name or organization]

## Tech Stack

- **Frontend**: [React/Vue/Angular/Next.js/etc] [version]
- **Backend**: [Node.js/Django/Spring Boot/etc] [version]
- **Database**: [PostgreSQL/MongoDB/MySQL/etc]
- **API Style**: [REST/GraphQL/gRPC]
- **Auth**: [JWT/Session/OAuth2/SAML]
- **Hosting**: [AWS/Azure/GCP/Vercel/etc]

## URLs & Environments

| Environment | URL | Notes |
|-------------|-----|-------|
| Local | http://localhost:3000 | Development |
| QA | [QA URL] | Testing |
| Staging | [Staging URL] | Pre-production |
| Production | [Prod URL] | Live (read-only for testing) |
| API Base | [API URL] | Backend API |

## Test Credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Test User | testuser@example.com | TestPass123! | Standard user |
| Admin | admin@example.com | AdminPass123! | Full access |
| Read-Only | viewer@example.com | ViewPass123! | View-only role |

## Conventions

- **Locator Strategy**: data-testid > getByRole > getByText > CSS selectors
- **Test Case IDs**: TC-MODULE-NNN (e.g., TC-AUTH-001)
- **Bug IDs**: BUG-MODULE-NNN (e.g., BUG-CART-003)
- **User Story IDs**: EPIC-MODULE / EPIC-ID-US-NNN
- **Requirement IDs**: FR-MODULE-NNN / NFR-CATEGORY-NNN
- **Branch Strategy**: [git flow / trunk-based / feature branches]
- **Code Style**: [ESLint config / Prettier / etc]

## Critical Rules

> Project-specific rules that ALL agents must follow. Add your own below.

- [e.g., "Never test against production database"]
- [e.g., "All test data must be cleaned up after test runs"]
- [e.g., "Use staging environment for tests, not QA"]

## Jira / Project Management

- **Project Key**: [PROJ]
- **Bug Workflow**: Open → In Progress → Ready for Testing → Done
- **Sprint Duration**: [2 weeks]

## Current Phase

> Check the box for your current project phase. Agents use this to provide contextual guidance.

- [ ] Discovery (MOM, User Stories, SRS)
- [ ] Planning (Test Strategy, Risk Assessment)
- [ ] Test Design (Test Cases, Test Data)
- [ ] Automation (E2E Tests)
- [ ] Execution (Bug Reporting, Retesting, Release)
