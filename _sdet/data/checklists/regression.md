# Regression Test Checklist

**Purpose**: Verify that existing features still work correctly after code changes.
**Duration**: 1-2 hours (manual) / automated via Playwright
**When to Run**: Before releases, after major feature merges, weekly on staging.

---

## Instructions
Execute all items. For automated items, run the Playwright test suite. For manual items, test manually. Document any failures.

## Authentication & Authorization
- [ ] Login with valid credentials (all user roles)
- [ ] Login with invalid credentials shows error
- [ ] Password reset flow works
- [ ] Session timeout works correctly
- [ ] Role-based access control enforced
- [ ] JWT/token refresh works
- [ ] Logout clears session properly
- [ ] Remember me functionality (if applicable)

## User Management
- [ ] User registration (if applicable)
- [ ] User profile view
- [ ] User profile edit
- [ ] Password change
- [ ] Account deletion (if applicable)
- [ ] User list/search (admin)

## Core Business Features
> Customize this section for your application

### Feature Module 1: [Name]
- [ ] Create operation
- [ ] Read/View operation
- [ ] Update operation
- [ ] Delete operation
- [ ] List with pagination
- [ ] Search/Filter
- [ ] Sort functionality
- [ ] Export (if applicable)

### Feature Module 2: [Name]
- [ ] Create operation
- [ ] Read/View operation
- [ ] Update operation
- [ ] Delete operation
- [ ] List with pagination
- [ ] Search/Filter

### Feature Module 3: [Name]
- [ ] [Specific checks]

## API Endpoints
- [ ] All GET endpoints return correct data
- [ ] All POST endpoints create records correctly
- [ ] All PUT/PATCH endpoints update correctly
- [ ] All DELETE endpoints remove correctly
- [ ] Proper error responses for invalid requests
- [ ] Pagination parameters work
- [ ] Filtering parameters work
- [ ] Sorting parameters work

## UI/UX
- [ ] Pages load without visual glitches
- [ ] Forms display all fields correctly
- [ ] Buttons and links are functional
- [ ] Error messages display correctly
- [ ] Success messages display correctly
- [ ] Loading states appear during async operations
- [ ] Empty states display when no data
- [ ] Responsive layout works (desktop, tablet, mobile)

## Data Integrity
- [ ] Data saves correctly to database
- [ ] Data displays correctly after save
- [ ] Concurrent edits handled properly
- [ ] Data relationships maintained (foreign keys)
- [ ] Cascading operations work (delete parent → children)

## Error Handling
- [ ] 404 page displays for invalid URLs
- [ ] Network error handling works
- [ ] API error messages are user-friendly
- [ ] Form validation prevents invalid submissions
- [ ] Graceful handling of server downtime

## Cross-Browser (if required)
- [ ] Chrome - core features work
- [ ] Firefox - core features work
- [ ] Safari - core features work
- [ ] Edge - core features work

---

## Automated Test Execution
```bash
# Run full regression suite
npx playwright test

# Run with report
npx playwright test --reporter=html

# View report
npx playwright show-report
```

## Results Summary

| Module | Total Tests | Passed | Failed | Blocked | Pass Rate |
|--------|------------|--------|--------|---------|-----------|
| Auth | | | | | |
| Users | | | | | |
| [Module] | | | | | |
| API | | | | | |
| UI | | | | | |
| **Total** | | | | | |

**Overall**: PASS / FAIL
**Tested by**: [Name/Agent]
**Date**: [Date]
**Environment**: [Environment]
**Build/Version**: [Version]
**Bugs Found**: [Count] (See bug reports)
