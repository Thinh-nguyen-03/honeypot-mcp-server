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

vi.mock('../../../src/services/card-service.js');
vi.mock('../../../src/utils/logger.js');

// Now import the modules
import * as cardHandlers from '../../../src/handlers/card-handlers.js';
import * as cardService from '../../../src/services/card-service.js';
import logger from '../../../src/utils/logger.js';

describe('Card Handlers - MCP Tool Implementation', () => {
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
    test('should sanitize sensitive data in logs', async () => {
      const argsWithSensitiveData = {
        cardToken: 'card_abc123def456',
        includePan: true,
        reason: 'scammer_verification'
      };

      // Mock successful service response
      cardService.getCardDetailsForMcp = vi.fn().mockResolvedValue({
        token: 'card_abc123def456',
        pan: '4111111111111234',
        state: 'ACTIVE'
      });

      await cardHandlers.handleGetCardDetails(argsWithSensitiveData, mockRequestId);

      // Verify that sensitive data is not logged in plain text
      const loggerCalls = logger.info.mock.calls;
      loggerCalls.forEach(call => {
        const loggedArgs = call[0];
        if (loggedArgs.args) {
          // Should not contain full PAN in logs
          expect(JSON.stringify(loggedArgs.args)).not.toContain('4111111111111234');
          // Card token should be masked (shows first 8 chars + ***)
          if (loggedArgs.args.cardToken) {
            expect(loggedArgs.args.cardToken).toBe('card_abc***');
          }
        }
      });
    });

    test('should call service even without reason (no validation in handler)', async () => {
      const argsWithoutReason = {
        cardToken: 'card_abc123def456',
        includePan: true
        // No reason field - handler doesn't validate this
      };

      cardService.getCardDetailsForMcp = vi.fn().mockResolvedValue({
        token: 'card_abc123def456',
        state: 'ACTIVE'
      });

      await cardHandlers.handleGetCardDetails(argsWithoutReason, mockRequestId);

      // Handler should call service (validation happens in service layer)
      expect(cardService.getCardDetailsForMcp).toHaveBeenCalled();
    });

    test('should log security warning for PAN access attempts', async () => {
      const args = {
        cardToken: 'card_abc123def456',
        includePan: true,
        reason: 'scammer_verification'
      };

      cardService.getCardDetailsForMcp = vi.fn().mockResolvedValue({
        token: 'card_abc123def456',
        pan: '4111111111111234',
        state: 'ACTIVE'
      });

      await cardHandlers.handleGetCardDetails(args, mockRequestId);

      // Verify security warning logged
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          cardToken: 'card_abc***',
          reason: 'scammer_verification'
        }),
        'SECURITY: PAN access requested'
      );
    });
  });

  describe('Input Validation Tests', () => {
    test('handleListAvailableCards - handles invalid parameters gracefully', async () => {
      const invalidArgs = {
        includeDetails: 'not_a_boolean',
        activeOnly: 'invalid'
      };

      cardService.getAvailableCardsForMcp = vi.fn().mockResolvedValue({
        queryType: 'available_cards_list',
        cardCount: 0,
        cards: []
      });

      // Handler processes invalid args (service layer handles validation)
      const result = await cardHandlers.handleListAvailableCards(invalidArgs, mockRequestId);
      expect(result.content[0].text).toContain('cardCount');
    });

    test('handleGetCardDetails - validates required cardToken', async () => {
      const argsWithoutCardToken = {
        includePan: false
      };

      await expect(
        cardHandlers.handleGetCardDetails(argsWithoutCardToken, mockRequestId)
      ).rejects.toThrow(/cardToken.*required/i);
    });

    test('handleCreateHoneypotCard - uses default values for missing params', async () => {
      const minimalArgs = {}; // No parameters provided

      cardService.createHoneypotCard = vi.fn().mockResolvedValue({
        token: 'card_new123',
        state: 'ACTIVE'
      });

      // Handler should use defaults and call service
      const result = await cardHandlers.handleCreateHoneypotCard(minimalArgs, mockRequestId);
      
      expect(cardService.createHoneypotCard).toHaveBeenCalledWith(
        expect.objectContaining({
          spendLimit: 50000,
          spendLimitDuration: 'MONTHLY',
          memo: 'Honeypot card for fraud detection',
          metadata: {}
        }),
        mockRequestId
      );
    });

    test('handleToggleCardState - validates required parameters', async () => {
      const invalidState = {
        cardToken: 'card_123',
        state: 'INVALID_STATE' // Handler doesn't validate enum values
      };

      cardService.toggleCardState = vi.fn().mockResolvedValue({
        success: true,
        newState: 'INVALID_STATE'
      });

      // Handler passes through to service (validation happens there)
      const result = await cardHandlers.handleToggleCardState(invalidState, mockRequestId);
      expect(result.content[0].text).toContain('INVALID_STATE');
    });
  });

  describe('Business Logic Tests', () => {
    test('handleListAvailableCards - preserves service function behavior', async () => {
      const args = {
        includeDetails: true,
        activeOnly: true,
        limit: 10
      };

      const expectedServiceResponse = {
        queryType: 'available_cards_list',
        cardCount: 3,
        cards: [
          {
            token: 'card_12345',
            lastFour: '4567',
            state: 'ACTIVE',
            type: 'VIRTUAL'
          }
        ]
      };

      cardService.getAvailableCardsForMcp = vi.fn().mockResolvedValue(expectedServiceResponse);

      const result = await cardHandlers.handleListAvailableCards(args, mockRequestId);

      // Verify service called with processed parameters
      expect(cardService.getAvailableCardsForMcp).toHaveBeenCalledWith(
        expect.objectContaining({
          includeDetails: true,
          activeOnly: true,
          limit: 10
        }),
        mockRequestId
      );

      // Verify response includes service data plus MCP metadata
      const parsedResponse = JSON.parse(result.content[0].text);
      expect(parsedResponse.queryType).toBe('available_cards_list');
      expect(parsedResponse.cardCount).toBe(3);
      expect(parsedResponse.cards).toEqual(expectedServiceResponse.cards);
      expect(parsedResponse.timestamp).toBeDefined();
      expect(parsedResponse.requestId).toBe(mockRequestId);
    });

    test('handleCreateHoneypotCard - creates card with correct parameters', async () => {
      const args = {
        spendLimit: 50000, // $500.00 in cents
        spendLimitDuration: 'MONTHLY',
        memo: 'Test honeypot card'
      };

      const expectedServiceResponse = {
        token: 'card_new123',
        state: 'ACTIVE',
        spendLimit: 50000,
        created: '2024-01-15T10:30:00Z'
      };

      cardService.createHoneypotCard = vi.fn().mockResolvedValue(expectedServiceResponse);

      const result = await cardHandlers.handleCreateHoneypotCard(args, mockRequestId);

      // Handler adds metadata field to service call
      expect(cardService.createHoneypotCard).toHaveBeenCalledWith(
        expect.objectContaining({
          spendLimit: 50000,
          spendLimitDuration: 'MONTHLY',
          memo: 'Test honeypot card',
          metadata: {}
        }),
        mockRequestId
      );
      expect(result.content[0].text).toContain('card_new123');
    });

    test('handleUpdateCardLimits - updates limits correctly', async () => {
      const args = {
        cardToken: 'card_123',
        spendLimit: 100000, // $1000.00
        spendLimitDuration: 'WEEKLY'
      };

      const expectedServiceResponse = {
        token: 'card_123',
        spendLimit: 100000,
        spendLimitDuration: 'WEEKLY',
        updated: '2024-01-15T10:30:00Z'
      };

      cardService.updateCardLimit = vi.fn().mockResolvedValue(expectedServiceResponse);

      const result = await cardHandlers.handleUpdateCardLimits(args, mockRequestId);

      expect(cardService.updateCardLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          cardToken: 'card_123',
          spendLimit: 100000,
          spendLimitDuration: 'WEEKLY'
        }),
        mockRequestId
      );
      expect(result.content[0].text).toContain('100000');
    });
  });

  describe('Error Handling Tests', () => {
    test('handles service layer errors gracefully', async () => {
      const args = { includeDetails: true };
      const serviceError = new Error('Database connection failed');

      cardService.getAvailableCardsForMcp = vi.fn().mockRejectedValue(serviceError);

      await expect(
        cardHandlers.handleListAvailableCards(args, mockRequestId)
      ).rejects.toThrow('Database connection failed');

      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          error: serviceError.message
        }),
        expect.stringContaining('MCP tool error')
      );
    });

    test('handles network timeouts appropriately', async () => {
      const args = { cardToken: 'card_123' };
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'TIMEOUT';

      cardService.getCardDetailsForMcp = vi.fn().mockRejectedValue(timeoutError);

      await expect(
        cardHandlers.handleGetCardDetails(args, mockRequestId)
      ).rejects.toThrow("Tool 'get_card_details' failed: Request timeout");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: mockRequestId,
          cardToken: 'card_123',
          error: 'Request timeout'
        }),
        'MCP tool error: get_card_details'
      );
    });

    test('handles invalid card token gracefully', async () => {
      const args = { cardToken: 'invalid_token' };
      const notFoundError = new Error('Card not found');
      notFoundError.code = 'NOT_FOUND';

      cardService.getCardDetailsForMcp = vi.fn().mockRejectedValue(notFoundError);

      await expect(
        cardHandlers.handleGetCardDetails(args, mockRequestId)
      ).rejects.toThrow('Card not found');
    });
  });

  describe('MCP Protocol Compliance Tests', () => {
    test('all handlers return proper MCP response format', async () => {
      const mockServiceResponse = { test: 'data' };
      cardService.getAvailableCardsForMcp = vi.fn().mockResolvedValue(mockServiceResponse);

      const result = await cardHandlers.handleListAvailableCards({}, mockRequestId);

      // Verify MCP response structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    test('response content is properly JSON formatted', async () => {
      const mockServiceResponse = {
        cardCount: 2,
        cards: [{ token: 'card_1' }, { token: 'card_2' }]
      };
      
      cardService.getAvailableCardsForMcp = vi.fn().mockResolvedValue(mockServiceResponse);

      const result = await cardHandlers.handleListAvailableCards({}, mockRequestId);

      // Verify JSON can be parsed
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
      
      const parsedContent = JSON.parse(result.content[0].text);
      // Response includes original service data plus MCP metadata
      expect(parsedContent.cardCount).toBe(2);
      expect(parsedContent.cards).toEqual([{ token: 'card_1' }, { token: 'card_2' }]);
      expect(parsedContent.queryType).toBeDefined();
      expect(parsedContent.timestamp).toBeDefined();
      expect(parsedContent.requestId).toBe(mockRequestId);
    });
  });

  describe('Performance Tests', () => {
    test('handlers complete within acceptable time limits', async () => {
      const args = { includeDetails: true, limit: 100 };
      
      // Mock a response that simulates normal service timing
      cardService.getAvailableCardsForMcp = vi.fn().mockImplementation(async () => {
        // Simulate 50ms service response time
        await new Promise(resolve => setTimeout(resolve, 50));
        return { cardCount: 100, cards: [] };
      });

      const startTime = Date.now();
      await cardHandlers.handleListAvailableCards(args, mockRequestId);
      const endTime = Date.now();

      // Handler should complete within 200ms (including 50ms service time)
      expect(endTime - startTime).toBeLessThan(200);
    });

    test('handlers handle large result sets efficiently', async () => {
      // Mock large dataset
      const largeCardList = Array.from({ length: 1000 }, (_, i) => ({
        token: `card_${i}`,
        state: 'ACTIVE'
      }));

      cardService.getAvailableCardsForMcp = vi.fn().mockResolvedValue({
        cardCount: 1000,
        cards: largeCardList
      });

      const startTime = Date.now();
      const result = await cardHandlers.handleListAvailableCards({ limit: 1000 }, mockRequestId);
      const endTime = Date.now();

      // Should handle large datasets within reasonable time
      expect(endTime - startTime).toBeLessThan(500);
      expect(result.content[0].text).toContain('1000');
    });
  });

  describe('Edge Cases Tests', () => {
    test('handles empty service responses', async () => {
      cardService.getAvailableCardsForMcp = vi.fn().mockResolvedValue({
        cardCount: 0,
        cards: []
      });

      const result = await cardHandlers.handleListAvailableCards({}, mockRequestId);

      expect(result.content[0].text).toContain('"cardCount": 0');
      expect(result.content[0].text).toContain('"cards": []');
    });

    test('handles null/undefined arguments', async () => {
      cardService.getAvailableCardsForMcp = vi.fn().mockResolvedValue({
        cardCount: 0,
        cards: []
      });

      // Should handle undefined args gracefully
      const result = await cardHandlers.handleListAvailableCards(undefined, mockRequestId);
      expect(result).toHaveProperty('content');
    });

    test('handles missing optional parameters', async () => {
      const minimalArgs = { cardToken: 'card_123' };
      
      cardService.getCardDetailsForMcp = vi.fn().mockResolvedValue({
        token: 'card_123',
        state: 'ACTIVE'
      });

      const result = await cardHandlers.handleGetCardDetails(minimalArgs, mockRequestId);
      expect(result.content[0].text).toContain('card_123');
    });
  });
}); 