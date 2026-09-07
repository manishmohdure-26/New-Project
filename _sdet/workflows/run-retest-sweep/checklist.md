# Run Retest Sweep — Checklist

## Agent: Gatekeeper (Retest Agent)

### Phase 1: Load & Validate Config
- [ ] qa-retest-config.json loaded and validated
- [ ] All config fields have real values (no placeholders)
- [ ] User confirmed configuration

### Phase 2: Fetch Tickets
- [ ] Jira query executed successfully
- [ ] All Ready for Testing tickets listed
- [ ] User confirmed ticket list

### Phase 3: Verify Deployment
- [ ] Deployment verified for each ticket (FE + BE repos)
- [ ] Undeployed tickets flagged and skipped
- [ ] Google Chat alerts sent for undeployed fixes

### Phase 4: Analyze & Retest
- [ ] Login to QA environment successful
- [ ] Each deployed ticket retested in browser
- [ ] Screenshots captured for each test result
- [ ] Regression check performed on impacted areas

### Phase 5: Update Jira
- [ ] Jira tickets transitioned correctly (DONE/REOPEN)
- [ ] Jira comments added with verification details

### Phase 6: Report & Notify
- [ ] Retest report saved to outputs/retest-agent/
- [ ] Google Chat summary sent
- [ ] Results presented to user
