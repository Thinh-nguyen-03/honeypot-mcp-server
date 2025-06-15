/**
 * Logging and Error Handling Test Suite - Phase 1.3.3
 * 
 * Tests logging and error handling systems to ensure they work
 * properly in the MCP server context before implementing MCP tools.
 */

import logger from '../../../src/utils/logger.js';
import { config } from '../../../src/config/index.js';

describe('Logging and Error Handling - P1.3.3', () => {
  describe('Logger Initialization', () => {
    test('should initialize logger correctly', () => {
      expect(logger).toBeDefined();
      
      const requiredMethods = ['debug', 'info', 'warn', 'error', 'fatal'];
      requiredMethods.forEach(method => {
        expect(typeof logger[method]).toBe('function');
      });
    });
  });

  describe('Structured Logging', () => {
    test('should support structured logging at all levels', () => {
      const testData = {
        requestId: 'test_req_123',
        userId: 'test_user_456',
        action: 'test_action',
        metadata: { source: 'logging_test' }
      };
      
      // These should not throw errors
      expect(() => {
        logger.debug(testData, 'Debug level test');
        logger.info(testData, 'Info level test');
        logger.warn(testData, 'Warn level test');
      }).not.toThrow();
    });
  });

  describe('Error Logging', () => {
    test('should log errors with context', () => {
      expect(() => {
        try {
          throw new Error('Test error for validation');
        } catch (testError) {
          const errorContext = {
            requestId: 'error_test_001',
            toolName: 'test_tool',
            error: testError.message,
            stack: testError.stack
          };
          
          logger.error(errorContext, 'Test error logged with context');
        }
      }).not.toThrow();
    });

    test('should log sanitized sensitive data', () => {
      expect(() => {
        const sanitizedData = {
          requestId: 'sanitization_test',
          cardToken: 'card_12345***',
          pan: '****-****-****-1234'
        };
        
        logger.error(sanitizedData, 'Error with sanitized data');
      }).not.toThrow();
    });
  });

  describe('MCP Context Logging', () => {
    test('should log MCP context information', () => {
      expect(() => {
        const mcpContext = {
          requestId: 'mcp_test_001',
          mcpMethod: 'tools/call',
          toolName: 'list_available_cards',
          transport: 'stdio',
          timestamp: new Date().toISOString()
        };
        
        logger.info(mcpContext, 'MCP request received');
        logger.info({ ...mcpContext, success: true }, 'MCP request completed');
      }).not.toThrow();
    });
  });
}); 