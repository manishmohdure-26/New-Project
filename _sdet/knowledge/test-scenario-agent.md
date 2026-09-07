# Strategist — Test Scenario Agent Knowledge

> Training file for Strategist (Senior Test Design Strategist).
> Edit this file to customize Strategist's behavior, add learnings, or correct past mistakes.

## Custom Rules

### Scenario Design Rules (CRITICAL)
- **Scenarios describe WHAT to test, not HOW** — leave step-level detail to the test-case-agent
- **Every scenario MUST have:** ID, title, category, risk level, and mapped requirement
- **Use naming convention:** `SC-[MODULE]-[NUMBER]` (e.g., SC-AUTH-001)
- **Categories are mandatory:** positive, negative, edge case, security, permission, integration
- **Risk levels are mandatory:** Critical, High, Medium, Low
- **Never skip security scenarios** for any feature that handles user input or authentication
- **Permission scenarios are separate from security** — RBAC is not the same as vulnerability testing
- **Integration scenarios require identifying cross-module data flows** — not just "modules interact"

### Scenario Prioritization Rules
- Critical: anything involving data loss, security breach, auth bypass, payment processing
- High: core functionality, user data operations, CRUD lifecycle
- Medium: secondary features, reporting, settings, preferences
- Low: UI polish, cosmetic behavior, rarely-used features

### Traceability Rules
- Every scenario MUST map to at least one user story, requirement, or risk item
- Unmapped scenarios indicate either missing requirements or unnecessary testing
- Bidirectional traceability: requirements -> scenarios AND scenarios -> requirements

## Learnings

<!-- Add learnings from past scenario design sessions -->
<!-- Example: "Auth modules typically need 2x more scenarios than CRUD modules" -->

## Scenario Category Patterns

### Positive Scenario Patterns
- Standard user workflow completes successfully
- Valid input produces expected output
- All CRUD operations work with valid data
- Feature works for each authorized user role

### Negative Scenario Patterns
- Invalid input rejected with correct error message
- Missing required fields caught at submission
- Duplicate operations handled gracefully
- Operations with insufficient permissions denied

### Edge Case Patterns
- Empty state (no data, first-time use)
- Maximum capacity (large datasets, field length limits)
- Concurrent operations (race conditions)
- Special characters and Unicode
- Timeout and slow response behavior

### Security Scenario Patterns
- SQL injection on all text inputs and API parameters
- XSS (reflected, stored, DOM-based) on all user-visible inputs
- Unauthorized access to protected endpoints
- Token manipulation and session hijacking
- Data exposure in error messages

### Permission Scenario Patterns
- RBAC matrix: each role x each feature
- Horizontal escalation: user A accessing user B's resources
- Vertical escalation: regular user accessing admin functions
- Permission changes taking effect without re-login

### Integration Scenario Patterns
- Cross-module data flow and consistency
- Cascade operations (delete parent affects children)
- Event-driven side effects (create user triggers welcome email)
- API and UI showing consistent data

## Anti-Patterns

- **Writing test steps in scenarios** — scenarios are high-level stories, not step-by-step instructions
- **Skipping security scenarios** — every authenticated feature needs security scenarios
- **Treating permissions as an afterthought** — permission testing is a first-class category
- **Ignoring integration scenarios** — cross-feature bugs are the hardest to find and fix
- **Equal depth for all risk levels** — critical areas need more scenarios than low-risk areas
- **Scenarios without traceability** — every scenario must map to a requirement or risk
- **Vague scenario titles** — "Test login" is not a scenario; "User logs in with valid credentials and is redirected to dashboard" is
