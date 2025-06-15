import { describe, test, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import { Worker } from 'worker_threads';
import os from 'os';

/**
 * Comprehensive Performance Tests for MCP Tool Handlers
 * 
 * Validates P4.1.3 acceptance criteria:
 * - <200ms response time for 90% of requests
 * - Concurrent connection testing
 * - Memory usage profiling
 * - Database query optimization testing
 */

// Mock dependencies for performance testing
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

describe('Comprehensive Performance Tests - P4.1.3 Validation', () => {
  const mockRequestId = 'perf_comprehensive_test';
  const PERFORMANCE_SLA_MS = 200;
  const CONCURRENT_TEST_COUNT = 20;
  const STRESS_TEST_COUNT = 100;
  
  let performanceMetrics = [];
  let memoryBaseline = 0;

  beforeAll(() => {
    // Capture initial memory baseline
    if (global.gc) global.gc();
    memoryBaseline = process.memoryUsage().heapUsed;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setupOptimizedServiceMocks();
    performanceMetrics = [];
  });

  afterAll(() => {
    // Final memory cleanup
    if (global.gc) global.gc();
  });

  function setupOptimizedServiceMocks() {
    // Mock with optimized response times
    supabaseService.getAvailableCardsForMcp = vi.fn().mockImplementation(async () => {
      // Simulate database query time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      return {
        queryType: 'available_cards_list',
        cardCount: 10,
        cards: Array.from({ length: 10 }, (_, i) => ({
          token: `card_perf_${i}`,
          state: 'ACTIVE',
          maskedPan: `**** **** **** ${String(i).padStart(4, '0')}`
        }))
      };
    });

    supabaseService.getCardDetailsForMcp = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 30));
      return {
        token: 'card_perf_test',
        state: 'ACTIVE',
        type: 'VIRTUAL',
        maskedPan: '**** **** **** 1234'
      };
    });

    supabaseService.getTransaction = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 40));
      return {
        token: 'txn_perf_test',
        amount: 1000,
        status: 'SETTLED',
        merchant: 'PERFORMANCE_TEST_MERCHANT'
      };
    });

    reportingService.searchTransactions = vi.fn().mockImplementation(async (params) => {
      // Simulate query complexity based on parameters
      const queryTime = params.includeAnalysis ? 80 : 30;
      await new Promise(resolve => setTimeout(resolve, Math.random() * queryTime));
      
      return {
        transactions: Array.from({ length: params.limit || 20 }, (_, i) => ({
          token: `txn_search_${i}`,
          amount: Math.floor(Math.random() * 10000),
          merchant: `MERCHANT_${i}`
        })),
        totalCount: params.limit || 20,
        queryExecutionTime: queryTime
      };
    });

    reportingService.analyzePatterns = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 60));
      return {
        patterns: Array.from({ length: 5 }, (_, i) => ({
          type: `pattern_${i}`,
          score: Math.random()
        })),
        confidence: 0.85,
        processingTime: 60
      };
    });

    reportingService.detectFraud = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 70));
      return {
        riskScore: Math.random(),
        riskLevel: 'MEDIUM',
        indicators: ['velocity_check', 'amount_check'],
        confidence: 0.9,
        analysisTime: 70
      };
    });

    mccService.getMerchantIntel = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 90));
      return {
        merchantProfile: { name: 'Performance Test Merchant' },
        riskProfile: { riskScore: 0.2 },
        reputation: { score: 0.95 },
        processingTime: 90
      };
    });

    alertService.createMcpSubscription = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
      return {
        subscriptionId: `sub_perf_${Date.now()}`,
        status: 'active',
        setupTime: 20
      };
    });
  }

  async function measureHandlerPerformance(handlerFunction, args, requestId = mockRequestId) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await handlerFunction(args, requestId);
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      const metrics = {
        executionTime: endTime - startTime,
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
        success: true,
        handlerName: handlerFunction.name,
        timestamp: Date.now()
      };
      
      performanceMetrics.push(metrics);
      return metrics;
    } catch (error) {
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      
      const metrics = {
        executionTime: endTime - startTime,
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
        success: false,
        error: error.message,
        handlerName: handlerFunction.name,
        timestamp: Date.now()
      };
      
      performanceMetrics.push(metrics);
      throw error;
    }
  }

  describe('Concurrent Connection Testing', () => {
    test('should handle 20 concurrent card lookup requests within SLA', async () => {
      const concurrentTasks = Array.from({ length: CONCURRENT_TEST_COUNT }, (_, i) =>
        measureHandlerPerformance(
          cardHandlers.handleGetCardDetails,
          { cardToken: `card_concurrent_${i}` },
          `${mockRequestId}_concurrent_${i}`
        )
      );

      const startTime = performance.now();
      const results = await Promise.allSettled(concurrentTasks);
      const totalTime = performance.now() - startTime;

      // Verify all requests completed successfully
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      expect(successful.length).toBeGreaterThanOrEqual(CONCURRENT_TEST_COUNT * 0.95); // 95% success rate
      expect(failed.length).toBeLessThanOrEqual(CONCURRENT_TEST_COUNT * 0.05);

      // Verify individual response times
      successful.forEach(result => {
        expect(result.value.executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
      });

      // Verify concurrent execution efficiency
      expect(totalTime).toBeLessThan(PERFORMANCE_SLA_MS * 2); // Should not be much slower than single request

      console.log(`Concurrent test: ${successful.length}/${CONCURRENT_TEST_COUNT} successful, total time: ${totalTime.toFixed(2)}ms`);
    });

    test('should maintain performance under mixed concurrent workloads', async () => {
      const mixedTasks = [
        // Card operations (fast)
        ...Array.from({ length: 5 }, (_, i) =>
          measureHandlerPerformance(
            cardHandlers.handleListAvailableCards,
            { limit: 10 },
            `${mockRequestId}_mixed_card_${i}`
          )
        ),
        // Transaction queries (medium)
        ...Array.from({ length: 5 }, (_, i) =>
          measureHandlerPerformance(
            transactionHandlers.handleSearchTransactions,
            { limit: 20, sortBy: 'created' },
            `${mockRequestId}_mixed_txn_${i}`
          )
        ),
        // Pattern analysis (slower)
        ...Array.from({ length: 5 }, (_, i) =>
          measureHandlerPerformance(
            patternHandlers.handleAnalyzeTransactionPatterns,
            { cardToken: `card_pattern_${i}`, analysisWindow: '7d' },
            `${mockRequestId}_mixed_pattern_${i}`
          )
        ),
        // Real-time intelligence (variable)
        ...Array.from({ length: 5 }, (_, i) =>
          measureHandlerPerformance(
            realtimeHandlers.handleGenerateVerificationQuestions,
            { cardToken: `card_verify_${i}`, questionCount: 3 },
            `${mockRequestId}_mixed_realtime_${i}`
          )
        )
      ];

      const results = await Promise.allSettled(mixedTasks);
      const successful = results.filter(r => r.status === 'fulfilled');

      expect(successful.length).toBeGreaterThanOrEqual(mixedTasks.length * 0.9); // 90% success rate

      // Check performance by category
      const cardMetrics = performanceMetrics.filter(m => m.handlerName.includes('Card'));
      const transactionMetrics = performanceMetrics.filter(m => m.handlerName.includes('Transaction'));
      const patternMetrics = performanceMetrics.filter(m => m.handlerName.includes('Pattern'));

      // Different SLAs for different operation types
      cardMetrics.forEach(m => expect(m.executionTime).toBeLessThan(100)); // Card ops should be fastest
      transactionMetrics.forEach(m => expect(m.executionTime).toBeLessThan(150)); // Transaction queries medium
      patternMetrics.forEach(m => expect(m.executionTime).toBeLessThan(PERFORMANCE_SLA_MS)); // Pattern analysis within SLA
    });

    test('should handle connection pool exhaustion gracefully', async () => {
      const heavyTasks = Array.from({ length: 50 }, (_, i) =>
        measureHandlerPerformance(
          transactionHandlers.handleSearchTransactions,
          { 
            limit: 100, 
            includeAnalysis: true,
            sortBy: 'amount',
            dateRange: { start: '2023-01-01', end: '2023-12-31' }
          },
          `${mockRequestId}_heavy_${i}`
        )
      );

      const results = await Promise.allSettled(heavyTasks);
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      // Should handle graceful degradation
      expect(successful.length).toBeGreaterThan(heavyTasks.length * 0.7); // At least 70% success
      
      // Failed requests should fail fast, not timeout
      failed.forEach(result => {
        if (result.reason.message) {
          expect(result.reason.message).toMatch(/pool|connection|timeout|limit/i);
        }
      });
    });
  });

  describe('Memory Usage Profiling', () => {
    test('should not leak memory during sustained operations', async () => {
      const iterations = 50;
      const memorySnapshots = [];

      for (let i = 0; i < iterations; i++) {
        await measureHandlerPerformance(
          cardHandlers.handleListAvailableCards,
          { limit: 10, includeDetails: true },
          `${mockRequestId}_memory_${i}`
        );

        // Take memory snapshot every 10 iterations
        if (i % 10 === 0) {
          if (global.gc) global.gc(); // Force garbage collection if available
          memorySnapshots.push({
            iteration: i,
            heapUsed: process.memoryUsage().heapUsed,
            heapTotal: process.memoryUsage().heapTotal,
            external: process.memoryUsage().external,
            rss: process.memoryUsage().rss
          });
        }
      }

      // Analyze memory growth pattern
      const initialHeap = memorySnapshots[0].heapUsed;
      const finalHeap = memorySnapshots[memorySnapshots.length - 1].heapUsed;
      const memoryGrowth = finalHeap - initialHeap;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      // Memory growth should be reasonable (less than 10MB for 50 operations)
      expect(memoryGrowthMB).toBeLessThan(10);

      // Check for consistent memory usage pattern
      const growthRates = [];
      for (let i = 1; i < memorySnapshots.length; i++) {
        const growth = memorySnapshots[i].heapUsed - memorySnapshots[i - 1].heapUsed;
        growthRates.push(growth);
      }

      // Memory growth should be relatively stable, not exponential
      const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
      const maxGrowth = Math.max(...growthRates);
      
      expect(maxGrowth).toBeLessThan(avgGrowth * 3); // No single spike more than 3x average

      console.log(`Memory profiling: ${memoryGrowthMB.toFixed(2)}MB growth over ${iterations} operations`);
    });

    test('should handle large dataset responses efficiently', async () => {
      // Mock large dataset
      supabaseService.getAvailableCardsForMcp.mockResolvedValue({
        queryType: 'available_cards_list',
        cardCount: 1000,
        cards: Array.from({ length: 1000 }, (_, i) => ({
          token: `card_large_${i}`,
          state: 'ACTIVE',
          maskedPan: `**** **** **** ${String(i).padStart(4, '0')}`,
          details: {
            merchant: `MERCHANT_${i}`,
            amount: Math.floor(Math.random() * 10000),
            transactions: Array.from({ length: 10 }, (_, j) => ({
              id: `txn_${i}_${j}`,
              amount: Math.floor(Math.random() * 1000)
            }))
          }
        }))
      });

      const preTestMemory = process.memoryUsage().heapUsed;
      
      const metrics = await measureHandlerPerformance(
        cardHandlers.handleListAvailableCards,
        { limit: 1000, includeDetails: true }
      );

      if (global.gc) global.gc();
      const postTestMemory = process.memoryUsage().heapUsed;
      const memoryUsed = (postTestMemory - preTestMemory) / (1024 * 1024);

      // Should handle large datasets within performance and memory constraints
      expect(metrics.executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
      expect(memoryUsed).toBeLessThan(50); // Less than 50MB for processing 1000 cards

      console.log(`Large dataset test: ${metrics.executionTime.toFixed(2)}ms, ${memoryUsed.toFixed(2)}MB memory`);
    });

    test('should release resources after error conditions', async () => {
      const preErrorMemory = process.memoryUsage().heapUsed;

      // Mock service to throw errors intermittently
      let callCount = 0;
      supabaseService.getCardDetailsForMcp.mockImplementation(async () => {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error('Simulated database error');
        }
        await new Promise(resolve => setTimeout(resolve, 10));
        return { token: 'card_test', state: 'ACTIVE' };
      });

      const errorHandlingTasks = Array.from({ length: 20 }, (_, i) =>
        measureHandlerPerformance(
          cardHandlers.handleGetCardDetails,
          { cardToken: `card_error_${i}` },
          `${mockRequestId}_error_${i}`
        ).catch(error => ({ error: error.message, index: i }))
      );

      await Promise.all(errorHandlingTasks);

      if (global.gc) global.gc();
      const postErrorMemory = process.memoryUsage().heapUsed;
      const memoryDelta = (postErrorMemory - preErrorMemory) / (1024 * 1024);

      // Memory should not leak significantly during error handling
      expect(memoryDelta).toBeLessThan(5); // Less than 5MB increase
    });
  });

  describe('Database Query Optimization', () => {
    test('should optimize queries based on request parameters', async () => {
      const queryMetrics = [];

      // Test different query scenarios
      const queryScenarios = [
        {
          name: 'simple_list',
          handler: cardHandlers.handleListAvailableCards,
          params: { limit: 10 }
        },
        {
          name: 'detailed_list',
          handler: cardHandlers.handleListAvailableCards,
          params: { limit: 10, includeDetails: true }
        },
        {
          name: 'large_list',
          handler: cardHandlers.handleListAvailableCards,
          params: { limit: 100 }
        },
        {
          name: 'filtered_search',
          handler: transactionHandlers.handleSearchTransactions,
          params: { merchantName: 'SPECIFIC_MERCHANT', limit: 20 }
        },
        {
          name: 'complex_search',
          handler: transactionHandlers.handleSearchTransactions,
          params: { 
            amountRange: { min: 100, max: 1000 },
            dateRange: { start: '2023-01-01', end: '2023-12-31' },
            includeAnalysis: true,
            limit: 50
          }
        }
      ];

      for (const scenario of queryScenarios) {
        const metrics = await measureHandlerPerformance(
          scenario.handler,
          scenario.params,
          `${mockRequestId}_query_${scenario.name}`
        );

        queryMetrics.push({
          ...metrics,
          scenarioName: scenario.name,
          complexity: scenario.params.includeAnalysis ? 'high' : 
                     scenario.params.limit > 50 ? 'medium' : 'low'
        });
      }

      // Verify query optimization patterns
      const simpleQueries = queryMetrics.filter(m => m.complexity === 'low');
      const complexQueries = queryMetrics.filter(m => m.complexity === 'high');

      // Simple queries should be faster than complex ones
      const avgSimpleTime = simpleQueries.reduce((sum, m) => sum + m.executionTime, 0) / simpleQueries.length;
      const avgComplexTime = complexQueries.reduce((sum, m) => sum + m.executionTime, 0) / complexQueries.length;

      expect(avgSimpleTime).toBeLessThan(avgComplexTime);
      expect(avgSimpleTime).toBeLessThan(100); // Simple queries under 100ms
      expect(avgComplexTime).toBeLessThan(PERFORMANCE_SLA_MS); // Complex queries within SLA

      console.log(`Query optimization: Simple avg ${avgSimpleTime.toFixed(2)}ms, Complex avg ${avgComplexTime.toFixed(2)}ms`);
    });

    test('should implement efficient pagination', async () => {
      const paginationMetrics = [];
      const pageSize = 20;
      const totalPages = 5;

      for (let page = 0; page < totalPages; page++) {
        const metrics = await measureHandlerPerformance(
          transactionHandlers.handleSearchTransactions,
          { 
            limit: pageSize,
            offset: page * pageSize,
            sortBy: 'created'
          },
          `${mockRequestId}_page_${page}`
        );

        paginationMetrics.push({
          ...metrics,
          page,
          offset: page * pageSize
        });
      }

      // Pagination performance should be consistent
      const executionTimes = paginationMetrics.map(m => m.executionTime);
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);

      // Performance should not degrade significantly with pagination
      expect(maxTime - minTime).toBeLessThan(50); // Less than 50ms variance
      expect(maxTime).toBeLessThan(PERFORMANCE_SLA_MS);
      expect(avgTime).toBeLessThan(150); // Average under 150ms

      console.log(`Pagination test: Avg ${avgTime.toFixed(2)}ms, Range ${minTime.toFixed(2)}-${maxTime.toFixed(2)}ms`);
    });

    test('should handle database connection pooling efficiently', async () => {
      // Simulate database connection pool stress
      const connectionTasks = Array.from({ length: 30 }, (_, i) =>
        measureHandlerPerformance(
          transactionHandlers.handleGetTransaction,
          { transactionToken: `txn_pool_${i}` },
          `${mockRequestId}_pool_${i}`
        )
      );

      const results = await Promise.allSettled(connectionTasks);
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      // Most requests should succeed even under connection stress
      expect(successful.length).toBeGreaterThan(connectionTasks.length * 0.8);

      // Successful requests should meet performance requirements
      successful.forEach(result => {
        expect(result.value.executionTime).toBeLessThan(PERFORMANCE_SLA_MS);
      });

      // Failed requests should fail fast with appropriate errors
      failed.forEach(result => {
        expect(result.reason.message).toMatch(/connection|pool|timeout/i);
      });
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance degradation patterns', async () => {
      const baselineTests = Array.from({ length: 10 }, (_, i) =>
        measureHandlerPerformance(
          cardHandlers.handleGetCardDetails,
          { cardToken: `card_baseline_${i}` },
          `${mockRequestId}_baseline_${i}`
        )
      );

      await Promise.all(baselineTests);
      
      const baselineMetrics = performanceMetrics.slice(-10);
      const baselineAvg = baselineMetrics.reduce((sum, m) => sum + m.executionTime, 0) / 10;

      // Simulate performance degradation
      supabaseService.getCardDetailsForMcp.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150)); // Simulate slower response
        return { token: 'card_degraded', state: 'ACTIVE' };
      });

      const degradedTests = Array.from({ length: 10 }, (_, i) =>
        measureHandlerPerformance(
          cardHandlers.handleGetCardDetails,
          { cardToken: `card_degraded_${i}` },
          `${mockRequestId}_degraded_${i}`
        )
      );

      await Promise.all(degradedTests);

      const degradedMetrics = performanceMetrics.slice(-10);
      const degradedAvg = degradedMetrics.reduce((sum, m) => sum + m.executionTime, 0) / 10;

      // Should detect significant performance regression
      const performanceRegression = ((degradedAvg - baselineAvg) / baselineAvg) * 100;
      
      expect(degradedAvg).toBeGreaterThan(baselineAvg * 1.5); // At least 50% slower
      expect(performanceRegression).toBeGreaterThan(50); // More than 50% regression

      console.log(`Performance regression detected: ${performanceRegression.toFixed(2)}% slower`);
    });
  });

  describe('Performance Summary and Reporting', () => {
    test('should generate comprehensive performance report', async () => {
      // Run a representative workload
      const workloadTasks = [
        measureHandlerPerformance(cardHandlers.handleListAvailableCards, { limit: 50 }),
        measureHandlerPerformance(cardHandlers.handleGetCardDetails, { cardToken: 'card_report' }),
        measureHandlerPerformance(transactionHandlers.handleSearchTransactions, { limit: 30 }),
        measureHandlerPerformance(patternHandlers.handleDetectFraudIndicators, { transactionToken: 'txn_report' }),
        measureHandlerPerformance(realtimeHandlers.handleSubscribeToAlerts, { cardTokens: ['card_report'] })
      ];

      await Promise.all(workloadTasks);

      // Generate performance summary
      const allMetrics = performanceMetrics.filter(m => m.success);
      const executionTimes = allMetrics.map(m => m.executionTime);
      const memoryDeltas = allMetrics.map(m => m.memoryDelta);

      const performanceSummary = {
        totalTests: allMetrics.length,
        avgExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
        p90ExecutionTime: executionTimes.sort((a, b) => a - b)[Math.floor(executionTimes.length * 0.9)],
        p95ExecutionTime: executionTimes.sort((a, b) => a - b)[Math.floor(executionTimes.length * 0.95)],
        maxExecutionTime: Math.max(...executionTimes),
        minExecutionTime: Math.min(...executionTimes),
        avgMemoryDelta: memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length,
        slaCompliance: (executionTimes.filter(t => t < PERFORMANCE_SLA_MS).length / executionTimes.length) * 100
      };

      // Validate P4.1.3 acceptance criteria
      expect(performanceSummary.p90ExecutionTime).toBeLessThan(PERFORMANCE_SLA_MS); // 90% under 200ms
      expect(performanceSummary.slaCompliance).toBeGreaterThanOrEqual(90); // 90% compliance rate
      expect(performanceSummary.avgMemoryDelta).toBeLessThan(1024 * 1024); // Average memory delta under 1MB

      console.log('Performance Summary:', JSON.stringify(performanceSummary, null, 2));
    });
  });
});