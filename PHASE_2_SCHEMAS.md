# Phase 2: Schema Cleanup

## Overview
Remove schema definitions for the 6 tools while preserving schemas for remaining tools.

## 2.1 src/schemas/pattern-analysis-schemas.js

### Schemas to Remove ❌ (ALL 4)
- [ ] `analyzeTransactionPatternsSchema` (lines ~8-51)
- [ ] `detectFraudIndicatorsSchema` (lines ~52-100) 
- [ ] `generateMerchantIntelligenceSchema` (lines ~101-150)
- [ ] `performRiskAssessmentSchema` (lines ~151-213)

### Action Required
Since ALL 4 schemas in this file are being removed:
- [ ] Keep file header comment
- [ ] Remove all schema exports  
- [ ] File should be nearly empty (just header)

### Expected File Content After Cleanup
```javascript
/**
 * Pattern Analysis Tool Schemas
 * MCP tool definitions for advanced fraud detection and analysis operations
 * 
 * NOTE: All pattern analysis tools have been removed.
 * This file is preserved for potential future use.
 */

// No schemas exported - all pattern analysis tools removed
```

## 2.2 src/schemas/realtime-intelligence-schemas.js

### Schemas to Remove ❌ (2 out of 4)
- [ ] `analyzeSpendingPatternsSchema` (lines ~114-164)
- [ ] `generateVerificationQuestionsSchema` (lines ~165-228)

### CRITICAL - MUST PRESERVE ✅ (2 out of 4)
- [ ] `subscribeToAlertsSchema` (lines ~8-48)
- [ ] `getLiveTransactionFeedSchema` (lines ~49-113)

### Export Statement Updates
Ensure the export statements only include preserved schemas:
```javascript
// Remove these from exports:
// export const analyzeSpendingPatternsSchema = { ... };
// export const generateVerificationQuestionsSchema = { ... };

// Keep these exports:
export const subscribeToAlertsSchema = { ... };
export const getLiveTransactionFeedSchema = { ... };
```

### Update Schema Collections
If there are any array exports that collect all schemas, update them:
```javascript
// Before: 4 schemas
export const realtimeIntelligenceToolSchemas = [
  subscribeToAlertsSchema,
  getLiveTransactionFeedSchema,
  analyzeSpendingPatternsSchema,     // REMOVE
  generateVerificationQuestionsSchema // REMOVE
];

// After: 2 schemas
export const realtimeIntelligenceToolSchemas = [
  subscribeToAlertsSchema,
  getLiveTransactionFeedSchema
];
```

## Schema Import Updates

### Check src/mcp-server.js
Verify that imports still work after schema removal:
- [ ] `import { patternAnalysisToolSchemas }` - should import empty array
- [ ] `import { realtimeIntelligenceToolSchemas }` - should import 2 schemas

### Tool Discovery Updates
In `src/mcp-server.js`, the tool discovery should automatically reflect the reduced count:
- [ ] Pattern analysis tools: 4 → 0 tools
- [ ] Real-time intelligence tools: 4 → 2 tools  
- [ ] Total tools: 19 → 13 tools

## Validation Steps

### Before Schema Cleanup
```bash
# Count current tools
grep -r "name:" src/schemas/ | wc -l
# Should show 18 tools (excluding health_check)
```

### After Schema Cleanup
```bash
# Test schema imports
node -e "
const { patternAnalysisToolSchemas } = require('./src/schemas/pattern-analysis-schemas.js');
const { realtimeIntelligenceToolSchemas } = require('./src/schemas/realtime-intelligence-schemas.js');
console.log('Pattern analysis schemas:', patternAnalysisToolSchemas.length);
console.log('Real-time intelligence schemas:', realtimeIntelligenceToolSchemas.length);
"

# Test compilation
npm run lint

# Run schema tests
npm test -- --grep "schema"

# Commit progress
git add .
git commit -m "Phase 2: Remove schemas for 6 analysis tools"
```

## Expected Results
- `pattern-analysis-schemas.js`: Nearly empty (no exports)
- `realtime-intelligence-schemas.js`: 2 schemas remaining
- Tool discovery returns 13 tools total
- No compilation errors
- All remaining schemas validate correctly

## File Size Comparison
- `pattern-analysis-schemas.js`: ~213 lines → ~10 lines
- `realtime-intelligence-schemas.js`: ~228 lines → ~120 lines  

## Import Chain Verification
Ensure these files can still import the schema files without errors:
- [ ] `src/mcp-server.js` imports both schema files
- [ ] Pattern analysis import returns empty/minimal schema array
- [ ] Real-time intelligence import returns 2-item schema array 