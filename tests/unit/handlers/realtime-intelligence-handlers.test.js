import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock all dependencies BEFORE importing anything else
vi.mock('lithic', () => {
  const MockLithic = vi.fn().mockImplementation(() => ({
    cards: {
      create: vi.fn(),
      retrieve: vi.fn(),
      list: vi.fn(),
      update: vi.fn()
    },
    transactions: {
      retrieve: vi.fn(),
      list: vi.fn()
    }
  }));
  
  return {
    default: MockLithic,
    Lithic: MockLithic
  };
});

vi.mock('pino', () => ({
  default: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }))
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }))
  }))
}));

vi.mock('../../../src/services/alert-service.js');
vi.mock('../../../src/services/reporting-service.js');
vi.mock('../../../src/utils/logger.js');

// Now import the modules
import * as realtimeHandlers from '../../../src/handlers/realtime-intelligence-handlers.js';
import * as alertService from '../../../src/services/alert-service.js';
import * as reportingService from '../../../src/services/reporting-service.js';
import logger from '../../../src/utils/logger.js';

describe('Real-time Intelligence Handlers - MCP Tool Implementation', () => {
  let mockRequestId;
  
  beforeEach(() => {
    mockRequestId = 'mcp_test_123456789';
    vi.clearAllMocks();
    
    // Mock logger methods
    logger.info = vi.fn();
    logger.error = vi.fn();
    logger.warn = vi.fn();
    logger.debug = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Security Tests', () => {
    test('should sanitize card tokens in alert subscription logs', async () => {
      const argsWithSensitiveData = {
        cardTokens: ['card_abc123def456789012', 'card_xyz987uvw654321098'],
        alertTypes: ['fraud_detected'],
        riskThreshold: 0.8
      };

      alertService.createMcpSubscription = vi.fn().mockResolvedValue({
        subscriptionId: 'sub_12345',
        status: 'active',
        connectionDetails: { endpoint: 'wss://alerts.example.com' },
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      });

      await realtimeHandlers.handleSubscribeToAlerts(argsWithSensitiveData, mockRequestId);

      // Verify that card tokens are masked in logs
      const loggerCalls = logger.info.mock.calls;
      loggerCalls.forEach(call => {
        const loggedArgs = call[0];
        if (loggedArgs.args && loggedArgs.args.cardTokens) {
          expect(loggedArgs.args.cardTokens[0]).toBe('card_abc***');
          expect(loggedArgs.args.cardTokens[1]).toBe('card_xyz***');
        }
      });
    });

    test('should sanitize card token filter in live feed logs', async () => {
      const argsWithSensitiveData = {
        cardTokenFilter: ['card_sensitive123456789'],
        transactionTypes: ['authorization'],
        feedDuration: '30m'
      };

      alertService.getLiveFeed = vi.fn().mockResolvedValue({
        feedId: 'feed_67890',
        status: 'active',
        feedDetails: { protocol: 'websocket' },
        connectionInfo: { url: 'wss://feed.example.com' },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        initialTransactions: []
      });

      await realtimeHandlers.handleGetLiveTransactionFeed(argsWithSensitiveData, mockRequestId);

      // Verify card token filter is masked in logs
      const loggerCalls = logger.info.mock.calls;
      loggerCalls.forEach(call => {
        const loggedArgs = call[0];
        if (loggedArgs.args && loggedArgs.args.cardTokenFilter) {
          expect(loggedArgs.args.cardTokenFilter[0]).toBe('card_sen***');
        }
      });
    });

    test('should sanitize card token in spending pattern analysis', async () => {
      const argsWithSensitiveData = {
        cardToken: 'card_spending_analysis_123',
        analysisType: 'comprehensive',
        realTimeMode: true
      };

      reportingService.analyzeSpendingPatterns = vi.fn().mockResolvedValue({
        patterns: [{ type: 'daily_spend', value: 150 }],
        deviations: [],
        baseline: { averageDaily: 120 },
        riskIndicators: [],
        summary: 'Normal spending pattern'
      });

      await realtimeHandlers.handleAnalyzeSpendingPatterns(argsWithSensitiveData, mockRequestId);

      // Verify card token is masked in logs
      const loggerCalls = logger.info.mock.calls;
      loggerCalls.forEach(call => {
        const loggedArgs = call[0];
        if (loggedArgs.cardToken) {
          expect(loggedArgs.cardToken).toBe('card_spe***');
        }
      });
    });

    test('should sanitize card token in verification question generation', async () => {
      const argsWithSensitiveData = {
        cardToken: 'card_verification_secure_456',
        questionType: 'mixed',
        adaptToScammerTactics: true
      };

      reportingService.generateQuestions = vi.fn().mockResolvedValue({
        questions: [
          { question: 'What was your last transaction amount?', type: 'amount' },
          { question: 'Which merchant did you shop at yesterday?', type: 'merchant' }
        ],
        transactionHistoryAnalyzed: 30,
        patternsUsed: ['recent_transactions', 'merchant_preferences'],
        scammerAdaptations: ['avoid_obvious_answers'],
        usageInstructions: 'Ask questions in random order',
        effectiveness: { confidence: 0.9 }
      });

      await realtimeHandlers.handleGenerateVerificationQuestions(argsWithSensitiveData, mockRequestId);

      // Verify card token is masked in logs
      const loggerCalls = logger.info.mock.calls;
      loggerCalls.forEach(call => {
        const loggedArgs = call[0];
        if (loggedArgs.cardToken) {
          expect(loggedArgs.cardToken).toBe('card_ver***');
        }
      });
    });
  });

  describe('Input Validation Tests', () => {
    test('handleAnalyzeSpendingPatterns - validates required cardToken', async () => {
      const argsWithoutCard = {
        analysisType: 'comprehensive',
        timeWindow: '24h'
      };

      await expect(
        realtimeHandlers.handleAnalyzeSpendingPatterns(argsWithoutCard, mockRequestId)
      ).rejects.toThrow(/cardToken.*required/i);
    });

    test('handleGenerateVerificationQuestions - validates required cardToken', async () => {
      const argsWithoutCard = {
        questionType: 'mixed',
        questionCount: 5
      };

      await expect(
        realtimeHandlers.handleGenerateVerificationQuestions(argsWithoutCard, mockRequestId)
      ).rejects.toThrow(/cardToken.*required/i);
    });

    test('handleSubscribeToAlerts - enforces maximum alerts per minute', async () => {
      const argsWithHighLimit = {
        cardTokens: ['card_123'],
        maxAlertsPerMinute: 500 // Over maximum of 100
      };

      alertService.createMcpSubscription = vi.fn().mockResolvedValue({
        subscriptionId: 'sub_12345',
        status: 'active',
        connectionDetails: {},
        expiresAt: new Date().toISOString()
      });

      await realtimeHandlers.handleSubscribeToAlerts(argsWithHighLimit, mockRequestId);

      // Verify limit was capped at 100
      expect(alertService.createMcpSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          maxAlertsPerMinute: 100
        }),
        mockRequestId
      );
    });

    test('handleGetLiveTransactionFeed - enforces maximum transactions per minute', async () => {
      const argsWithHighLimit = {
        cardTokenFilter: ['card_123'],
        maxTransactionsPerMinute: 200 // Over maximum of 50
      };

      alertService.getLiveFeed = vi.fn().mockResolvedValue({
        feedId: 'feed_123',
        status: 'active',
        feedDetails: {},
        connectionInfo: {},
        expiresAt: new Date().toISOString()
      });

      await realtimeHandlers.handleGetLiveTransactionFeed(argsWithHighLimit, mockRequestId);

      // Verify limit was capped at 50
      expect(alertService.getLiveFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTransactionsPerMinute: 50
        }),
        mockRequestId
      );
    });

    test('handleGenerateVerificationQuestions - enforces maximum question count', async () => {
      const argsWithHighCount = {
        cardToken: 'card_123',
        questionCount: 25 // Over maximum of 10
      };

      reportingService.generateQuestions = vi.fn().mockResolvedValue({
        questions: Array.from({ length: 10 }, (_, i) => ({ question: `Q${i}`, type: 'test' })),
        transactionHistoryAnalyzed: 30,
        patternsUsed: [],
        usageInstructions: 'Test',
        effectiveness: { confidence: 0.8 }
      });

      await realtimeHandlers.handleGenerateVerificationQuestions(argsWithHighCount, mockRequestId);

      // Verify count was capped at 10
      expect(reportingService.generateQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          questionCount: 10
        }),
        mockRequestId
      );
    });
  });

  describe('Business Logic Tests', () => {
    test('handleSubscribeToAlerts - applies default values correctly', async () => {
      const minimalArgs = {
        // No parameters specified - should use all defaults
      };

      const mockSubscription = {
        subscriptionId: 'sub_default_123',
        status: 'active',
        connectionDetails: { endpoint: 'wss://alerts.example.com' },
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      };

      alertService.createMcpSubscription = vi.fn().mockResolvedValue(mockSubscription);

      const result = await realtimeHandlers.handleSubscribeToAlerts(minimalArgs, mockRequestId);

      // Verify defaults applied
      expect(alertService.createMcpSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          cardTokens: [],
          alertTypes: ['fraud_detected', 'high_risk_transaction'],
          riskThreshold: 0.7,
          includeContext: true,
          maxAlertsPerMinute: 10,
          subscriptionDuration: '4h',
          mcpMode: true
        }),
        mockRequestId
      );

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.alertSubscription.subscriptionId).toBe('sub_default_123');
      expect(parsedResponse.alertSubscription.alertTypes).toEqual(['fraud_detected', 'high_risk_transaction']);
    });

    test('handleGetLiveTransactionFeed - preserves service function behavior', async () => {
      const args = {
        cardTokenFilter: ['card_12345', 'card_67890'],
        transactionTypes: ['authorization', 'settlement'],
        feedDuration: '1h',
        includeRealTimeAnalysis: true,
        maxTransactionsPerMinute: 30
      };

      const mockFeed = {
        feedId: 'feed_comprehensive',
        status: 'active',
        feedDetails: { protocol: 'websocket', compression: 'gzip' },
        connectionInfo: { url: 'wss://feed.example.com', auth: 'required' },
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        initialTransactions: [
          { token: 'txn_1', amount: 100 },
          { token: 'txn_2', amount: 250 }
        ]
      };

      alertService.getLiveFeed = vi.fn().mockResolvedValue(mockFeed);

      const result = await realtimeHandlers.handleGetLiveTransactionFeed(args, mockRequestId);

      // Verify service called correctly
      expect(alertService.getLiveFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          cardTokenFilter: ['card_12345', 'card_67890'],
          includeRealTimeAnalysis: true,
          transactionTypes: ['authorization', 'settlement'],
          feedDuration: '1h',
          maxTransactionsPerMinute: 30,
          includeMetadata: true
        }),
        mockRequestId
      );

      // Verify response structure
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.liveTransactionFeed.feedId).toBe('feed_comprehensive');
      expect(parsedResponse.liveTransactionFeed.initialTransactions).toHaveLength(2);
      expect(parsedResponse.liveTransactionFeed.cardTokenFilter).toEqual(['card_123***', 'card_678***']);
    });

    test('handleAnalyzeSpendingPatterns - handles real-time mode correctly', async () => {
      const args = {
        cardToken: 'card_realtime_test',
        analysisType: 'realtime',
        timeWindow: '2h',
        deviationThreshold: 0.5,
        realTimeMode: true,
        includePredictions: true
      };

      const mockAnalysis = {
        patterns: [
          { type: 'hourly_spend', value: 75, trend: 'increasing' },
          { type: 'merchant_frequency', value: 3, trend: 'normal' }
        ],
        deviations: [
          { type: 'amount_spike', severity: 'medium', timestamp: new Date().toISOString() }
        ],
        baseline: { averageHourly: 50, standardDeviation: 15 },
        predictions: { nextHour: 85, confidence: 0.8 },
        riskIndicators: ['unusual_velocity'],
        summary: 'Elevated spending detected with medium risk',
        realTimeStatus: { active: true, updateFrequency: '5m' }
      };

      reportingService.analyzeSpendingPatterns = vi.fn().mockResolvedValue(mockAnalysis);

      const result = await realtimeHandlers.handleAnalyzeSpendingPatterns(args, mockRequestId);

      // Verify service called correctly
      expect(reportingService.analyzeSpendingPatterns).toHaveBeenCalledWith(
        expect.objectContaining({
          cardToken: 'card_realtime_test',
          analysisType: 'realtime',
          timeWindow: '2h',
          includeBaseline: true,
          deviationThreshold: 0.5,
          includePredictions: true,
          realTimeMode: true
        }),
        mockRequestId
      );

      // Verify response includes real-time data
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.spendingPatternAnalysis.patterns).toEqual(mockAnalysis.patterns);
      expect(parsedResponse.spendingPatternAnalysis.realTimeMonitoring).toEqual(mockAnalysis.realTimeStatus);
      expect(parsedResponse.spendingPatternAnalysis.predictions).toEqual(mockAnalysis.predictions);
    });

    test('handleGenerateVerificationQuestions - creates contextual questions', async () => {
      const args = {
        cardToken: 'card_verification_context',
        questionType: 'contextual',
        difficultyLevel: 'hard',
        questionCount: 7,
        timeframe: '14d',
        includeDecoys: true,
        contextualHints: true,
        adaptToScammerTactics: true
      };

      const mockQuestions = {
        questions: [
          { question: 'What was the exact amount of your Amazon purchase last Tuesday?', type: 'amount', difficulty: 'hard' },
          { question: 'Which gas station did you visit on December 15th?', type: 'merchant', difficulty: 'hard' },
          { question: 'How many transactions did you make at coffee shops this week?', type: 'frequency', difficulty: 'medium' },
          { question: 'What time of day do you typically make online purchases?', type: 'pattern', difficulty: 'medium' },
          { question: 'Did you make a purchase for exactly $67.43 recently?', type: 'decoy', difficulty: 'easy' }
        ],
        transactionHistoryAnalyzed: 45,
        patternsUsed: ['merchant_preferences', 'timing_patterns', 'amount_patterns'],
        scammerAdaptations: ['avoid_round_amounts', 'focus_on_specifics', 'include_timing'],
        usageInstructions: 'Ask questions in conversational tone, mix difficulty levels',
        effectiveness: { confidence: 0.92, expectedAccuracy: 0.85 }
      };

      reportingService.generateQuestions = vi.fn().mockResolvedValue(mockQuestions);

      const result = await realtimeHandlers.handleGenerateVerificationQuestions(args, mockRequestId);

      // Verify service called correctly
      expect(reportingService.generateQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          cardToken: 'card_verification_context',
          questionType: 'contextual',
          difficultyLevel: 'hard',
          questionCount: 7,
          timeframe: '14d',
          includeDecoys: true,
          contextualHints: true,
          adaptToScammerTactics: true
        }),
        mockRequestId
      );

      // Verify response structure
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.verificationQuestions.questionSet.questions).toHaveLength(5);
      expect(parsedResponse.verificationQuestions.generationContext.adaptations).toEqual(mockQuestions.scammerAdaptations);
      expect(parsedResponse.verificationQuestions.effectiveness.confidence).toBe(0.92);
    });
  });

  describe('Error Handling Tests', () => {
    test('handles alert subscription service errors gracefully', async () => {
      const args = { cardTokens: ['card_error_test'] };
      const serviceError = new Error('Alert service unavailable');

      alertService.createMcpSubscription = vi.fn().mockRejectedValue(serviceError);

      await expect(
        realtimeHandlers.handleSubscribeToAlerts(args, mockRequestId)
      ).rejects.toThrow("Tool 'subscribe_to_alerts' failed: Alert service unavailable");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          cardTokenCount: 1,
          error: 'Alert service unavailable'
        }),
        'MCP tool error: subscribe_to_alerts'
      );
    });

    test('handles live feed service errors appropriately', async () => {
      const args = { feedDuration: '1h' };
      const feedError = new Error('Feed connection failed');

      alertService.getLiveFeed = vi.fn().mockRejectedValue(feedError);

      await expect(
        realtimeHandlers.handleGetLiveTransactionFeed(args, mockRequestId)
      ).rejects.toThrow("Tool 'get_live_transaction_feed' failed: Feed connection failed");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          cardFilterCount: 0,
          error: 'Feed connection failed'
        }),
        'MCP tool error: get_live_transaction_feed'
      );
    });

    test('handles spending pattern analysis errors', async () => {
      const args = { cardToken: 'card_analysis_error' };
      const analysisError = new Error('Pattern analysis engine timeout');

      reportingService.analyzeSpendingPatterns = vi.fn().mockRejectedValue(analysisError);

      await expect(
        realtimeHandlers.handleAnalyzeSpendingPatterns(args, mockRequestId)
      ).rejects.toThrow("Tool 'analyze_spending_patterns' failed: Pattern analysis engine timeout");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          cardToken: 'card_ana***',
          error: 'Pattern analysis engine timeout'
        }),
        'MCP tool error: analyze_spending_patterns'
      );
    });

    test('handles verification question generation errors', async () => {
      const args = { cardToken: 'card_question_error' };
      const questionError = new Error('Insufficient transaction history');

      reportingService.generateQuestions = vi.fn().mockRejectedValue(questionError);

      await expect(
        realtimeHandlers.handleGenerateVerificationQuestions(args, mockRequestId)
      ).rejects.toThrow("Tool 'generate_verification_questions' failed: Insufficient transaction history");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          cardToken: 'card_que***',
          error: 'Insufficient transaction history'
        }),
        'MCP tool error: generate_verification_questions'
      );
    });
  });

  describe('MCP Protocol Compliance Tests', () => {
    test('all handlers return proper MCP response format', async () => {
      const mockAlertResponse = {
        subscriptionId: 'sub_test',
        status: 'active',
        connectionDetails: {},
        expiresAt: new Date().toISOString()
      };
      
      alertService.createMcpSubscription = vi.fn().mockResolvedValue(mockAlertResponse);

      const result = await realtimeHandlers.handleSubscribeToAlerts({}, mockRequestId);

      // Verify MCP response structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    test('response content is properly JSON formatted for complex real-time data', async () => {
      const complexSpendingResult = {
        patterns: [
          { type: 'velocity', value: 5.2, trend: 'increasing', confidence: 0.9 },
          { type: 'amount_distribution', buckets: [10, 25, 50, 100], frequency: [2, 5, 3, 1] }
        ],
        deviations: [
          { type: 'time_anomaly', severity: 'high', details: 'Purchase at 3 AM unusual' }
        ],
        baseline: { daily: 120, weekly: 850, monthly: 3400 },
        predictions: { next24h: 180, confidence: 0.75 },
        riskIndicators: ['off_hours_activity', 'amount_spike'],
        summary: 'Complex spending pattern with multiple risk factors'
      };
      
      reportingService.analyzeSpendingPatterns = vi.fn().mockResolvedValue(complexSpendingResult);

      const result = await realtimeHandlers.handleAnalyzeSpendingPatterns(
        { cardToken: 'card_complex_test' }, 
        mockRequestId
      );

      // Verify JSON can be parsed
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
      
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.spendingPatternAnalysis.patterns).toEqual(complexSpendingResult.patterns);
      expect(parsedContent.spendingPatternAnalysis.deviations).toEqual(complexSpendingResult.deviations);
      expect(parsedContent.metadata.requestId).toBe(mockRequestId);
    });

    test('handles arrays and complex parameters in MCP format', async () => {
      const complexArgs = {
        cardTokens: ['card_1', 'card_2', 'card_3'],
        alertTypes: ['fraud_detected', 'high_risk_transaction', 'velocity_limit'],
        riskThreshold: 0.85,
        subscriptionDuration: '8h'
      };

      alertService.createMcpSubscription = vi.fn().mockResolvedValue({
        subscriptionId: 'sub_complex',
        status: 'active',
        connectionDetails: { endpoint: 'wss://test.com' },
        expiresAt: new Date().toISOString()
      });

      const result = await realtimeHandlers.handleSubscribeToAlerts(complexArgs, mockRequestId);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.alertSubscription.cardTokens).toEqual(['card_1', 'card_2', 'card_3']);
      expect(parsedResponse.alertSubscription.alertTypes).toEqual(complexArgs.alertTypes);
      expect(parsedResponse.metadata.subscriptionParams.riskThreshold).toBe(0.85);
    });
  });

  describe('Performance Tests', () => {
    test('real-time handlers complete within acceptable time limits', async () => {
      const args = { cardToken: 'card_performance_test' };
      
      // Mock service with simulated real-time processing delay
      reportingService.analyzeSpendingPatterns = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 75));
        return {
          patterns: [{ type: 'test', value: 100 }],
          deviations: [],
          baseline: {},
          riskIndicators: [],
          summary: 'Performance test result'
        };
      });

      const startTime = Date.now();
      await realtimeHandlers.handleAnalyzeSpendingPatterns(args, mockRequestId);
      const endTime = Date.now();

      // Real-time handlers should complete within 200ms (including 75ms service time)
      expect(endTime - startTime).toBeLessThan(200);
    });

    test('alert subscription handles multiple card tokens efficiently', async () => {
      const args = {
        cardTokens: Array.from({ length: 50 }, (_, i) => `card_perf_${i}`),
        alertTypes: ['fraud_detected']
      };

      alertService.createMcpSubscription = vi.fn().mockResolvedValue({
        subscriptionId: 'sub_performance',
        status: 'active',
        connectionDetails: {},
        expiresAt: new Date().toISOString()
      });

      const startTime = Date.now();
      const result = await realtimeHandlers.handleSubscribeToAlerts(args, mockRequestId);
      const endTime = Date.now();

      // Should handle large number of tokens within reasonable time
      expect(endTime - startTime).toBeLessThan(300);
      
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.alertSubscription.cardTokens).toHaveLength(50);
    });

    test('verification question generation handles complex requests efficiently', async () => {
      const args = {
        cardToken: 'card_complex_verification',
        questionType: 'mixed',
        questionCount: 10,
        timeframe: '90d',
        adaptToScammerTactics: true
      };

      const complexQuestions = {
        questions: Array.from({ length: 10 }, (_, i) => ({
          question: `Complex question ${i}`,
          type: 'mixed',
          difficulty: 'medium'
        })),
        transactionHistoryAnalyzed: 200,
        patternsUsed: ['merchants', 'amounts', 'timing', 'locations'],
        scammerAdaptations: ['multiple_tactics'],
        usageInstructions: 'Complex instructions',
        effectiveness: { confidence: 0.88 }
      };

      reportingService.generateQuestions = vi.fn().mockResolvedValue(complexQuestions);

      const startTime = Date.now();
      await realtimeHandlers.handleGenerateVerificationQuestions(args, mockRequestId);
      const endTime = Date.now();

      // Should handle complex question generation within reasonable time
      expect(endTime - startTime).toBeLessThan(250);
    });
  });

  describe('Edge Cases Tests', () => {
    test('handles alert subscription with empty card token array', async () => {
      const args = {
        cardTokens: [],
        alertTypes: ['fraud_detected']
      };

      alertService.createMcpSubscription = vi.fn().mockResolvedValue({
        subscriptionId: 'sub_empty_cards',
        status: 'active',
        connectionDetails: {},
        expiresAt: new Date().toISOString()
      });

      const result = await realtimeHandlers.handleSubscribeToAlerts(args, mockRequestId);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.alertSubscription.cardTokens).toEqual([]);
    });

    test('handles live feed with no initial transactions', async () => {
      const args = { feedDuration: '15m' };

      alertService.getLiveFeed = vi.fn().mockResolvedValue({
        feedId: 'feed_empty',
        status: 'active',
        feedDetails: {},
        connectionInfo: {},
        expiresAt: new Date().toISOString(),
        initialTransactions: []
      });

      const result = await realtimeHandlers.handleGetLiveTransactionFeed(args, mockRequestId);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.liveTransactionFeed.initialTransactions).toEqual([]);
    });

    test('handles spending pattern analysis with minimal data', async () => {
      const args = { cardToken: 'card_minimal_data' };

      reportingService.analyzeSpendingPatterns = vi.fn().mockResolvedValue({
        patterns: [],
        deviations: [],
        baseline: null,
        riskIndicators: [],
        summary: 'Insufficient data for comprehensive analysis'
      });

      const result = await realtimeHandlers.handleAnalyzeSpendingPatterns(args, mockRequestId);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.spendingPatternAnalysis.patterns).toEqual([]);
      expect(parsedResponse.spendingPatternAnalysis.baseline).toBeNull();
      expect(parsedResponse.spendingPatternAnalysis.summary).toBe('Insufficient data for comprehensive analysis');
    });

    test('handles verification questions with insufficient transaction history', async () => {
      const args = { cardToken: 'card_new_account' };

      reportingService.generateQuestions = vi.fn().mockResolvedValue({
        questions: [
          { question: 'What is your preferred spending category?', type: 'general' }
        ],
        transactionHistoryAnalyzed: 2,
        patternsUsed: [],
        usageInstructions: 'Limited questions due to insufficient history',
        effectiveness: { confidence: 0.3, note: 'Low confidence due to limited data' }
      });

      const result = await realtimeHandlers.handleGenerateVerificationQuestions(args, mockRequestId);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.verificationQuestions.questionSet.questions).toHaveLength(1);
      expect(parsedResponse.verificationQuestions.generationContext.transactionHistoryAnalyzed).toBe(2);
      expect(parsedResponse.verificationQuestions.effectiveness.confidence).toBe(0.3);
    });

    test('handles missing optional parameters gracefully', async () => {
      const minimalArgs = { cardToken: 'card_defaults_test' };

      reportingService.analyzeSpendingPatterns = vi.fn().mockResolvedValue({
        patterns: [{ type: 'default', value: 50 }],
        deviations: [],
        baseline: { average: 45 },
        riskIndicators: [],
        summary: 'Standard analysis with defaults'
      });

      const result = await realtimeHandlers.handleAnalyzeSpendingPatterns(minimalArgs, mockRequestId);

      // Verify defaults applied
      expect(reportingService.analyzeSpendingPatterns).toHaveBeenCalledWith(
        expect.objectContaining({
          analysisType: 'comprehensive',
          timeWindow: '24h',
          includeBaseline: true,
          deviationThreshold: 0.6,
          includePredictions: true,
          realTimeMode: false
        }),
        mockRequestId
      );

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.spendingPatternAnalysis.baseline).toEqual({ average: 45 });
      expect(parsedResponse.spendingPatternAnalysis.realTimeMonitoring).toBeUndefined();
    });
  });
}); 