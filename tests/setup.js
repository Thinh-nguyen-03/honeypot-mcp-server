/**
 * Vitest Global Test Setup
 * 
 * Sets up testing environment for Honeypot MCP Server
 * Follows DEVELOPER_INSTRUCTIONS.md security and testing requirements
 */

import { vi, beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test configuration
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent'; // Suppress logs during testing
  
  // Mock sensitive environment variables for testing
  process.env.LITHIC_API_KEY = 'test_lithic_key_12345';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test_anon_key_12345';
  
  // Security: Ensure no real API calls during testing
  process.env.TESTING = 'true';
});

afterAll(() => {
  // Cleanup after all tests
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Mock console to prevent log pollution during tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

// Global test utilities
global.testUtils = {
  /**
   * Generate mock request ID for testing
   */
  generateMockRequestId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  /**
   * Create mock MCP response
   */
  createMockMcpResponse: (data) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2)
      }
    ]
  }),
  
  /**
   * Sanitize sensitive data for test assertions
   * Mirrors the production sanitization logic
   */
  sanitizeForTest: (data) => {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    
    // Sanitize common sensitive fields
    if (sanitized.pan) {
      sanitized.pan = '****-****-****-' + (sanitized.pan.slice(-4) || '****');
    }
    if (sanitized.cvv) {
      sanitized.cvv = '***';
    }
    if (sanitized.cardToken && typeof sanitized.cardToken === 'string' && sanitized.cardToken.length > 8) {
      sanitized.cardToken = sanitized.cardToken.substring(0, 8) + '***';
    }
    
    return sanitized;
  },
  
  /**
   * Validate MCP response format
   */
  validateMcpResponse: (response) => {
    expect(response).toHaveProperty('content');
    expect(Array.isArray(response.content)).toBe(true);
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.content[0]).toHaveProperty('type');
    expect(response.content[0]).toHaveProperty('text');
  },
  
  /**
   * Performance test helper
   */
  timeAsyncOperation: async (operation) => {
    const startTime = Date.now();
    const result = await operation();
    const endTime = Date.now();
    return {
      result,
      duration: endTime - startTime
    };
  },
  
  /**
   * Security test helper - validates no sensitive data in logs
   */
  validateNoSensitiveDataInLogs: (loggerMock, sensitivePatterns = []) => {
    const defaultSensitivePatterns = [
      /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/, // Credit card numbers
      /\b\d{3}\b/, // CVV
      /sk_live_\w+/, // Live API keys
      /pk_live_\w+/ // Live public keys
    ];
    
    const allPatterns = [...defaultSensitivePatterns, ...sensitivePatterns];
    
    loggerMock.mock.calls.forEach(call => {
      const logMessage = JSON.stringify(call);
      allPatterns.forEach(pattern => {
        expect(logMessage).not.toMatch(pattern);
      });
    });
  }
};

// Mock implementations for external dependencies
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

// Performance monitoring for tests
const performanceObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach((entry) => {
    if (entry.duration > 200) { // DEVELOPER_INSTRUCTIONS.md requirement: <200ms
      console.warn(`Performance warning: ${entry.name} took ${entry.duration}ms`);
    }
  });
});

if (typeof PerformanceObserver !== 'undefined') {
  performanceObserver.observe({ entryTypes: ['measure'] });
} 