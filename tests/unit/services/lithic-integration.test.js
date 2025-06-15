/**
 * Lithic API Integration Test Suite - Phase 1.3.2
 * 
 * Tests Lithic API integration to ensure all components work
 * in the MCP server context before implementing actual MCP tools.
 * 
 * SAFETY: Uses only read-only operations to avoid charges
 */

import { lithic_client } from '../../../src/config/lithic-client.js';
import { config } from '../../../src/config/index.js';
import logger from '../../../src/utils/logger.js';

describe('Lithic API Integration - P1.3.2', () => {
  beforeAll(() => {
    // Suppress logs during testing
    logger.level = 'error';
  });

  describe('Lithic Configuration', () => {
    test('should have valid Lithic configuration', () => {
      expect(config.lithic.apiKey).toBeDefined();
      expect(config.lithic.environment).toBeDefined();
      
      const validEnvironments = ['sandbox', 'production'];
      expect(validEnvironments).toContain(config.lithic.environment);
    });
  });

  describe('Lithic Client Initialization', () => {
    test('should initialize Lithic client correctly', () => {
      expect(lithic_client).toBeDefined();
      
      const requiredResources = ['cards', 'transactions'];
      requiredResources.forEach(resource => {
        expect(lithic_client[resource]).toBeDefined();
      });
    });
  });

  describe('API Connection', () => {
    test('should connect to Lithic API successfully', async () => {
      try {
        const cardsResponse = await lithic_client.cards.list({ page_size: 1 });
        
        const cards = [];
        let count = 0;
        for await (const card of cardsResponse) {
          cards.push(card);
          count++;
          if (count >= 1) break;
        }
        
        expect(count).toBeGreaterThanOrEqual(0);
      } catch (error) {
        if (error.status === 401) {
          fail('Lithic API authentication failed - check API key');
        } else if (error.status === 429) {
          fail('Lithic API rate limit exceeded');
        } else {
          fail(`Lithic API connection failed: ${error.message}`);
        }
      }
    }, 30000);
  });

  describe('Service Integration', () => {
    test('should integrate with Lithic service successfully', async () => {
      try {
        const { fetchTransactions } = await import('../../../src/services/lithic-service.js');
        const transactions = await fetchTransactions({ page_size: 2 });
        
        expect(Array.isArray(transactions) || transactions === null).toBe(true);
      } catch (error) {
        fail(`Lithic service integration failed: ${error.message}`);
      }
    }, 30000);
  });
}); 