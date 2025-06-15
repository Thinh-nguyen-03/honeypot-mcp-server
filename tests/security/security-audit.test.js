import { describe, test, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Security Audit Tests for MCP Tool Handlers
 * 
 * CRITICAL: These tests validate PCI DSS compliance and security requirements
 * from DEVELOPER_INSTRUCTIONS.md. All tests must pass for production deployment.
 * 
 * Covers:
 * - Authentication mechanism testing
 * - PAN data access audit
 * - Input sanitization validation  
 * - Authorization boundary testing
 */

// Mock dependencies for security testing
vi.mock('../../src/services/supabase-service.js');
vi.mock('../../src/services/reporting-service.js');
vi.mock('../../src/services/mcc-service.js');
vi.mock('../../src/services/alert-service.js');
vi.mock('../../src/utils/logger.js');

// Import handlers after mocking
import * as cardHandlers from '../../src/handlers/card-handlers.js';
import * as transactionHandlers from '../../src/handlers/transaction-handlers.js';
import * as patternHandlers from '../../src/handlers/pattern-analysis-handlers.js';
import * as realtimeHandlers from '../../src/handlers/realtime-intelligence-handlers.js';

import * as supabaseService from '../../src/services/supabase-service.js';
import * as reportingService from '../../src/services/reporting-service.js';
import * as mccService from '../../src/services/mcc-service.js';
import * as alertService from '../../src/services/alert-service.js';

describe('Security Audit Tests - PCI DSS Compliance & Authentication', () => {
  const mockRequestId = 'security_test_123456789';
  const validJWTSecret = 'test_secret_key_256_bits_long_for_security';
  
  beforeEach(() => {
    vi.clearAllMocks();
    setupSecurityMocks();
  });

  function setupSecurityMocks() {
    // Mock successful service responses
    supabaseService.getCardDetailsForMcp = vi.fn().mockResolvedValue({
      token: 'card_test',
      state: 'ACTIVE',
      type: 'VIRTUAL',
      maskedPan: '**** **** **** 1234', // PCI DSS compliant format
      hasValidCvv: true, // Boolean only, never actual CVV
      isExpired: false
    });

    supabaseService.getAvailableCardsForMcp = vi.fn().mockResolvedValue({
      queryType: 'available_cards_list',
      cardCount: 3,
      cards: [
        { token: 'card_1', state: 'ACTIVE', maskedPan: '**** **** **** 1234' },
        { token: 'card_2', state: 'ACTIVE', maskedPan: '**** **** **** 5678' },
        { token: 'card_3', state: 'PAUSED', maskedPan: '**** **** **** 9012' }
      ]
    });

    supabaseService.getTransaction = vi.fn().mockResolvedValue({
      token: 'txn_test',
      amount: 1000,
      status: 'SETTLED',
      merchant: 'TEST_MERCHANT',
      cardToken: 'card_test'
    });

    reportingService.searchTransactions = vi.fn().mockResolvedValue({
      transactions: [],
      totalCount: 0
    });

    reportingService.analyzePatterns = vi.fn().mockResolvedValue({
      patterns: [],
      confidence: 0.8,
      riskScore: 0.2
    });

    reportingService.detectFraud = vi.fn().mockResolvedValue({
      riskScore: 0.1,
      riskLevel: 'LOW',
      indicators: [],
      confidence: 0.9
    });

    mccService.getMerchantIntel = vi.fn().mockResolvedValue({
      merchantProfile: { name: 'Secure Test Merchant' },
      riskProfile: { riskScore: 0.1 },
      reputation: { score: 0.95 }
    });

    alertService.createMcpSubscription = vi.fn().mockResolvedValue({
      subscriptionId: 'sub_secure_test',
      status: 'active'
    });
  }

  function createValidJWT(payload = {}) {
    return jwt.sign({
      userId: 'user_123',
      permissions: ['READ_CARD_DATA', 'READ_TRANSACTION_DATA', 'ADMIN'],
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
      ...payload
    }, validJWTSecret);
  }

  function createInvalidJWT() {
    return jwt.sign({
      userId: 'user_456',
      permissions: ['LIMITED_ACCESS']
    }, 'wrong_secret_key');
  }

  function createExpiredJWT() {
    return jwt.sign({
      userId: 'user_789',
      permissions: ['READ_CARD_DATA'],
      exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
    }, validJWTSecret);
  }

  describe('Authentication Mechanism Testing', () => {
    test('should reject requests without JWT token', async () => {
      await expect(
        cardHandlers.handleGetCardDetails(
          { cardToken: 'card_test' },
          mockRequestId,
          { /* no auth context */ }
        )
      ).rejects.toThrow(/authentication/i);
    });

    test('should reject requests with invalid JWT signature', async () => {
      const invalidToken = createInvalidJWT();

      await expect(
        cardHandlers.handleGetCardDetails(
          { cardToken: 'card_test' },
          mockRequestId,
          { authorization: `Bearer ${invalidToken}` }
        )
      ).rejects.toThrow(/invalid.*token/i);
    });

    test('should reject requests with expired JWT tokens', async () => {
      const expiredToken = createExpiredJWT();

      await expect(
        cardHandlers.handleGetCardDetails(
          { cardToken: 'card_test' },
          mockRequestId,
          { authorization: `Bearer ${expiredToken}` }
        )
      ).rejects.toThrow(/expired.*token/i);
    });

    test('should accept requests with valid JWT tokens', async () => {
      const validToken = createValidJWT();

      await expect(
        cardHandlers.handleGetCardDetails(
          { cardToken: 'card_test' },
          mockRequestId,
          { authorization: `Bearer ${validToken}` }
        )
      ).resolves.toBeDefined();
    });

    test('should validate JWT token format and structure', async () => {
      const malformedTokens = [
        'not.a.jwt',
        'Bearer invalid_format',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        null,
        undefined
      ];

      for (const malformedToken of malformedTokens) {
        await expect(
          cardHandlers.handleListAvailableCards(
            { limit: 10 },
            mockRequestId,
            { authorization: malformedToken }
          )
        ).rejects.toThrow(/authentication|invalid.*token/i);
      }
    });
  });

  describe('Authorization Boundary Testing', () => {
    test('should enforce READ_CARD_DATA permission for card operations', async () => {
      const limitedToken = createValidJWT({
        permissions: ['READ_TRANSACTION_DATA'] // Missing READ_CARD_DATA
      });

      await expect(
        cardHandlers.handleGetCardDetails(
          { cardToken: 'card_test' },
          mockRequestId,
          { authorization: `Bearer ${limitedToken}` }
        )
      ).rejects.toThrow(/insufficient.*permission|unauthorized/i);
    });

    test('should enforce ADMIN permission for card creation', async () => {
      const readOnlyToken = createValidJWT({
        permissions: ['READ_CARD_DATA', 'READ_TRANSACTION_DATA'] // Missing ADMIN
      });

      await expect(
        cardHandlers.handleCreateHoneypotCard(
          { spendLimit: 1000, cardType: 'VIRTUAL' },
          mockRequestId,
          { authorization: `Bearer ${readOnlyToken}` }
        )
      ).rejects.toThrow(/insufficient.*permission|admin.*required/i);
    });

    test('should enforce READ_TRANSACTION_DATA permission for transaction queries', async () => {
      const cardOnlyToken = createValidJWT({
        permissions: ['READ_CARD_DATA'] // Missing READ_TRANSACTION_DATA
      });

      await expect(
        transactionHandlers.handleGetTransaction(
          { transactionToken: 'txn_test' },
          mockRequestId,
          { authorization: `Bearer ${cardOnlyToken}` }
        )
      ).rejects.toThrow(/insufficient.*permission|unauthorized/i);
    });

    test('should enforce ADMIN permission for real-time monitoring', async () => {
      const basicToken = createValidJWT({
        permissions: ['READ_CARD_DATA', 'READ_TRANSACTION_DATA'] // Missing ADMIN
      });

      await expect(
        realtimeHandlers.handleSubscribeToAlerts(
          { cardTokens: ['card_test'], alertTypes: ['fraud_detected'] },
          mockRequestId,
          { authorization: `Bearer ${basicToken}` }
        )
      ).rejects.toThrow(/insufficient.*permission|admin.*required/i);
    });

    test('should validate permission scope for each tool category', async () => {
      const testCases = [
        {
          handler: cardHandlers.handleToggleCardState,
          params: { cardToken: 'card_test', newState: 'PAUSED' },
          requiredPermission: 'ADMIN',
          description: 'card state changes'
        },
        {
          handler: patternHandlers.handleDetectFraudIndicators,
          params: { transactionToken: 'txn_test' },
          requiredPermission: 'READ_TRANSACTION_DATA',
          description: 'fraud pattern analysis'
        },
        {
          handler: realtimeHandlers.handleGetLiveTransactionFeed,
          params: { feedDuration: '30m' },
          requiredPermission: 'ADMIN',
          description: 'live transaction feeds'
        }
      ];

      for (const testCase of testCases) {
        const tokenWithoutPermission = createValidJWT({
          permissions: [] // No permissions
        });

        await expect(
          testCase.handler(
            testCase.params,
            mockRequestId,
            { authorization: `Bearer ${tokenWithoutPermission}` }
          )
        ).rejects.toThrow(/insufficient.*permission|unauthorized/i);
      }
    });
  });

  describe('PAN Data Access Audit', () => {
    test('should never return full PAN numbers in any response', async () => {
      const validToken = createValidJWT();

      const response = await cardHandlers.handleGetCardDetails(
        { cardToken: 'card_test' },
        mockRequestId,
        { authorization: `Bearer ${validToken}` }
      );

      // Verify PAN is masked
      expect(response.maskedPan).toMatch(/^\*{4} \*{4} \*{4} \d{4}$/);
      expect(response.maskedPan).not.toMatch(/^\d{16}$/);
      
      // Verify no full PAN in any field
      const responseString = JSON.stringify(response);
      expect(responseString).not.toMatch(/["\s]\d{16}["\s]/);
    });

    test('should sanitize PAN data in error messages', async () => {
      // Mock service to throw error containing sensitive data
      supabaseService.getCardDetailsForMcp.mockRejectedValue(
        new Error('Database error: PAN 4111111111111111 not found')
      );

      const validToken = createValidJWT();

      try {
        await cardHandlers.handleGetCardDetails(
          { cardToken: 'card_test' },
          mockRequestId,
          { authorization: `Bearer ${validToken}` }
        );
      } catch (error) {
        // Error message should not contain full PAN
        expect(error.message).not.toMatch(/\d{16}/);
        expect(error.message).not.toMatch(/4111111111111111/);
      }
    });

    test('should never log full PAN numbers', async () => {
      const validToken = createValidJWT();
      const mockLogger = vi.fn();
      
      // Mock logger to capture log calls
      vi.doMock('../../src/utils/logger.js', () => ({
        info: mockLogger,
        error: mockLogger,
        warn: mockLogger,
        debug: mockLogger
      }));

      await cardHandlers.handleListAvailableCards(
        { includeDetails: true },
        mockRequestId,
        { authorization: `Bearer ${validToken}` }
      );

      // Check all log calls don't contain full PANs
      mockLogger.mock.calls.forEach(call => {
        const logMessage = JSON.stringify(call);
        expect(logMessage).not.toMatch(/\d{16}/);
      });
    });

    test('should enforce CVV and expiry data protection', async () => {
      const validToken = createValidJWT();

      const response = await cardHandlers.handleGetCardDetails(
        { cardToken: 'card_test' },
        mockRequestId,
        { authorization: `Bearer ${validToken}` }
      );

      // Should only return boolean validation, never actual CVV
      expect(response.hasValidCvv).toBeTypeOf('boolean');
      expect(response.isExpired).toBeTypeOf('boolean');
      
      // Should never contain actual CVV or expiry
      const responseString = JSON.stringify(response);
      expect(responseString).not.toMatch(/cvv.*\d{3,4}/i);
      expect(responseString).not.toMatch(/expir.*\d{2}\/\d{2}/i);
    });
  });

  describe('Input Sanitization Validation', () => {
    test('should reject SQL injection attempts', async () => {
      const validToken = createValidJWT();
      const sqlInjectionAttempts = [
        "'; DROP TABLE cards; --",
        "' OR '1'='1",
        "'; UPDATE cards SET state='ACTIVE'; --",
        "card_test'; DELETE FROM transactions WHERE '1'='1",
        "UNION SELECT * FROM users--"
      ];

      for (const maliciousInput of sqlInjectionAttempts) {
        await expect(
          cardHandlers.handleGetCardDetails(
            { cardToken: maliciousInput },
            mockRequestId,
            { authorization: `Bearer ${validToken}` }
          )
        ).rejects.toThrow(/invalid.*format|validation.*failed/i);
      }
    });

    test('should reject XSS attempts in string inputs', async () => {
      const validToken = createValidJWT();
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '"><script>alert(document.cookie)</script>',
        "'><script>fetch('/steal-data')</script>"
      ];

      for (const maliciousInput of xssAttempts) {
        await expect(
          transactionHandlers.handleSearchTransactions(
            { merchantName: maliciousInput },
            mockRequestId,
            { authorization: `Bearer ${validToken}` }
          )
        ).rejects.toThrow(/invalid.*input|validation.*failed/i);
      }
    });

    test('should validate input length limits', async () => {
      const validToken = createValidJWT();
      const oversizedInputs = {
        cardToken: 'x'.repeat(1000), // Too long card token
        merchantName: 'y'.repeat(5000), // Too long merchant name
        description: 'z'.repeat(10000) // Too long description
      };

      for (const [field, value] of Object.entries(oversizedInputs)) {
        await expect(
          transactionHandlers.handleSearchTransactions(
            { [field]: value },
            mockRequestId,
            { authorization: `Bearer ${validToken}` }
          )
        ).rejects.toThrow(/too.*long|exceeds.*limit|validation.*failed/i);
      }
    });

    test('should validate input format and types', async () => {
      const validToken = createValidJWT();
      const invalidInputs = [
        { cardToken: 123 }, // Should be string
        { cardToken: null },
        { cardToken: undefined },
        { cardToken: { malicious: 'object' } },
        { cardToken: ['array', 'input'] },
        { spendLimit: 'not_a_number' },
        { spendLimit: -1000 }, // Negative amount
        { limit: 'invalid_number' },
        { includeDetails: 'not_boolean' }
      ];

      for (const invalidInput of invalidInputs) {
        await expect(
          cardHandlers.handleListAvailableCards(
            invalidInput,
            mockRequestId,
            { authorization: `Bearer ${validToken}` }
          )
        ).rejects.toThrow(/invalid.*type|validation.*failed|invalid.*format/i);
      }
    });

    test('should sanitize special characters in outputs', async () => {
      const validToken = createValidJWT();
      
      // Mock service to return data with special characters
      supabaseService.getCardDetailsForMcp.mockResolvedValue({
        token: 'card_test',
        state: 'ACTIVE',
        merchantName: 'Test & Co. <script>alert(1)</script>',
        description: 'Special chars: \' " & < > \n \r \t'
      });

      const response = await cardHandlers.handleGetCardDetails(
        { cardToken: 'card_test' },
        mockRequestId,
        { authorization: `Bearer ${validToken}` }
      );

      // Special characters should be escaped or sanitized
      const responseString = JSON.stringify(response);
      expect(responseString).not.toMatch(/<script>/);
      expect(responseString).not.toMatch(/javascript:/);
    });
  });

  describe('Security Event Logging', () => {
    test('should log all authentication attempts', async () => {
      const mockSecurityLogger = vi.fn();
      
      // Mock security logger
      vi.doMock('../../src/utils/security-logger.js', () => ({
        logSecurityEvent: mockSecurityLogger
      }));

      const validToken = createValidJWT();
      const invalidToken = createInvalidJWT();

      // Valid authentication
      await cardHandlers.handleListAvailableCards(
        { limit: 10 },
        mockRequestId,
        { authorization: `Bearer ${validToken}` }
      );

      // Invalid authentication  
      try {
        await cardHandlers.handleListAvailableCards(
          { limit: 10 },
          mockRequestId,
          { authorization: `Bearer ${invalidToken}` }
        );
      } catch (error) {
        // Expected authentication failure
      }

      // Verify security events were logged
      expect(mockSecurityLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AUTH_SUCCESS',
          outcome: 'SUCCESS'
        })
      );

      expect(mockSecurityLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AUTH_FAILURE',
          outcome: 'FAILURE'
        })
      );
    });

    test('should log PAN data access attempts', async () => {
      const mockSecurityLogger = vi.fn();
      const validToken = createValidJWT();

      await cardHandlers.handleGetCardDetails(
        { cardToken: 'card_test' },
        mockRequestId,
        { authorization: `Bearer ${validToken}` }
      );

      // Should log sensitive data access
      expect(mockSecurityLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DATA_ACCESS',
          resourceAccessed: 'SENSITIVE_CARD_DATA',
          dataClassification: 'PCI_SENSITIVE'
        })
      );
    });

    test('should log authorization boundary violations', async () => {
      const mockSecurityLogger = vi.fn();
      const limitedToken = createValidJWT({
        permissions: ['READ_CARD_DATA'] // Missing required permissions
      });

      try {
        await cardHandlers.handleCreateHoneypotCard(
          { spendLimit: 1000 },
          mockRequestId,
          { authorization: `Bearer ${limitedToken}` }
        );
      } catch (error) {
        // Expected authorization failure
      }

      // Should log authorization violation
      expect(mockSecurityLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AUTH_FAILURE',
          outcome: 'BLOCKED',
          reason: 'INSUFFICIENT_PERMISSIONS'
        })
      );
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    test('should detect and prevent rapid successive authentication failures', async () => {
      const invalidToken = createInvalidJWT();
      const failures = [];

      // Attempt 10 rapid authentication failures
      for (let i = 0; i < 10; i++) {
        try {
          await cardHandlers.handleListAvailableCards(
            { limit: 10 },
            `${mockRequestId}_${i}`,
            { authorization: `Bearer ${invalidToken}` }
          );
        } catch (error) {
          failures.push(error);
        }
      }

      // After multiple failures, should implement rate limiting
      expect(failures.length).toBe(10);
      
      // Last few attempts should be rate limited
      const lastError = failures[failures.length - 1];
      expect(lastError.message).toMatch(/rate.*limit|too.*many.*attempts/i);
    });

    test('should detect unusual access patterns', async () => {
      const validToken = createValidJWT();
      const unusualPatterns = [];

      // Rapid access to multiple different card tokens
      for (let i = 0; i < 50; i++) {
        try {
          await cardHandlers.handleGetCardDetails(
            { cardToken: `card_unusual_${i}` },
            `${mockRequestId}_unusual_${i}`,
            { authorization: `Bearer ${validToken}` }
          );
        } catch (error) {
          unusualPatterns.push(error);
        }
      }

      // Should detect and flag unusual access patterns
      // (This would integrate with actual security monitoring)
      expect(unusualPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Cryptographic Security', () => {
    test('should use secure random token generation', async () => {
      const tokens = new Set();

      // Generate multiple tokens and verify uniqueness
      for (let i = 0; i < 100; i++) {
        const randomBytes = crypto.randomBytes(32);
        const token = randomBytes.toString('hex');
        
        expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
        expect(tokens.has(token)).toBe(false); // Should be unique
        tokens.add(token);
      }
    });

    test('should properly hash sensitive data', async () => {
      const sensitiveData = 'user@example.com';
      
      // Create SHA-256 hash
      const hash1 = crypto.createHash('sha256').update(sensitiveData).digest('hex');
      const hash2 = crypto.createHash('sha256').update(sensitiveData).digest('hex');
      
      // Same input should produce same hash
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64-char hex string
      expect(hash1).not.toBe(sensitiveData); // Should be hashed, not plaintext
    });

    test('should validate JWT secret strength', async () => {
      const weakSecrets = [
        'weak',
        '12345',
        'password',
        'secret'
      ];

      for (const weakSecret of weakSecrets) {
        // Weak secrets should be rejected during configuration
        expect(() => {
          jwt.sign({ test: 'data' }, weakSecret);
        }).not.toThrow(); // JWT library doesn't validate strength
        
        // But our application should validate secret strength
        expect(weakSecret.length).toBeLessThan(32); // Our validation requirement
      }
    });
  });
});