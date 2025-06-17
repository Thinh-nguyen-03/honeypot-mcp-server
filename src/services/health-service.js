/**
 * Health Check Service - Comprehensive system health monitoring for MCP server
 * 
 * Provides health validation for:
 * - Database connections (Supabase)
 * - External API connections (Lithic)
 * - Service layer functionality
 * - MCP server status
 * - Dependency availability
 * 
 * @version 1.0.0
 * @author MCP Development Team
 */

import { supabase_client } from '../config/supabase-client.js';
import { lithic_client } from '../config/lithic-client.js';
import logger from '../utils/logger.js';
import alertService from './alert-service.js';

class HealthService {
  constructor() {
    this.lastHealthCheck = null;
    this.healthHistory = [];
    this.maxHistorySize = 100;
    
    // Health check configuration
    this.config = {
      timeoutMs: 10000,          // 10 seconds timeout for checks
      criticalThreshold: 5000,   // 5 seconds is critical response time
      warningThreshold: 2000,    // 2 seconds is warning response time
      retryAttempts: 2,          // Retry failed checks
      historyCacheMinutes: 60    // Keep 1 hour of health history
    };
    
    // Service dependency mappings
    this.dependencies = {
      database: {
        name: 'Supabase Database',
        client: supabase_client,
        testQuery: 'SELECT 1 as health_check',
        critical: true
      },
      lithic: {
        name: 'Lithic API',
        client: lithic_client,
        testEndpoint: 'cards.list',
        critical: true
      },
      alertService: {
        name: 'Alert Service',
        service: alertService,
        critical: false
      }
    };
  }

  /**
   * Perform comprehensive system health check
   * @param {Object} options - Health check options
   * @param {boolean} options.includeDetails - Include detailed check results
   * @param {boolean} options.skipCache - Skip cached results and force fresh check
   * @returns {Promise<Object>} Health check results
   */
  async performHealthCheck(options = {}) {
    const { includeDetails = true, skipCache = false } = options;
    const startTime = Date.now();
    const checkId = `health_${startTime}_${Math.random().toString(36).substr(2, 6)}`;
    
    logger.info({ checkId, options }, 'Starting comprehensive health check');
    
    try {
      // Check if we have recent cached results
      if (!skipCache && this.lastHealthCheck && 
          (startTime - this.lastHealthCheck.timestamp) < 30000) {
        logger.debug({ checkId }, 'Returning cached health check results');
        return this.lastHealthCheck;
      }

      const healthResults = {
        checkId,
        timestamp: new Date().toISOString(),
        overallStatus: 'HEALTHY',
        overallScore: 100,
        responseTimeMs: 0,
        checks: {},
        summary: {
          total: 0,
          passed: 0,
          warnings: 0,
          failures: 0,
          critical: 0
        }
      };

      // Perform all health checks in parallel for speed
      const checkPromises = [
        this.checkDatabaseHealth(checkId),
        this.checkLithicAPIHealth(checkId),
        this.checkServiceHealth(checkId),
        this.checkMCPServerHealth(checkId),
        this.checkSystemResources(checkId)
      ];

      const checkResults = await Promise.allSettled(checkPromises);
      
      // Process results
      const checks = [
        'database',
        'lithic',
        'services',
        'mcpServer',
        'systemResources'
      ];

      checkResults.forEach((result, index) => {
        const checkName = checks[index];
        healthResults.summary.total++;

        if (result.status === 'fulfilled') {
          healthResults.checks[checkName] = result.value;
          
          // Update summary based on check status
          switch (result.value.status) {
            case 'HEALTHY':
              healthResults.summary.passed++;
              break;
            case 'WARNING':
              healthResults.summary.warnings++;
              break;
            case 'UNHEALTHY':
              healthResults.summary.failures++;
              if (result.value.critical) {
                healthResults.summary.critical++;
              }
              break;
          }
        } else {
          // Handle rejected promise
          healthResults.checks[checkName] = {
            status: 'UNHEALTHY',
            critical: true,
            error: result.reason?.message || 'Health check failed',
            responseTimeMs: this.config.timeoutMs,
            timestamp: new Date().toISOString()
          };
          healthResults.summary.failures++;
          healthResults.summary.critical++;
        }
      });

      // Calculate overall status and score
      healthResults.responseTimeMs = Date.now() - startTime;
      this.calculateOverallHealth(healthResults);

      // Store in history
      this.addToHistory(healthResults);
      this.lastHealthCheck = healthResults;

      // Log results
      logger.info({
        checkId,
        overallStatus: healthResults.overallStatus,
        score: healthResults.overallScore,
        responseTime: healthResults.responseTimeMs,
        summary: healthResults.summary
      }, 'Health check completed');

      // Remove detailed check data if not requested
      if (!includeDetails) {
        delete healthResults.checks;
      }

      return healthResults;

    } catch (error) {
      logger.error({
        checkId,
        error: error.message,
        stack: error.stack
      }, 'Health check failed with error');

      const errorResult = {
        checkId,
        timestamp: new Date().toISOString(),
        overallStatus: 'UNHEALTHY',
        overallScore: 0,
        responseTimeMs: Date.now() - startTime,
        error: error.message,
        summary: {
          total: 1,
          passed: 0,
          warnings: 0,
          failures: 1,
          critical: 1
        }
      };

      this.addToHistory(errorResult);
      return errorResult;
    }
  }

  /**
   * Check database connection and basic query functionality
   * @private
   * @param {string} checkId - Health check ID for logging
   * @returns {Promise<Object>} Database health status
   */
  async checkDatabaseHealth(checkId) {
    const startTime = Date.now();
    const checkResult = {
      name: 'Database Connection',
      status: 'HEALTHY',
      critical: true,
      responseTimeMs: 0,
      details: {},
      timestamp: new Date().toISOString()
    };

    try {
      logger.debug({ checkId }, 'Checking database health');

      // Test basic connectivity
      const { data: connectTest, error: connectError } = await Promise.race([
        supabase_client.from('transactions').select('count').limit(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), this.config.timeoutMs)
        )
      ]);

      if (connectError) {
        throw new Error(`Database connection failed: ${connectError.message}`);
      }

      // Test write capability (safe operation)
      const testTimestamp = new Date().toISOString();
      const { error: writeTest } = await supabase_client
        .from('health_checks')
        .upsert([{
          check_id: checkId,
          check_type: 'database_health',
          timestamp: testTimestamp,
          status: 'test'
        }], { onConflict: 'check_id' });

      // Note: health_checks table might not exist, so we'll catch this error
      if (writeTest && writeTest.message && !writeTest.message.includes('does not exist')) {
        logger.warn({ checkId, error: writeTest.message }, 'Database write test warning');
      }

      // Check connection pool status
      const poolStatus = this.getConnectionPoolStatus();
      
      checkResult.responseTimeMs = Date.now() - startTime;
      checkResult.details = {
        connectionStatus: 'connected',
        queryTest: 'passed',
        writeTest: writeTest ? 'warning' : 'passed',
        poolStatus,
        responseTime: checkResult.responseTimeMs
      };

      // Determine status based on response time
      if (checkResult.responseTimeMs > this.config.criticalThreshold) {
        checkResult.status = 'WARNING';
        checkResult.details.warning = 'Slow database response time';
      }

      logger.debug({ 
        checkId, 
        responseTime: checkResult.responseTimeMs,
        status: checkResult.status 
      }, 'Database health check completed');

      return checkResult;

    } catch (error) {
      checkResult.status = 'UNHEALTHY';
      checkResult.error = error.message;
      checkResult.responseTimeMs = Date.now() - startTime;
      checkResult.details = {
        connectionStatus: 'failed',
        error: error.message,
        responseTime: checkResult.responseTimeMs
      };

      logger.error({
        checkId,
        error: error.message,
        responseTime: checkResult.responseTimeMs
      }, 'Database health check failed');

      return checkResult;
    }
  }

  /**
   * Check Lithic API connectivity and authentication
   * @private
   * @param {string} checkId - Health check ID for logging
   * @returns {Promise<Object>} Lithic API health status
   */
  async checkLithicAPIHealth(checkId) {
    const startTime = Date.now();
    const checkResult = {
      name: 'Lithic API',
      status: 'HEALTHY',
      critical: true,
      responseTimeMs: 0,
      details: {},
      timestamp: new Date().toISOString()
    };

    try {
      logger.debug({ checkId }, 'Checking Lithic API health');

      // Test API connectivity with minimal impact
      const apiTest = await Promise.race([
        lithic_client.cards.list({ page_size: 1 }), // Minimal request
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Lithic API timeout')), this.config.timeoutMs)
        )
      ]);

      // Check if we can iterate (even if empty)
      let cardCount = 0;
      for await (const card of apiTest) {
        cardCount++;
        if (cardCount >= 1) break; // Just test iteration works
      }

      checkResult.responseTimeMs = Date.now() - startTime;
      checkResult.details = {
        apiStatus: 'connected',
        authenticationStatus: 'authenticated',
        cardAccessTest: 'passed',
        cardsFound: cardCount,
        responseTime: checkResult.responseTimeMs
      };

      // Determine status based on response time
      if (checkResult.responseTimeMs > this.config.criticalThreshold) {
        checkResult.status = 'WARNING';
        checkResult.details.warning = 'Slow Lithic API response time';
      }

      logger.debug({ 
        checkId, 
        responseTime: checkResult.responseTimeMs,
        cardsFound: cardCount,
        status: checkResult.status 
      }, 'Lithic API health check completed');

      return checkResult;

    } catch (error) {
      checkResult.status = 'UNHEALTHY';
      checkResult.error = error.message;
      checkResult.responseTimeMs = Date.now() - startTime;
      checkResult.details = {
        apiStatus: 'failed',
        authenticationStatus: 'unknown',
        error: error.message,
        responseTime: checkResult.responseTimeMs
      };

      // Check for specific error types
      if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        checkResult.details.authenticationStatus = 'failed';
      }

      logger.error({
        checkId,
        error: error.message,
        responseTime: checkResult.responseTimeMs
      }, 'Lithic API health check failed');

      return checkResult;
    }
  }

  /**
   * Check service layer health
   * @private
   * @param {string} checkId - Health check ID for logging
   * @returns {Promise<Object>} Service health status
   */
  async checkServiceHealth(checkId) {
    const startTime = Date.now();
    const checkResult = {
      name: 'Service Layer',
      status: 'HEALTHY',
      critical: false,
      responseTimeMs: 0,
      details: {},
      timestamp: new Date().toISOString()
    };

    try {
      logger.debug({ checkId }, 'Checking service layer health');

      const serviceTests = {};

      // Test alert service
      try {
        serviceTests.alertService = {
          status: 'available',
          metrics: alertService.getMetrics ? alertService.getMetrics() : 'no_metrics'
        };
      } catch (error) {
        serviceTests.alertService = {
          status: 'error',
          error: error.message
        };
      }

      // Test logger functionality
      try {
        logger.debug({ checkId }, 'Logger functionality test');
        serviceTests.logger = {
          status: 'available',
          test: 'log_write_successful'
        };
      } catch (error) {
        serviceTests.logger = {
          status: 'error',
          error: error.message
        };
      }

      checkResult.responseTimeMs = Date.now() - startTime;
      checkResult.details = {
        services: serviceTests,
        responseTime: checkResult.responseTimeMs
      };

      // Check for any service failures
      const failedServices = Object.entries(serviceTests)
        .filter(([_, test]) => test.status === 'error');

      if (failedServices.length > 0) {
        checkResult.status = 'WARNING';
        checkResult.details.warnings = failedServices.map(([name, test]) => 
          `${name}: ${test.error}`
        );
      }

      logger.debug({ 
        checkId, 
        serviceCount: Object.keys(serviceTests).length,
        failedCount: failedServices.length,
        status: checkResult.status 
      }, 'Service health check completed');

      return checkResult;

    } catch (error) {
      checkResult.status = 'UNHEALTHY';
      checkResult.error = error.message;
      checkResult.responseTimeMs = Date.now() - startTime;

      logger.error({
        checkId,
        error: error.message
      }, 'Service health check failed');

      return checkResult;
    }
  }

  /**
   * Check MCP server status and capabilities
   * @private
   * @param {string} checkId - Health check ID for logging
   * @returns {Promise<Object>} MCP server health status
   */
  async checkMCPServerHealth(checkId) {
    const startTime = Date.now();
    const checkResult = {
      name: 'MCP Server',
      status: 'HEALTHY',
      critical: true,
      responseTimeMs: 0,
      details: {},
      timestamp: new Date().toISOString()
    };

    try {
      logger.debug({ checkId }, 'Checking MCP server health');

      // Test server process and memory
      const processHealth = {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      };

      // Test environment variables
      const envCheck = {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
        hasLithicKey: !!process.env.LITHIC_API_KEY,
        nodeEnv: process.env.NODE_ENV || 'unknown'
      };

      checkResult.responseTimeMs = Date.now() - startTime;
      checkResult.details = {
        processHealth,
        environmentCheck: envCheck,
        serverStatus: 'running',
        capabilities: ['tools'], // Will expand as more capabilities are added
        responseTime: checkResult.responseTimeMs
      };

      // Check for critical issues
      const memoryUsageMB = processHealth.memoryUsage.heapUsed / 1024 / 1024;
      if (memoryUsageMB > 512) { // 512MB threshold
        checkResult.status = 'WARNING';
        checkResult.details.warning = `High memory usage: ${memoryUsageMB.toFixed(2)}MB`;
      }

      if (!envCheck.hasSupabaseUrl || !envCheck.hasSupabaseKey || !envCheck.hasLithicKey) {
        checkResult.status = 'UNHEALTHY';
        checkResult.error = 'Missing critical environment variables';
      }

      logger.debug({ 
        checkId, 
        memoryMB: memoryUsageMB.toFixed(2),
        uptime: processHealth.uptime,
        status: checkResult.status 
      }, 'MCP server health check completed');

      return checkResult;

    } catch (error) {
      checkResult.status = 'UNHEALTHY';
      checkResult.error = error.message;
      checkResult.responseTimeMs = Date.now() - startTime;

      logger.error({
        checkId,
        error: error.message
      }, 'MCP server health check failed');

      return checkResult;
    }
  }

  /**
   * Check system resources and performance
   * @private
   * @param {string} checkId - Health check ID for logging
   * @returns {Promise<Object>} System resources health status
   */
  async checkSystemResources(checkId) {
    const startTime = Date.now();
    const checkResult = {
      name: 'System Resources',
      status: 'HEALTHY',
      critical: false,
      responseTimeMs: 0,
      details: {},
      timestamp: new Date().toISOString()
    };

    try {
      logger.debug({ checkId }, 'Checking system resources');

      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      checkResult.responseTimeMs = Date.now() - startTime;
      checkResult.details = {
        memory: {
          heapUsedMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
          heapTotalMB: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
          externalMB: (memoryUsage.external / 1024 / 1024).toFixed(2),
          arrayBuffersMB: (memoryUsage.arrayBuffers / 1024 / 1024).toFixed(2)
        },
        cpu: {
          userMicroseconds: cpuUsage.user,
          systemMicroseconds: cpuUsage.system
        },
        process: {
          uptime: process.uptime(),
          pid: process.pid
        },
        responseTime: checkResult.responseTimeMs
      };

      // Check for resource warnings
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      if (heapUsedMB > 256) {
        checkResult.status = 'WARNING';
        checkResult.details.warning = `Memory usage is elevated: ${heapUsedMB.toFixed(2)}MB`;
      }

      logger.debug({ 
        checkId, 
        heapUsedMB: heapUsedMB.toFixed(2),
        status: checkResult.status 
      }, 'System resources health check completed');

      return checkResult;

    } catch (error) {
      checkResult.status = 'UNHEALTHY';
      checkResult.error = error.message;
      checkResult.responseTimeMs = Date.now() - startTime;

      logger.error({
        checkId,
        error: error.message
      }, 'System resources health check failed');

      return checkResult;
    }
  }

  /**
   * Calculate overall health status and score
   * @private
   * @param {Object} healthResults - Health check results to analyze
   */
  calculateOverallHealth(healthResults) {
    const { summary, checks } = healthResults;
    
    // Calculate base score
    let score = 100;
    
    // Deduct points for failures
    score -= (summary.failures * 20);      // -20 points per failure
    score -= (summary.warnings * 10);     // -10 points per warning
    score -= (summary.critical * 30);     // Additional -30 points for critical failures
    
    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    
    // Determine overall status
    let overallStatus = 'HEALTHY';
    
    if (summary.critical > 0) {
      overallStatus = 'UNHEALTHY';
    } else if (summary.failures > 0) {
      overallStatus = 'DEGRADED';
    } else if (summary.warnings > 0) {
      overallStatus = 'WARNING';
    }
    
    // Check response time impact
    if (healthResults.responseTimeMs > this.config.criticalThreshold) {
      if (overallStatus === 'HEALTHY') {
        overallStatus = 'WARNING';
      }
      score -= 15; // Additional penalty for slow overall response
    }
    
    healthResults.overallStatus = overallStatus;
    healthResults.overallScore = Math.max(0, score);
  }

  /**
   * Get connection pool status (placeholder for future implementation)
   * @private
   * @returns {Object} Connection pool information
   */
  getConnectionPoolStatus() {
    return {
      status: 'active',
      note: 'Pool status monitoring not yet implemented'
    };
  }

  /**
   * Add health check result to history
   * @private
   * @param {Object} healthResult - Health check result to store
   */
  addToHistory(healthResult) {
    // Add to history
    this.healthHistory.unshift({
      timestamp: healthResult.timestamp,
      overallStatus: healthResult.overallStatus,
      overallScore: healthResult.overallScore,
      responseTimeMs: healthResult.responseTimeMs,
      summary: healthResult.summary
    });

    // Trim history to max size
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(0, this.maxHistorySize);
    }

    // Remove entries older than cache time
    const cutoffTime = Date.now() - (this.config.historyCacheMinutes * 60 * 1000);
    this.healthHistory = this.healthHistory.filter(entry => 
      new Date(entry.timestamp).getTime() > cutoffTime
    );
  }

  /**
   * Get health check history
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Health check history
   */
  getHealthHistory(limit = 20) {
    return this.healthHistory.slice(0, limit);
  }

  /**
   * Format health report for MCP tools
   * @param {Object} healthData - Health check data
   * @param {string} format - Output format ('summary', 'detailed', 'json')
   * @returns {Object} Formatted health report
   */
  formatHealthReport(healthData, format = 'summary') {
    const report = {
      timestamp: healthData.timestamp,
      checkId: healthData.checkId,
      overallStatus: healthData.overallStatus,
      overallScore: healthData.overallScore,
      responseTimeMs: healthData.responseTimeMs
    };

    switch (format) {
      case 'summary':
        report.summary = {
          status: healthData.overallStatus,
          score: `${healthData.overallScore}/100`,
          responseTime: `${healthData.responseTimeMs}ms`,
          checks: `${healthData.summary.passed}/${healthData.summary.total} passed`,
          issues: healthData.summary.failures + healthData.summary.warnings
        };
        break;

      case 'detailed':
        report.summary = healthData.summary;
        report.checks = healthData.checks;
        report.history = this.getHealthHistory(5);
        break;

      case 'json':
        return healthData; // Return raw data

      default:
        report.summary = healthData.summary;
    }

    return report;
  }

  /**
   * Quick health status check (cached results)
   * @returns {Object} Quick health status
   */
  getQuickStatus() {
    if (!this.lastHealthCheck) {
      return {
        status: 'UNKNOWN',
        message: 'No health checks performed yet',
        timestamp: new Date().toISOString()
      };
    }

    const age = Date.now() - new Date(this.lastHealthCheck.timestamp).getTime();
    const ageMinutes = Math.floor(age / 60000);

    return {
      status: this.lastHealthCheck.overallStatus,
      score: this.lastHealthCheck.overallScore,
      age: `${ageMinutes} minutes ago`,
      summary: this.lastHealthCheck.summary,
      timestamp: this.lastHealthCheck.timestamp
    };
  }
}

// Export singleton instance
const healthService = new HealthService();
export default healthService; 