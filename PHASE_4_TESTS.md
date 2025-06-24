# Phase 4: Test Cleanup

## Overview
Remove test cases for the 6 deleted tools while preserving tests for all remaining functionality.

## 4.1 tests/unit/handlers/pattern-analysis-handlers.test.js

### Test Cases to Remove ❌ (ALL)
Since all 4 pattern analysis tools are removed, this entire test file can be removed or significantly reduced:

- [ ] Tests for `handleAnalyzeTransactionPatterns()`
- [ ] Tests for `handleDetectFraudIndicators()`  
- [ ] Tests for `handleGenerateMerchantIntelligence()`
- [ ] Tests for `handlePerformRiskAssessment()`
- [ ] All mock data for pattern analysis tests
- [ ] All helper function tests related to removed tools

### Action Options
**Option A: Delete entire file**
- [ ] Remove `tests/unit/handlers/pattern-analysis-handlers.test.js`
- [ ] Update test runner configurations if needed

**Option B: Keep minimal file structure**
- [ ] Keep file header and basic structure
- [ ] Add comment: "Pattern analysis tools removed - tests preserved for future use"
- [ ] Remove all test content

## 4.2 tests/unit/handlers/realtime-intelligence-handlers.test.js

### Test Cases to Remove ❌ (2 out of 4)
- [ ] Tests for `handleAnalyzeSpendingPatterns()` (lines ~518-527)
- [ ] Tests for `handleGenerateVerificationQuestions()` (lines ~538-547)
- [ ] Related error handling tests
- [ ] Mock data specific to removed tools

### CRITICAL - Test Cases to PRESERVE ✅ (2 out of 4)
- [ ] Tests for `handleSubscribeToAlerts()`
- [ ] Tests for `handleGetLiveTransactionFeed()`
- [ ] Shared utility function tests
- [ ] General error handling tests
- [ ] Mock data for preserved tools

### Specific Lines to Remove
Based on grep search results:
```javascript
// Remove these test cases:
Line 518: ).rejects.toThrow("Tool 'analyze_spending_patterns' failed: Pattern analysis engine timeout");
Line 526: 'MCP tool error: analyze_spending_patterns'
Line 538: ).rejects.toThrow("Tool 'generate_verification_questions' failed: Insufficient transaction history");
Line 546: 'MCP tool error: generate_verification_questions'
```

## 4.3 tests/integration/mcp-agent-integration.test.js

### Tool Discovery Test Updates
Remove expectations for deleted tools (lines 111-114, 119-120):
```javascript
// REMOVE these expectations:
expect(toolNames).toContain('analyze_transaction_patterns');     // Line 111
expect(toolNames).toContain('detect_fraud_indicators');          // Line 112
expect(toolNames).toContain('generate_merchant_intelligence');   // Line 113
expect(toolNames).toContain('perform_risk_assessment');          // Line 114
expect(toolNames).toContain('analyze_spending_patterns');        // Line 119
expect(toolNames).toContain('generate_verification_questions');  // Line 120
```

### Update Tool Count Expectations
```javascript
// Update from 19 to 13 tools:
expect(tools).toHaveLength(13); // was 19
```

### Integration Test Cases to Remove ❌
- [ ] Line 172-189: `analyze_transaction_patterns` test
- [ ] Line 189-242: `generate_verification_questions` test  
- [ ] Line 243-262: `analyze_spending_patterns` test
- [ ] Line 263-294: `generate_merchant_intelligence` test
- [ ] Line 295-317: `detect_fraud_indicators` test
- [ ] Line 464-509: `generate_verification_questions` integration test
- [ ] Line 510-548: `perform_risk_assessment` integration test

### Performance Test Updates
- [ ] Line 318: Remove `analyze_transaction_patterns` from performance test
- [ ] Line 549+: Remove `analyze_transaction_patterns` performance test

### Validation Test Updates
Remove validation for deleted tools while keeping:
```javascript
// KEEP validation for these tools:
if (['get_card_details', 'create_honeypot_card'].includes(tool.name)) {
  // ... existing validation
}
```

## 4.4 Test Configuration Updates

### Update test/setup.js (if needed)
- [ ] Remove any test setup specific to deleted tools
- [ ] Update mock configurations
- [ ] Remove unused test utilities

### Update package.json test scripts (if needed)
- [ ] Verify test scripts still run correctly
- [ ] Update any tool-specific test commands

## Validation Commands

### Before Test Cleanup
```bash
# Run all tests to establish baseline
npm test

# Count current test cases
grep -r "describe\|it\|test" tests/ | grep -E "(analyze_transaction_patterns|detect_fraud_indicators|generate_merchant_intelligence|perform_risk_assessment|analyze_spending_patterns|generate_verification_questions)" | wc -l
```

### After Test Cleanup
```bash
# Test compilation
npm run lint

# Run remaining tests
npm test

# Verify no references to removed tools
grep -r "analyze_transaction_patterns\|detect_fraud_indicators\|generate_merchant_intelligence\|perform_risk_assessment\|analyze_spending_patterns\|generate_verification_questions" tests/

# Verify test count reduction
npm test -- --verbose | grep -c "✓\|✗"

# Commit progress
git add .
git commit -m "Phase 4: Remove tests for 6 analysis tools"
```

## Expected Results

### Test File Changes
- `pattern-analysis-handlers.test.js`: Removed or nearly empty
- `realtime-intelligence-handlers.test.js`: ~50% smaller, 2 test suites remaining
- `mcp-agent-integration.test.js`: Updated tool count and removed 6 tool test cases

### Test Execution Results
- [ ] All remaining tests pass
- [ ] No references to removed tools in test output
- [ ] Tool discovery integration test shows 13 tools
- [ ] Performance tests only include remaining tools
- [ ] No "test not found" or "describe is not defined" errors

### Test Coverage Impact
- Total test cases should decrease significantly
- Coverage for remaining 13 tools should remain 100%
- No coverage gaps for preserved functionality

## Mock Data Cleanup

### Remove Unused Mocks
- [ ] Mock transaction data specific to pattern analysis
- [ ] Mock merchant intelligence data
- [ ] Mock verification question data
- [ ] Mock risk assessment data
- [ ] Mock spending pattern data

### Preserve Required Mocks
- [ ] Basic transaction mocks (used by multiple tools)
- [ ] Card data mocks (used by card tools)
- [ ] Alert subscription mocks
- [ ] Live feed mocks
- [ ] Health check mocks

## Test Runner Configuration

### Update Jest/Vitest Configuration
- [ ] Remove test patterns for deleted tools (if any)
- [ ] Update test coverage thresholds (if needed)
- [ ] Verify test discovery still works correctly

### Continuous Integration
- [ ] Ensure CI pipeline still runs correctly
- [ ] Update any tool-specific CI steps
- [ ] Verify deployment tests still pass

## Risk Mitigation

### Test Backup Strategy
```bash
# Before starting, backup test files
cp tests/unit/handlers/pattern-analysis-handlers.test.js tests/unit/handlers/pattern-analysis-handlers.test.js.backup
cp tests/unit/handlers/realtime-intelligence-handlers.test.js tests/unit/handlers/realtime-intelligence-handlers.test.js.backup
cp tests/integration/mcp-agent-integration.test.js tests/integration/mcp-agent-integration.test.js.backup
```

### Validation Strategy
1. Run tests before any changes
2. Make changes incrementally (one file at a time)
3. Run tests after each file change
4. Verify remaining functionality isn't broken 