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

vi.mock('../../../src/services/supabase-service.js');
vi.mock('../../../src/services/reporting-service.js');
vi.mock('../../../src/utils/logger.js');

// Now import the modules
import * as transactionHandlers from '../../../src/handlers/transaction-handlers.js';
import * as supabaseService from '../../../src/services/supabase-service.js';
import * as reportingService from '../../../src/services/reporting-service.js';
import logger from '../../../src/utils/logger.js';

describe('Transaction Handlers - MCP Tool Implementation', () => {
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
    test('should sanitize transaction tokens in logs', async () => {
      const argsWithSensitiveData = {
        transactionToken: 'txn_abc123def456789012',
        includeMetadata: true
      };

      supabaseService.getTransaction = vi.fn().mockResolvedValue({
        token: 'txn_abc123def456789012',
        amount: 2500,
        status: 'SETTLED'
      });

      await transactionHandlers.handleGetTransaction(argsWithSensitiveData, mockRequestId);

      // Verify that transaction tokens are masked in logs
      const loggerCalls = logger.info.mock.calls;
      loggerCalls.forEach(call => {
        const loggedArgs = call[0];
        if (loggedArgs.args && loggedArgs.args.transactionToken) {
          expect(loggedArgs.args.transactionToken).toBe('txn_abc1***');
        }
      });
    });

    test('should sanitize card tokens in search parameters', async () => {
      const searchArgs = {
        cardToken: 'card_def456ghi789012345',
        startDate: '2024-01-01',
        limit: 10
      };

      reportingService.searchTransactions = vi.fn().mockResolvedValue({
        transactions: [],
        totalCount: 0
      });

      await transactionHandlers.handleSearchTransactions(searchArgs, mockRequestId);

      // Verify card token is masked in logs
      const loggerCalls = logger.info.mock.calls;
      loggerCalls.forEach(call => {
        const loggedArgs = call[0];
        if (loggedArgs.cardToken) {
          expect(loggedArgs.cardToken).toBe('card_def***');
        }
      });
    });

    test('should handle sensitive transaction data appropriately', async () => {
      const args = {
        transactionToken: 'txn_sensitive123456',
        analysisLevel: 'comprehensive'
      };

      reportingService.getDetailedAnalysis = vi.fn().mockResolvedValue({
        transaction: { token: 'txn_sensitive123456', amount: 5000 },
        analysis: { riskScore: 0.85 },
        riskFactors: ['high_amount', 'new_merchant']
      });

      await transactionHandlers.handleGetTransactionDetails(args, mockRequestId);

      // Verify transaction token is masked in response
      const logCall = logger.info.mock.calls.find(call => 
        call[1] === 'MCP tool: get_transaction_details completed successfully'
      );
      expect(logCall[0].transactionToken).toBe('txn_sens***');
    });
  });

  describe('Input Validation Tests', () => {
    test('handleGetTransaction - validates required transactionToken', async () => {
      const argsWithoutToken = {
        includeMetadata: true
      };

      await expect(
        transactionHandlers.handleGetTransaction(argsWithoutToken, mockRequestId)
      ).rejects.toThrow(/transactionToken.*required/i);
    });

    test('handleGetRecentTransactions - validates required cardToken', async () => {
      const argsWithoutCard = {
        limit: 20
      };

      await expect(
        transactionHandlers.handleGetRecentTransactions(argsWithoutCard, mockRequestId)
      ).rejects.toThrow(/cardToken.*required/i);
    });

    test('handleGetTransactionsByMerchant - validates required merchantDescriptor', async () => {
      const argsWithoutMerchant = {
        timeframe: '30d'
      };

      await expect(
        transactionHandlers.handleGetTransactionsByMerchant(argsWithoutMerchant, mockRequestId)
      ).rejects.toThrow(/merchantDescriptor.*required/i);
    });

    test('handleSearchTransactions - enforces maximum limit', async () => {
      const argsWithLargeLimit = {
        limit: 1000 // Over maximum of 200
      };

      reportingService.searchTransactions = vi.fn().mockResolvedValue({
        transactions: [],
        totalCount: 0
      });

      await transactionHandlers.handleSearchTransactions(argsWithLargeLimit, mockRequestId);

      // Verify limit was capped at 200
      expect(reportingService.searchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 200
        }),
        mockRequestId
      );
    });
  });

  describe('Business Logic Tests', () => {
    test('handleGetTransaction - preserves service function behavior', async () => {
      const args = {
        transactionToken: 'txn_12345',
        includeMetadata: true
      };

      const mockTransaction = {
        token: 'txn_12345',
        amount: 2500,
        status: 'SETTLED',
        merchant: { descriptor: 'Test Merchant' }
      };

      supabaseService.getTransaction = vi.fn().mockResolvedValue(mockTransaction);

      const result = await transactionHandlers.handleGetTransaction(args, mockRequestId);

      // Verify service called correctly
      expect(supabaseService.getTransaction).toHaveBeenCalledWith(
        'txn_12345',
        { includeMetadata: true },
        mockRequestId
      );

      // Verify response structure
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.transaction).toEqual(mockTransaction);
      expect(parsedResponse.metadata.includeMetadata).toBe(true);
      expect(parsedResponse.metadata.requestId).toBe(mockRequestId);
    });

    test('handleSearchTransactions - formats search parameters correctly', async () => {
      const args = {
        cardToken: 'card_12345',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        merchantName: 'Amazon',
        limit: 25,
        sortBy: 'amount',
        sortOrder: 'asc'
      };

      const mockResults = {
        transactions: [{ token: 'txn_1' }, { token: 'txn_2' }],
        totalCount: 2
      };

      reportingService.searchTransactions = vi.fn().mockResolvedValue(mockResults);

      const result = await transactionHandlers.handleSearchTransactions(args, mockRequestId);

      // Verify service called with processed parameters
      expect(reportingService.searchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          cardToken: 'card_12345',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          merchantName: 'Amazon',
          limit: 25,
          sortBy: 'amount',
          sortOrder: 'asc'
        }),
        mockRequestId
      );

      // Verify response structure
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.searchResults.transactions).toEqual(mockResults.transactions);
      expect(parsedResponse.searchResults.totalCount).toBe(2);
    });

    test('handleGetRecentTransactions - applies default values correctly', async () => {
      const args = {
        cardToken: 'card_12345'
        // No limit or includeFraudAnalysis specified
      };

      const mockTransactions = {
        transactions: [{ token: 'txn_1' }, { token: 'txn_2' }]
      };

      supabaseService.getRecentTransactions = vi.fn().mockResolvedValue(mockTransactions);

      const result = await transactionHandlers.handleGetRecentTransactions(args, mockRequestId);

      // Verify defaults applied
      expect(supabaseService.getRecentTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          cardToken: 'card_12345',
          limit: 20, // Default limit
          includeFraudAnalysis: true // Default true
        }),
        mockRequestId
      );

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.recentTransactions.includeFraudAnalysis).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    test('handles service layer errors gracefully', async () => {
      const args = { transactionToken: 'txn_invalid' };
      const serviceError = new Error('Transaction not found');

      supabaseService.getTransaction = vi.fn().mockRejectedValue(serviceError);

      await expect(
        transactionHandlers.handleGetTransaction(args, mockRequestId)
      ).rejects.toThrow("Tool 'get_transaction' failed: Transaction not found");

      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          transactionToken: 'txn_inva***',
          error: 'Transaction not found'
        }),
        'MCP tool error: get_transaction'
      );
    });

    test('handles reporting service errors appropriately', async () => {
      const args = { merchantDescriptor: 'Unknown Merchant' };
      const reportingError = new Error('Merchant analysis failed');

      reportingService.getByMerchant = vi.fn().mockRejectedValue(reportingError);

      await expect(
        transactionHandlers.handleGetTransactionsByMerchant(args, mockRequestId)
      ).rejects.toThrow("Tool 'get_transactions_by_merchant' failed: Merchant analysis failed");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          merchantDescriptor: 'Unknown Merchant',
          error: 'Merchant analysis failed'
        }),
        'MCP tool error: get_transactions_by_merchant'
      );
    });

    test('handles search with no results gracefully', async () => {
      const args = {
        cardToken: 'card_no_transactions',
        startDate: '2024-01-01'
      };

      reportingService.searchTransactions = vi.fn().mockResolvedValue({
        transactions: [],
        totalCount: 0
      });

      const result = await transactionHandlers.handleSearchTransactions(args, mockRequestId);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.searchResults.transactions).toEqual([]);
      expect(parsedResponse.searchResults.totalCount).toBe(0);
    });
  });

  describe('MCP Protocol Compliance Tests', () => {
    test('all handlers return proper MCP response format', async () => {
      const mockServiceResponse = { token: 'txn_test', amount: 1000 };
      supabaseService.getTransaction = vi.fn().mockResolvedValue(mockServiceResponse);

      const result = await transactionHandlers.handleGetTransaction(
        { transactionToken: 'txn_test' }, 
        mockRequestId
      );

      // Verify MCP response structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    test('response content is properly JSON formatted', async () => {
      const mockSearchResults = {
        transactions: [{ token: 'txn_1' }],
        totalCount: 1
      };
      
      reportingService.searchTransactions = vi.fn().mockResolvedValue(mockSearchResults);

      const result = await transactionHandlers.handleSearchTransactions({}, mockRequestId);

      // Verify JSON can be parsed
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
      
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent.searchResults.transactions).toEqual([{ token: 'txn_1' }]);
      expect(parsedContent.metadata.requestId).toBe(mockRequestId);
    });

    test('handles complex search parameters in MCP format', async () => {
      const complexArgs = {
        cardToken: 'card_complex',
        amountRange: { min: 100, max: 1000 },
        status: ['SETTLED', 'PENDING'],
        merchantName: 'Test Merchant'
      };

      reportingService.searchTransactions = vi.fn().mockResolvedValue({
        transactions: [],
        totalCount: 0
      });

      const result = await transactionHandlers.handleSearchTransactions(complexArgs, mockRequestId);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.searchResults.searchParams.amountRange).toEqual({ min: 100, max: 1000 });
      expect(parsedResponse.searchResults.searchParams.status).toEqual(['SETTLED', 'PENDING']);
    });
  });

  describe('Performance Tests', () => {
    test('handlers complete within acceptable time limits', async () => {
      const args = { transactionToken: 'txn_performance_test' };
      
      // Mock service with simulated delay
      supabaseService.getTransaction = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { token: 'txn_performance_test', amount: 1000 };
      });

      const startTime = Date.now();
      await transactionHandlers.handleGetTransaction(args, mockRequestId);
      const endTime = Date.now();

      // Handler should complete within 200ms (including 50ms service time)
      expect(endTime - startTime).toBeLessThan(200);
    });

    test('search handles large result sets efficiently', async () => {
      const largeResultSet = {
        transactions: Array.from({ length: 200 }, (_, i) => ({
          token: `txn_${i}`,
          amount: 1000 + i
        })),
        totalCount: 200
      };

      reportingService.searchTransactions = vi.fn().mockResolvedValue(largeResultSet);

      const startTime = Date.now();
      const result = await transactionHandlers.handleSearchTransactions({ limit: 200 }, mockRequestId);
      const endTime = Date.now();

      // Should handle large datasets within reasonable time
      expect(endTime - startTime).toBeLessThan(500);
      
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.searchResults.totalCount).toBe(200);
    });
  });

  describe('Edge Cases Tests', () => {
    test('handles transaction not found scenarios', async () => {
      const args = { transactionToken: 'txn_not_found' };

      supabaseService.getTransaction = vi.fn().mockResolvedValue(null);

      const result = await transactionHandlers.handleGetTransaction(args, mockRequestId);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.transaction).toBeNull();
    });

    test('handles empty merchant transaction history', async () => {
      const args = { merchantDescriptor: 'New Merchant' };

      reportingService.getByMerchant = vi.fn().mockResolvedValue({
        transactions: [],
        analytics: { totalAmount: 0, transactionCount: 0 },
        totalCount: 0
      });

      const result = await transactionHandlers.handleGetTransactionsByMerchant(args, mockRequestId);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.merchantTransactions.transactions).toEqual([]);
      expect(parsedResponse.merchantTransactions.totalCount).toBe(0);
    });

    test('handles missing optional parameters gracefully', async () => {
      const minimalArgs = { transactionToken: 'txn_minimal' };

      reportingService.getDetailedAnalysis = vi.fn().mockResolvedValue({
        transaction: { token: 'txn_minimal' },
        analysis: { riskScore: 0.1 }
      });

      const result = await transactionHandlers.handleGetTransactionDetails(minimalArgs, mockRequestId);

      // Verify defaults applied
      expect(reportingService.getDetailedAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionToken: 'txn_minimal',
          analysisLevel: 'standard',
          includeRiskFactors: true,
          includeMerchantIntel: true
        }),
        mockRequestId
      );
    });

    test('handles service returning array instead of object', async () => {
      const args = { cardToken: 'card_array_response' };

      // Some services might return array directly instead of wrapped object
      supabaseService.getRecentTransactions = vi.fn().mockResolvedValue([
        { token: 'txn_1' },
        { token: 'txn_2' }
      ]);

      const result = await transactionHandlers.handleGetRecentTransactions(args, mockRequestId);

      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.recentTransactions.transactions).toEqual([
        { token: 'txn_1' },
        { token: 'txn_2' }
      ]);
      expect(parsedResponse.recentTransactions.count).toBe(2);
    });
  });
}); 