/**
 * Database Connection Test Suite - Phase 1.3.1
 * 
 * Tests Supabase database connections to ensure all components work
 * in the MCP server context before implementing actual MCP tools.
 */

import { supabase_client } from '../../../src/config/supabase-client.js';
import { config } from '../../../src/config/index.js';
import logger from '../../../src/utils/logger.js';

describe('Database Connection - P1.3.1', () => {
  beforeAll(() => {
    // Suppress logs during testing
    logger.level = 'error';
  });

  describe('Environment Variables', () => {
    test('should have all required environment variables', () => {
      const requiredVars = {
        'SUPABASE_URL': config.supabase.url,
        'SUPABASE_SERVICE_KEY': config.supabase.serviceKey,
        'NODE_ENV': config.server.nodeEnv
      };
      
      const missing = [];
      for (const [varName, value] of Object.entries(requiredVars)) {
        if (!value) {
          missing.push(varName);
        }
      }
      
      expect(missing).toHaveLength(0);
    });
  });

  describe('Supabase Client Initialization', () => {
    test('should initialize Supabase client with required methods', () => {
      expect(supabase_client).toBeDefined();
      expect(typeof supabase_client.from).toBe('function');
      
      const queryBuilder = supabase_client.from('transactions');
      const queryMethods = ['select', 'insert', 'update', 'delete'];
      
      queryMethods.forEach(method => {
        expect(typeof queryBuilder[method]).toBe('function');
      });
    });
  });

  describe('Database Connection', () => {
    test('should connect to database successfully', async () => {
      const { data, error } = await supabase_client
        .from('transactions')
        .select('count', { count: 'exact', head: true });
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    }, 30000);
  });

  describe('Basic Queries', () => {
    test('should execute basic count queries', async () => {
      const { data: transactionCount, error: countError } = await supabase_client
        .from('transactions')
        .select('count', { count: 'exact', head: true });
      
      expect(countError).toBeNull();
      expect(transactionCount).toBeDefined();
      
      const { data: merchantCount, error: merchantError } = await supabase_client
        .from('merchants')
        .select('count', { count: 'exact', head: true });
      
      expect(merchantError).toBeNull();
      expect(merchantCount).toBeDefined();
    }, 30000);

    test('should retrieve recent transactions', async () => {
      const { data: recentTransactions, error: recentError } = await supabase_client
        .from('transactions')
        .select('token, card_token, created_at, result')
        .order('created_at', { ascending: false })
        .limit(3);
      
      expect(recentError).toBeNull();
      expect(Array.isArray(recentTransactions)).toBe(true);
    }, 30000);
  });

  describe('Connection Pooling', () => {
    test('should handle concurrent queries', async () => {
      const promises = Array(5).fill().map(() =>
        supabase_client
          .from('transactions')
          .select('count', { count: 'exact', head: true })
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(({ error }) => {
        expect(error).toBeNull();
      });
    }, 30000);
  });
}); 