# Phase 1: Handler Cleanup

## Overview
Remove handler functions for the 6 tools while preserving utility functions and remaining tool handlers.

## 1.1 src/handlers/pattern-analysis-handlers.js

### Handler Functions to Remove ❌
- [ ] `handleAnalyzeTransactionPatterns()` (lines ~15-86)
- [ ] `handleDetectFraudIndicators()` (lines ~92-171) 
- [ ] `handleGenerateMerchantIntelligence()` (lines ~177-264)
- [ ] `handlePerformRiskAssessment()` (lines ~270-354)

### Helper Functions to Remove ❌
- [ ] `analyzePatterns()` (lines ~425-447)
- [ ] `detectAnomalies()` (lines ~448-467) 
- [ ] `generatePatternSummary()` (lines ~468-471)
- [ ] `calculatePatternRiskScore()` (lines ~472-482)
- [ ] `calculateFraudRiskScore()` (lines ~483-494)
- [ ] `detectFraudIndicators()` (lines ~495-516)
- [ ] `generateMLPredictions()` (lines ~517-525)
- [ ] `generateFraudRecommendations()` (lines ~526-545)
- [ ] `calculateMerchantRiskScore()` (lines ~580-590)
- [ ] `identifyMerchantRiskFactors()` (lines ~591-607)
- [ ] `generateMerchantRecommendations()` (lines ~608-626)

### MUST PRESERVE ✅
- [ ] File header and imports
- [ ] `sanitizeArgs()` function
- [ ] `maskToken()` function  
- [ ] `maskSensitiveId()` function
- [ ] `extractTimestamp()` function
- [ ] `formatMcpError()` function
- [ ] `calculateAverageAmount()` function (if used by other tools)
- [ ] `extractCommonLocations()` function (if used by other tools)
- [ ] `extractMccCodes()` function (if used by other tools)

### Validation Checklist
- [ ] File compiles without syntax errors
- [ ] All utility functions remain intact
- [ ] No remaining tools depend on removed functions
- [ ] File size significantly reduced (should be ~50% smaller)

## 1.2 src/handlers/realtime-intelligence-handlers.js

### Handler Functions to Remove ❌
- [ ] `handleAnalyzeSpendingPatterns()` (lines ~208-282)
- [ ] `handleGenerateVerificationQuestions()` (lines ~489-580)

### Helper Functions to Remove ❌
- [ ] `analyzeSpendingPatterns()` (lines ~288-305)
- [ ] `analyzeTimePatterns()` (lines ~306-328)
- [ ] `analyzeMerchantPatterns()` (lines ~329-352)
- [ ] `analyzeAmountPatterns()` (lines ~353-381)
- [ ] `generateBaseline()` (lines ~382-394)
- [ ] `getTopCategories()` (lines ~395-407)
- [ ] `detectSpendingDeviations()` (lines ~408-431)
- [ ] `generateSpendingPredictions()` (lines ~432-460)
- [ ] `generateRealTimeInsights()` (lines ~461-475)
- [ ] `generateSpendingAnalysisSummary()` (lines ~476-488)
- [ ] `generateVerificationQuestions()` (lines ~586-613)
- [ ] `generateMerchantQuestions()` (lines ~614-685)
- [ ] `generateAmountQuestions()` (lines ~686-734)
- [ ] `generateTimingQuestions()` (lines ~735-779)
- [ ] `generateLocationQuestions()` (lines ~780-808)
- [ ] `generateUsageInstructions()` (lines ~809-824)
- [ ] `generateFakeMerchant()` (lines ~825-836)
- [ ] `generateFakeLocation()` (lines ~837-847)
- [ ] `shuffleArray()` (lines ~848-863)

### CRITICAL - MUST PRESERVE ✅
- [ ] `handleSubscribeToAlerts()` (lines ~15-80)
- [ ] `handleGetLiveTransactionFeed()` (lines ~86-204)
- [ ] File header and imports
- [ ] `sanitizeArgs()` function
- [ ] `maskToken()` function
- [ ] `extractTimestamp()` function  
- [ ] `formatMcpError()` function

### Validation Checklist
- [ ] File compiles without syntax errors
- [ ] `handleSubscribeToAlerts()` function works correctly
- [ ] `handleGetLiveTransactionFeed()` function works correctly
- [ ] All utility functions remain intact
- [ ] No references to removed functions remain

## Commands to Run

### Before Starting
```bash
# Create backup branch
git checkout -b remove-analysis-tools

# Run tests to ensure baseline
npm test
```

### After Handler Cleanup
```bash
# Test compilation
npm run lint

# Run specific handler tests
npm test -- --grep "pattern-analysis-handlers"
npm test -- --grep "realtime-intelligence-handlers"

# Commit progress
git add .
git commit -m "Phase 1: Remove handler functions for 6 analysis tools"
```

## Expected Outcome
- `pattern-analysis-handlers.js` should be nearly empty (just utilities)
- `realtime-intelligence-handlers.js` should have 2 handlers + utilities
- No compilation errors
- Remaining handlers still functional 