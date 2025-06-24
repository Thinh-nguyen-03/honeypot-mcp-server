# Phase 3: Main Server Updates

## Overview
Update `src/mcp-server.js` to remove references to the 6 deleted tools while preserving all remaining functionality.

## 3.1 Tool Discovery Updates

### Remove from Tools Array
In the `ListToolsRequestSchema` handler, remove these 6 tools from the tools array:

```javascript
// REMOVE these tool entries from the tools array:
// (These should be automatically removed when schema arrays are updated)

// From patternAnalysisToolSchemas (now empty):
- analyze_transaction_patterns
- detect_fraud_indicators  
- generate_merchant_intelligence
- perform_risk_assessment

// From realtimeIntelligenceToolSchemas (now 2 items):
- analyze_spending_patterns
- generate_verification_questions
```

### Verify Tool Array Composition
After updates, the tools array should contain exactly **13 tools**:
- [ ] 1 health_check tool (hardcoded)
- [ ] 5 card tools (from cardToolSchemas)
- [ ] 5 transaction tools (from transactionToolSchemas)  
- [ ] 0 pattern analysis tools (from patternAnalysisToolSchemas - now empty)
- [ ] 2 real-time tools (from realtimeIntelligenceToolSchemas - reduced)

## 3.2 Tool Execution Updates

### Case Statements to Remove ❌
In the `CallToolRequestSchema` handler switch statement, remove these 6 cases:

```javascript
// REMOVE these case statements (lines ~141-157):

case 'analyze_transaction_patterns':
  return await patternAnalysisHandlers.handleAnalyzeTransactionPatterns(args, requestId);

case 'detect_fraud_indicators':
  return await patternAnalysisHandlers.handleDetectFraudIndicators(args, requestId);

case 'generate_merchant_intelligence':
  return await patternAnalysisHandlers.handleGenerateMerchantIntelligence(args, requestId);

case 'perform_risk_assessment':
  return await patternAnalysisHandlers.handlePerformRiskAssessment(args, requestId);

case 'analyze_spending_patterns':
  return await realtimeIntelligenceHandlers.handleAnalyzeSpendingPatterns(args, requestId);

case 'generate_verification_questions':
  return await realtimeIntelligenceHandlers.handleGenerateVerificationQuestions(args, requestId);
```

### CRITICAL - Case Statements to PRESERVE ✅

```javascript
// KEEP these real-time intelligence case statements:

case 'subscribe_to_alerts':
  return await realtimeIntelligenceHandlers.handleSubscribeToAlerts(args, requestId);

case 'get_live_transaction_feed':
  return await realtimeIntelligenceHandlers.handleGetLiveTransactionFeed(args, requestId);
```

## 3.3 Import Statements

### KEEP All Imports ✅
Do NOT remove any import statements:
- [ ] `import { patternAnalysisToolSchemas }` - Keep (now imports empty array)
- [ ] `import * as patternAnalysisHandlers` - Keep (now imports utility functions only)
- [ ] `import { realtimeIntelligenceToolSchemas }` - Keep (now imports 2 schemas)
- [ ] `import * as realtimeIntelligenceHandlers` - Keep (still has 2 handlers)

**Reason**: Even though pattern analysis handlers are mostly empty, the imports must remain for:
1. Utility functions that might be shared
2. Future extensibility
3. Avoiding compilation errors

## 3.4 Error Handling

### Update Default Case
The default case should still handle unknown tools properly:
```javascript
default:
  const error = new Error(`Unknown tool: ${name}`);
  logger.error({ requestId, toolName: name }, error.message);
  throw error;
```

This will now catch the 6 removed tool names and properly return an error.

## Validation Steps

### 3.4.1 Tool Discovery Validation
```bash
# Test tool discovery
node -e "
const { createMcpServer } = require('./src/mcp-server.js');
// Test that tool discovery returns exactly 13 tools
"

# Or test via MCP client
npm test -- --grep "tool discovery"
```

### 3.4.2 Tool Execution Validation
```bash
# Test that removed tools return errors
node -e "
// Test calling a removed tool should fail with 'Unknown tool' error
"

# Test that remaining tools still work
npm test -- --grep "tool execution"
```

### 3.4.3 Switch Statement Validation
- [ ] No unreachable code warnings
- [ ] All remaining case statements work correctly
- [ ] Default case properly handles removed tool names
- [ ] No syntax errors in switch statement

## Commands to Run

### Before Updates
```bash
# Test current tool count
npm run start &
SERVER_PID=$!
# ... test tool discovery shows 19 tools
kill $SERVER_PID
```

### After Updates  
```bash
# Test compilation
npm run lint

# Test tool discovery returns 13 tools
npm test -- --grep "lists all available tools"

# Test removed tools return errors
npm test -- --grep "unknown tool"

# Test remaining tools still work
npm test -- --grep "card|transaction|health|alert|feed"

# Commit progress
git add .
git commit -m "Phase 3: Remove tool registrations from MCP server"
```

## Expected Results
- [ ] Tool discovery returns exactly 13 tools
- [ ] Removed tool names return "Unknown tool" errors
- [ ] All 13 remaining tools function correctly
- [ ] No compilation or runtime errors
- [ ] Server starts and operates normally

## Switch Statement Before/After

### Before (19 tools):
```javascript
switch (name) {
  case 'health_check': // 1 system tool
  case 'list_available_cards': // 5 card tools
  case 'get_card_details':
  case 'create_honeypot_card':
  case 'update_card_limits':
  case 'toggle_card_state':
  case 'get_transaction': // 5 transaction tools
  case 'search_transactions':
  case 'get_recent_transactions':
  case 'get_transactions_by_merchant':
  case 'get_transaction_details':
  case 'analyze_transaction_patterns': // 4 pattern tools (REMOVE)
  case 'detect_fraud_indicators':      // (REMOVE)
  case 'generate_merchant_intelligence': // (REMOVE)
  case 'perform_risk_assessment':      // (REMOVE)
  case 'subscribe_to_alerts': // 4 realtime tools
  case 'get_live_transaction_feed':
  case 'analyze_spending_patterns':    // (REMOVE)
  case 'generate_verification_questions': // (REMOVE)
  default:
}
```

### After (13 tools):
```javascript
switch (name) {
  case 'health_check': // 1 system tool
  case 'list_available_cards': // 5 card tools
  case 'get_card_details':
  case 'create_honeypot_card':
  case 'update_card_limits':
  case 'toggle_card_state':
  case 'get_transaction': // 5 transaction tools
  case 'search_transactions':
  case 'get_recent_transactions':
  case 'get_transactions_by_merchant':
  case 'get_transaction_details':
  case 'subscribe_to_alerts': // 2 realtime tools
  case 'get_live_transaction_feed':
  default: // Now catches the 6 removed tools
}
``` 