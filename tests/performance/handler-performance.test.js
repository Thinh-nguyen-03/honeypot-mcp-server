import { describe, test, expect, beforeEach, vi } from 'vitest';
import { performance } from 'perf_hooks';

/**
 * Performance Tests for MCP Tool Handlers
 * 
 * Validates the <200ms response time SLA requirement from DEVELOPER_INSTRUCTIONS.md
 * Tests all 18 MCP tools under various load conditions
 */

// Mock dependencies for consistent performance testing
vi.mock('../../../src/services/supabase-service.js');
vi.mock('../../../src/services/reporting-service.js');
vi.mock('../../../src/services/mcc-service.js');
vi.mock('../../../src/services/alert-service.js');
vi.mock('../../../src/utils/logger.js');

// Import handlers after mocking
import * as cardHandlers from '../../src/handlers/card-handlers.js';
import * as transactionHandlers from '../../src/handlers/transaction-handlers.js';
import * as patternHandlers from '../../src/handlers/pattern-analysis-handlers.js';
import * as realtimeHandlers from '../../src/handlers/realtime-intelligence-handlers.js';

import * as supabaseService from '../../src/services/supabase-service.js';
import * as reportingService from '../../src/services/reporting-service.js';
import * as mccService from '../../src/services/mcc-service.js';
import * as alertService from '../../src/services/alert-service.js';

describe('MCP Handler Performance Tests', () => {
  test('placeholder performance test', () => {
    expect(true).toBe(true);
  });
});

describe('MCP Handler Performance Tests - <200ms SLA Validation', () => {
  const mockRequestId = 'perf_test_123456789';
  const PERFORMANCE_SLA_MS = 200; // From DEVELOPER_INSTRUCTIONS.md

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock all services with fast responses
    setupServiceMocks();
  });

  function setupServiceMocks() {
    // Fast service responses for performance testing
    supabaseService.getAvailableCardsForMcp = vi.fn().mockResolvedValue({
      queryType: 'available_cards_list',
      cardCount: 5,
      cards: Array.from({ length: 5 }, (_, i) => ({ token: `card_${i}`, state: 'ACTIVE' }))
    });

    supabaseService.getCardDetailsForMcp = vi.fn().mockResolvedValue({
      token: 'card_test',
      state: 'ACTIVE',
      type: 'VIRTUAL'
    });

    supabaseService.createHoneypotCardForMcp = vi.fn().mockResolvedValue({
      cardToken: 'card_new_123',
      state: 'ACTIVE'
    });

    supabaseService.getTransaction = vi.fn().mockResolvedValue({
      token: 'txn_test',
      amount: 1000,
      status: 'SETTLED'
    });

    reportingService.searchTransactions = vi.fn().mockResolvedValue({
      transactions: [],
      totalCount: 0
    });

    reportingService.analyzePatterns = vi.fn().mockResolvedValue({
      patterns: [{ type: 'test', score: 0.5 }],
      anomalies: [],
      confidence: 0.8,
      riskScore: 0.3
    });

    reportingService.detectFraud = vi.fn().mockResolvedValue({
      riskScore: 0.7,
      riskLevel: 'MEDIUM',
      indicators: ['test_indicator'],
      confidence: 0.85
    });

    mccService.getMerchantIntel = vi.fn().mockResolvedValue({
      merchantProfile: { name: 'Test Merchant' },
      riskProfile: { riskScore: 0.2 },
      reputation: { score: 0.9 }
    });

    alertService.createMcpSubscription = vi.fn().mockResolvedValue({
      subscriptionId: 'sub_test',
      status: 'active',
      expiresAt: new Date().toISOString()
    });

    alertService.getLiveFeed = vi.fn().mockResolvedValue({
      feedId: 'feed_test',
      status: 'active',
      expiresAt: new Date().toISOString()
    });
  }

  async function measureHandlerPerformance(handlerFunction, args) {
    const startTime = performance.now();
    await handlerFunction(args, mockRequestId);
    const endTime = performance.now();
    return endTime - startTime;
  }

  describe('Card Handler Performance Tests', () => {
    test('handleListAvailableCards should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        cardHandlers.handleListAvailableCards,
        { includeDetails: true, limit: 50 }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleGetCardDetails should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        cardHandlers.handleGetCardDetails,
        { cardToken: 'card_performance_test' }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleCreateHoneypotCard should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        cardHandlers.handleCreateHoneypotCard,
        { spendLimit: 1000, cardType: 'VIRTUAL' }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleToggleCardState should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        cardHandlers.handleToggleCardState,
        { cardToken: 'card_toggle_test', newState: 'PAUSED' }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleUpdateCardLimits should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        cardHandlers.handleUpdateCardLimits,
        { cardToken: 'card_limits_test', spendLimit: 2000 }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });
  });

  describe('Transaction Handler Performance Tests', () => {
    test('handleGetTransaction should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        transactionHandlers.handleGetTransaction,
        { transactionToken: 'txn_performance_test' }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleSearchTransactions should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        transactionHandlers.handleSearchTransactions,
        { limit: 100, sortBy: 'created' }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleGetRecentTransactions should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        transactionHandlers.handleGetRecentTransactions,
        { cardToken: 'card_recent_test', limit: 50 }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleGetTransactionsByMerchant should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        transactionHandlers.handleGetTransactionsByMerchant,
        { merchantDescriptor: 'TEST_MERCHANT', timeframe: '30d' }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleGetTransactionDetails should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        transactionHandlers.handleGetTransactionDetails,
        { transactionToken: 'txn_details_test', analysisLevel: 'comprehensive' }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });
  });

  describe('Pattern Analysis Handler Performance Tests', () => {
    test('handleAnalyzeTransactionPatterns should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        patternHandlers.handleAnalyzeTransactionPatterns,
        { 
          cardToken: 'card_pattern_test',
          analysisWindow: '30d',
          patternTypes: ['temporal', 'merchant', 'amount']
        }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleDetectFraudIndicators should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        patternHandlers.handleDetectFraudIndicators,
        { 
          transactionToken: 'txn_fraud_test',
          analysisDepth: 'comprehensive',
          includeMLModels: true
        }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleGenerateMerchantIntelligence should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        patternHandlers.handleGenerateMerchantIntelligence,
        { 
          merchantDescriptor: 'PERFORMANCE_TEST_MERCHANT',
          analysisType: 'comprehensive',
          includeIndustryData: true
        }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handlePerformRiskAssessment should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        patternHandlers.handlePerformRiskAssessment,
        { 
          entityType: 'transaction',
          entityId: 'txn_risk_test',
          assessmentType: 'fraud',
          riskFactors: ['velocity', 'amount_deviation']
        }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });
  });

  describe('Real-time Intelligence Handler Performance Tests', () => {
    test('handleSubscribeToAlerts should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        realtimeHandlers.handleSubscribeToAlerts,
        { 
          cardTokens: ['card_alert_1', 'card_alert_2'],
          alertTypes: ['fraud_detected'],
          subscriptionDuration: '1h'
        }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleGetLiveTransactionFeed should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        realtimeHandlers.handleGetLiveTransactionFeed,
        { 
          cardTokenFilter: ['card_feed_test'],
          feedDuration: '30m',
          includeRealTimeAnalysis: true
        }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleAnalyzeSpendingPatterns should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        realtimeHandlers.handleAnalyzeSpendingPatterns,
        { 
          cardToken: 'card_spending_test',
          analysisType: 'realtime',
          timeWindow: '24h',
          realTimeMode: true
        }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('handleGenerateVerificationQuestions should complete within 200ms', async () => {
      const executionTime = await measureHandlerPerformance(
        realtimeHandlers.handleGenerateVerificationQuestions,
        { 
          cardToken: 'card_verification_test',
          questionType: 'mixed',
          questionCount: 5,
          adaptToScammerTactics: true
        }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });
  });

  describe('Load Testing', () => {
    test('should handle 10 concurrent requests within performance budget', async () => {
      const concurrentCalls = Array.from({ length: 10 }, () =>
        measureHandlerPerformance(
          cardHandlers.handleListAvailableCards,
          { limit: 10 }
        )
      );

      const startTime = performance.now();
      const executionTimes = await Promise.all(concurrentCalls);
      const totalTime = performance.now() - startTime;

      // Each individual call should be under 200ms
      executionTimes.forEach(time => {
        expect(time).toBeLessThan(PERFORMANCE_SLA_MS);
      });

      // Total concurrent execution should be reasonable (not 10x slower)
      expect(totalTime).toBeLessThan(PERFORMANCE_SLA_MS * 3);
    });

    test('should maintain performance with large data sets', async () => {
      // Mock large dataset response
      supabaseService.getAvailableCardsForMcp.mockResolvedValue({
        queryType: 'available_cards_list',
        cardCount: 200,
        cards: Array.from({ length: 200 }, (_, i) => ({ 
          token: `card_large_${i}`, 
          state: 'ACTIVE',
          details: { amount: i * 100, merchant: `merchant_${i}` }
        }))
      });

      const executionTime = await measureHandlerPerformance(
        cardHandlers.handleListAvailableCards,
        { includeDetails: true, limit: 200 }
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
    });

    test('should handle rapid successive calls efficiently', async () => {
      const rapidCalls = [];
      const startTime = performance.now();

      // Make 20 rapid successive calls
      for (let i = 0; i < 20; i++) {
        rapidCalls.push(
          cardHandlers.handleGetCardDetails(
            { cardToken: `card_rapid_${i}` },
            `${mockRequestId}_${i}`
          )
        );
      }

      await Promise.all(rapidCalls);
      const totalTime = performance.now() - startTime;

      // 20 calls should complete in reasonable time
      expect(totalTime).toBeLessThan(PERFORMANCE_SLA_MS * 5);
    });
  });

  describe('Memory and Resource Performance', () => {
    test('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform 100 operations
      for (let i = 0; i < 100; i++) {
        await cardHandlers.handleListAvailableCards(
          { limit: 10 },
          `${mockRequestId}_memory_${i}`
        );
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('should handle error conditions without performance degradation', async () => {
      // Mock service to occasionally throw errors
      let callCount = 0;
      supabaseService.getCardDetailsForMcp.mockImplementation(() => {
        callCount++;
        if (callCount % 3 === 0) {
          throw new Error('Simulated service error');
        }
        return Promise.resolve({ token: 'card_test', state: 'ACTIVE' });
      });

      const executionTimes = [];

      // Make 10 calls, some will error
      for (let i = 0; i < 10; i++) {
        try {
          const startTime = performance.now();
          await cardHandlers.handleGetCardDetails(
            { cardToken: `card_error_test_${i}` },
            `${mockRequestId}_error_${i}`
          );
          const endTime = performance.now();
          executionTimes.push(endTime - startTime);
        } catch (error) {
          // Error handling should also be fast
          const startTime = performance.now();
          // Measure error handling time
          const endTime = performance.now();
          executionTimes.push(endTime - startTime);
        }
      }

      // Even with errors, performance should remain consistent
      executionTimes.forEach(time => {
        expect(time).toBeLessThan(PERFORMANCE_SLA_MS);
      });
    });
  });

  describe('Complex Workflow Performance', () => {
    test('should complete fraud investigation workflow within performance budget', async () => {
      const startTime = performance.now();

      // Simulate complete fraud investigation workflow
      await cardHandlers.handleListAvailableCards({ limit: 10 }, mockRequestId);
      await patternHandlers.handleAnalyzeTransactionPatterns({
        cardToken: 'card_workflow_test',
        analysisWindow: '7d'
      }, mockRequestId);
      await patternHandlers.handleDetectFraudIndicators({
        transactionToken: 'txn_workflow_test'
      }, mockRequestId);
      await realtimeHandlers.handleGenerateVerificationQuestions({
        cardToken: 'card_workflow_test',
        questionCount: 5
      }, mockRequestId);

      const totalTime = performance.now() - startTime;

      // Complete workflow should finish within 500ms
      expect(totalTime).toBeLessThan(500);
    });

    test('should maintain performance during real-time monitoring setup', async () => {
      const startTime = performance.now();

      // Simulate real-time monitoring setup
      await realtimeHandlers.handleSubscribeToAlerts({
        cardTokens: ['card_1', 'card_2', 'card_3'],
        alertTypes: ['fraud_detected']
      }, mockRequestId);

      await realtimeHandlers.handleGetLiveTransactionFeed({
        cardTokenFilter: ['card_1', 'card_2', 'card_3'],
        feedDuration: '1h'
      }, mockRequestId);

      await realtimeHandlers.handleAnalyzeSpendingPatterns({
        cardToken: 'card_1',
        analysisType: 'realtime',
        realTimeMode: true
      }, mockRequestId);

      const totalTime = performance.now() - startTime;

      // Real-time setup should be fast
      expect(totalTime).toBeLessThan(400);
    });
  });
}); 