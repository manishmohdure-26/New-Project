# Smoke Test Checklist

**Purpose**: Quick validation that core features work after deployment or build.
**Duration**: 15-30 minutes
**When to Run**: After every deployment, build, or major merge.

---

## Instructions
Run through each item quickly. Mark Pass/Fail. Stop and report if any Critical item fails.

## Application Load
- [ ] Application loads without errors
- [ ] No console errors on page load
- [ ] All static assets load (CSS, JS, images)
- [ ] Correct environment/version displayed

## Authentication
- [ ] Login page loads
- [ ] Login with valid credentials works
- [ ] User is redirected to correct page after login
- [ ] Logout works
- [ ] Protected pages redirect unauthenticated users

## Navigation
- [ ] Main navigation links work
- [ ] All menu items are visible and clickable
- [ ] Browser back/forward buttons work
- [ ] Page URLs are correct

## Core Features (Customize per project)
- [ ] [Feature 1] - [Quick check description]
- [ ] [Feature 2] - [Quick check description]
- [ ] [Feature 3] - [Quick check description]
- [ ] [Feature 4] - [Quick check description]
- [ ] [Feature 5] - [Quick check description]

## API Health
- [ ] Health check endpoint responds (GET /api/health)
- [ ] Key API endpoints respond (list 3-5 critical ones)
- [ ] API response times are acceptable (< 2 seconds)
- [ ] Authentication tokens are being issued correctly

## Data Display
- [ ] Lists/tables display data correctly
- [ ] Pagination works (if applicable)
- [ ] Search/filter returns results
- [ ] Empty states display correctly

## Forms
- [ ] Primary form loads correctly
- [ ] Required field validation works
- [ ] Form submission succeeds with valid data
- [ ] Success message/redirect after submission

---

## Results

| Area | Status | Notes |
|------|--------|-------|
| App Load | Pass/Fail | |
| Auth | Pass/Fail | |
| Navigation | Pass/Fail | |
| Core Features | Pass/Fail | |
| API | Pass/Fail | |
| Data Display | Pass/Fail | |
| Forms | Pass/Fail | |

**Overall**: PASS / FAIL
**Tested by**: [Name/Agent]
**Date**: [Date]
**Environment**: [Environment]
**Build/Version**: [Version]
