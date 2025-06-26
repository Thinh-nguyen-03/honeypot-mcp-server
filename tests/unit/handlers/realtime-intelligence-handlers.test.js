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


  });

  describe('Input Validation Tests', () => {


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


  });
}); 