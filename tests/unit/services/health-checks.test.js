/**
 * Health Checks Test Suite - Phase 1.3.4
 * 
 * Tests comprehensive MCP server health monitoring including:
 * - Service health validation functions
 * - MCP server status monitoring  
 * - Dependency health checks (DB, Lithic API)
 * - Health report formatting for MCP tools
 */

import healthService from '../../../src/services/health-service.js';
import logger from '../../../src/utils/logger.js';

describe('Health Checks - P1.3.4', () => {
  beforeAll(() => {
    // Suppress logs during testing
    logger.level = 'error';
  });

  describe('Health Service Initialization', () => {
    test('should initialize health service correctly', () => {
      expect(healthService).toBeDefined();
      expect(typeof healthService).toBe('object');
      expect(healthService.config).toBeDefined();
      expect(healthService.config.timeoutMs).toBeGreaterThan(0);
      expect(healthService.config.criticalThreshold).toBeGreaterThan(0);
      expect(healthService.dependencies).toBeDefined();
      expect(healthService.dependencies.database).toBeDefined();
      expect(healthService.dependencies.lithic).toBeDefined();
    });

    test('should have required methods', () => {
      expect(typeof healthService.performHealthCheck).toBe('function');
      expect(typeof healthService.getQuickStatus).toBe('function');
      expect(typeof healthService.formatHealthReport).toBe('function');
    });
  });

  describe('Comprehensive Health Check', () => {
    let healthResult;

    test('should perform comprehensive health check', async () => {
      healthResult = await healthService.performHealthCheck({
        includeDetails: true,
        skipCache: true
      });

      expect(healthResult).toBeDefined();
      expect(typeof healthResult.checkId).toBe('string');
      expect(typeof healthResult.timestamp).toBe('string');
      expect(typeof healthResult.overallStatus).toBe('string');
      expect(typeof healthResult.overallScore).toBe('number');
      expect(typeof healthResult.responseTimeMs).toBe('number');
    }, 30000);

    test('should have valid summary structure', async () => {
      if (!healthResult) {
        healthResult = await healthService.performHealthCheck({
          includeDetails: true,
          skipCache: true
        });
      }

      expect(healthResult.summary).toBeDefined();
      expect(typeof healthResult.summary.total).toBe('number');
      expect(typeof healthResult.summary.passed).toBe('number');
      expect(typeof healthResult.summary.warnings).toBe('number');
      expect(typeof healthResult.summary.failures).toBe('number');
      expect(typeof healthResult.summary.critical).toBe('number');
    }, 30000);

    test('should perform all required checks', async () => {
      if (!healthResult) {
        healthResult = await healthService.performHealthCheck({
          includeDetails: true,
          skipCache: true
        });
      }

      expect(healthResult.checks).toBeDefined();
      expect(healthResult.checks.database).toBeDefined();
      expect(healthResult.checks.lithic).toBeDefined();
      expect(healthResult.checks.services).toBeDefined();
      expect(healthResult.checks.mcpServer).toBeDefined();
      expect(healthResult.checks.systemResources).toBeDefined();
    }, 30000);
  });

  describe('Individual Component Health Checks', () => {
    test('should validate database health check structure', async () => {
      const healthResult = await healthService.performHealthCheck({
        includeDetails: true,
        skipCache: true
      });

      const dbCheck = healthResult.checks.database;
      expect(dbCheck).toBeDefined();
      expect(typeof dbCheck.status).toBe('string');
      expect(typeof dbCheck.critical).toBe('boolean');
      expect(typeof dbCheck.responseTimeMs).toBe('number');
      expect(dbCheck.details).toBeDefined();
    }, 30000);

    test('should validate Lithic API health check structure', async () => {
      const healthResult = await healthService.performHealthCheck({
        includeDetails: true,
        skipCache: true
      });

      const lithicCheck = healthResult.checks.lithic;
      expect(lithicCheck).toBeDefined();
      expect(typeof lithicCheck.status).toBe('string');
      expect(typeof lithicCheck.critical).toBe('boolean');
      expect(typeof lithicCheck.responseTimeMs).toBe('number');
      expect(lithicCheck.details).toBeDefined();
    }, 30000);
  });

  describe('Health Report Formatting', () => {
    test('should format summary report', async () => {
      const summaryReport = await healthService.formatHealthReport('summary');
      expect(typeof summaryReport).toBe('string');
      expect(summaryReport.length).toBeGreaterThan(0);
    }, 30000);

    test('should format detailed report', async () => {
      const detailedReport = await healthService.formatHealthReport('detailed');
      expect(typeof detailedReport).toBe('string');
      expect(detailedReport.length).toBeGreaterThan(0);
    }, 30000);

    test('should format JSON report', async () => {
      const jsonReport = await healthService.formatHealthReport('json');
      expect(() => JSON.parse(jsonReport)).not.toThrow();
    }, 30000);
  });

  describe('Quick Status Functionality', () => {
    test('should return quick status', async () => {
      const quickStatus = await healthService.getQuickStatus();
      expect(quickStatus).toBeDefined();
      expect(typeof quickStatus.status).toBe('string');
      expect(typeof quickStatus.score).toBe('number');
      expect(typeof quickStatus.responseTimeMs).toBe('number');
    }, 30000);
  });
}); 