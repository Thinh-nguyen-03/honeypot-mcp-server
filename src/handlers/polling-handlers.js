/**
 * Polling Tool Handlers - MCP tool implementations for real-time alert polling
 * 
 * These handlers provide the MCP tool interface for AI agents to poll for alerts
 * and check subscription status in real-time. They wrap the polling service
 * functionality with proper MCP response formatting and error handling.
 * 
 * Tools:
 * - poll_subscription_alerts: Poll an active subscription for new alerts
 * - get_subscription_status: Get subscription metadata and health status
 */

import pollingService from '../services/polling-service.js';
import logger from '../utils/logger.js';

/**
 * Poll Subscription Alerts Tool Handler
 * Implements: poll_subscription_alerts MCP tool
 * 
 * Retrieves queued alerts for a subscription and clears the queue (consume pattern).
 * This enables AI agents to continuously monitor for new fraud alerts.
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.subscriptionId - Subscription ID to poll
 * @param {number} [args.maxAlerts=50] - Maximum alerts to return
 * @param {string} requestId - MCP request identifier
 * @returns {Object} MCP tool response with alerts
 */
export async function handlePollSubscriptionAlerts(args, requestId) {
  const startTime = Date.now();
  
  try {
    logger.info({ 
      requestId, 
      subscriptionId: args?.subscriptionId,
      maxAlerts: args?.maxAlerts || 50
    }, 'MCP tool: poll_subscription_alerts called');
    
    // Validate required parameters
    if (!args?.subscriptionId) {
      throw new Error('subscriptionId is required');
    }

    // Validate maxAlerts parameter
    const maxAlerts = args.maxAlerts || 50;
    if (maxAlerts < 1 || maxAlerts > 100) {
      throw new Error('maxAlerts must be between 1 and 100');
    }

    // Poll alerts from the polling service
    const alerts = pollingService.pollAlerts(args.subscriptionId, maxAlerts);
    const responseTime = Date.now() - startTime;
    
    // Get updated subscription status for additional context
    const subscriptionStatus = pollingService.getSubscriptionStatus(args.subscriptionId);
    
    // Format response for MCP
    const response = {
      content: [{
        type: "text",
        text: JSON.stringify({
          pollingResult: {
            subscriptionId: args.subscriptionId,
            alertCount: alerts.length,
            alerts: alerts.map(alert => ({
              ...alert,
              // Mask sensitive data for security
              cardToken: alert.cardToken ? maskToken(alert.cardToken) : undefined
            })),
            polledAt: new Date().toISOString(),
            hasMoreAlerts: subscriptionStatus.queuedAlerts > 0,
            subscription: {
              isActive: subscriptionStatus.isActive,
              timeRemaining: subscriptionStatus.timeRemainingHuman,
              queuedAlerts: subscriptionStatus.queuedAlerts,
              pollCount: subscriptionStatus.pollCount,
              totalAlertsReceived: subscriptionStatus.totalAlertsReceived
            },
            performance: {
              responseTimeMs: responseTime,
              throughput: alerts.length > 0 ? Math.round((alerts.length / responseTime) * 1000) : 0
            }
          },
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            toolVersion: '1.0.0',
            note: alerts.length === 0 ? 'No new alerts available' : `Retrieved ${alerts.length} alerts`
          }
        }, null, 2)
      }]
    };

    logger.info({ 
      requestId, 
      subscriptionId: args.subscriptionId,
      alertCount: alerts.length,
      remainingInQueue: subscriptionStatus.queuedAlerts,
      responseTime,
      pollCount: subscriptionStatus.pollCount
    }, 'MCP tool: poll_subscription_alerts completed successfully');

    return response;

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error({ 
      requestId, 
      subscriptionId: args?.subscriptionId, 
      error: error.message, 
      stack: error.stack,
      responseTime
    }, 'MCP tool error: poll_subscription_alerts');
    
    // Return structured error response
    throw new Error(`Tool 'poll_subscription_alerts' failed: ${error.message}`);
  }
}

/**
 * Get Subscription Status Tool Handler
 * Implements: get_subscription_status MCP tool
 * 
 * Retrieves comprehensive status information about an active subscription,
 * including health metrics, queue size, and configuration details.
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.subscriptionId - Subscription ID to check
 * @param {string} requestId - MCP request identifier
 * @returns {Object} MCP tool response with subscription status
 */
export async function handleGetSubscriptionStatus(args, requestId) {
  const startTime = Date.now();
  
  try {
    logger.info({ 
      requestId, 
      subscriptionId: args?.subscriptionId 
    }, 'MCP tool: get_subscription_status called');
    
    // Validate required parameters
    if (!args?.subscriptionId) {
      throw new Error('subscriptionId is required');
    }

    // Get subscription status from polling service
    const subscription = pollingService.getSubscriptionStatus(args.subscriptionId);
    const now = new Date();
    const responseTime = Date.now() - startTime;
    
    // Calculate health metrics
    const healthStatus = calculateHealthStatus(subscription, now);
    
    // Format response for MCP
    const response = {
      content: [{
        type: "text", 
        text: JSON.stringify({
          subscriptionStatus: {
            subscriptionId: args.subscriptionId,
            isActive: subscription.isActive && !subscription.isExpired,
            health: healthStatus,
            lifecycle: {
              createdAt: subscription.createdAt,
              expiresAt: subscription.expiresAt,
              lastPolled: subscription.lastPolled,
              timeRemaining: subscription.timeRemaining,
              timeRemainingHuman: subscription.timeRemainingHuman,
              isExpired: subscription.isExpired
            },
            activity: {
              pollCount: subscription.pollCount,
              totalAlertsReceived: subscription.totalAlertsReceived,
              queuedAlerts: subscription.queuedAlerts,
              averageAlertsPerPoll: subscription.pollCount > 0 ? 
                Math.round((subscription.totalAlertsReceived / subscription.pollCount) * 100) / 100 : 0
            },
            configuration: {
              // Mask sensitive card tokens for security
              cardTokens: subscription.cardTokens?.map(token => maskToken(token)) || [],
              alertTypes: subscription.alertTypes || [],
              riskThreshold: subscription.riskThreshold || 'not specified',
              duration: subscription.duration || 'unknown'
            },
            queueSample: subscription.queueSample || [],
            performance: {
              responseTimeMs: responseTime
            }
          },
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            toolVersion: '1.0.0'
          }
        }, null, 2)
      }]
    };

    logger.info({
      requestId,
      subscriptionId: args.subscriptionId,
      isActive: subscription.isActive,
      queuedAlerts: subscription.queuedAlerts,
      pollCount: subscription.pollCount,
      healthStatus: healthStatus.status,
      responseTime
    }, 'MCP tool: get_subscription_status completed successfully');

    return response;

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error({ 
      requestId, 
      subscriptionId: args?.subscriptionId, 
      error: error.message,
      stack: error.stack,
      responseTime
    }, 'MCP tool error: get_subscription_status');
    
    // Return structured error response
    throw new Error(`Tool 'get_subscription_status' failed: ${error.message}`);
  }
}

/**
 * Poll Live Feed Tool Handler (Future Enhancement)
 * Implements: poll_live_feed MCP tool
 * 
 * This is a placeholder for future live transaction feed polling capability.
 * Currently returns a not implemented message.
 * 
 * @param {Object} args - Tool arguments
 * @param {string} requestId - MCP request identifier
 * @returns {Object} MCP tool response
 */
export async function handlePollLiveFeed(args, requestId) {
  try {
    logger.info({ requestId, feedId: args?.feedId }, 'MCP tool: poll_live_feed called');
    
    const response = {
      content: [{
        type: "text",
        text: JSON.stringify({
          liveFeedResult: {
            status: 'not_implemented',
            message: 'Live feed polling is planned for future release',
            feedId: args?.feedId || 'unknown',
            polledAt: new Date().toISOString()
          },
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            toolVersion: '1.0.0'
          }
        }, null, 2)
      }]
    };

    logger.info({ requestId }, 'MCP tool: poll_live_feed completed (not implemented)');
    return response;

  } catch (error) {
    logger.error({ requestId, error: error.message }, 'MCP tool error: poll_live_feed');
    throw new Error(`Tool 'poll_live_feed' failed: ${error.message}`);
  }
}

/**
 * Calculate health status based on subscription metrics
 * @param {Object} subscription - Subscription data
 * @param {Date} now - Current timestamp
 * @returns {Object} Health status information
 */
function calculateHealthStatus(subscription, now) {
  let status = 'healthy';
  let issues = [];
  let score = 100;

  // Check if expired
  if (subscription.isExpired) {
    status = 'expired';
    issues.push('Subscription has expired');
    score = 0;
  } else if (!subscription.isActive) {
    status = 'inactive';
    issues.push('Subscription is not active');
    score = 0;
  } else {
    // Check time remaining
    const timeRemainingMs = subscription.expiresAt.getTime() - now.getTime();
    const timeRemainingMinutes = timeRemainingMs / (60 * 1000);
    
    if (timeRemainingMinutes < 30) {
      status = 'warning';
      issues.push('Subscription expires soon (< 30 minutes)');
      score -= 20;
    } else if (timeRemainingMinutes < 120) {
      issues.push('Subscription expires within 2 hours');
      score -= 10;
    }

    // Check activity level
    if (subscription.lastPolled) {
      const lastPolledMs = now.getTime() - new Date(subscription.lastPolled).getTime();
      const lastPolledMinutes = lastPolledMs / (60 * 1000);
      
      if (lastPolledMinutes > 60) {
        status = status === 'healthy' ? 'warning' : status;
        issues.push('No polling activity in over 1 hour');
        score -= 15;
      } else if (lastPolledMinutes > 30) {
        issues.push('Low polling activity (last poll > 30 minutes ago)');
        score -= 5;
      }
    } else {
      issues.push('Never been polled');
      score -= 5;
    }

    // Check queue health
    if (subscription.queuedAlerts > 500) {
      status = status === 'healthy' ? 'warning' : status;
      issues.push('High alert queue size (> 500 alerts)');
      score -= 10;
    } else if (subscription.queuedAlerts > 100) {
      issues.push('Moderate alert queue size (> 100 alerts)');
      score -= 5;
    }
  }

  return {
    status,
    score: Math.max(0, score),
    issues,
    lastActivity: subscription.lastPolled || subscription.createdAt,
    summary: issues.length > 0 ? issues.join('; ') : 'All systems operational'
  };
}

/**
 * Mask sensitive token data for security
 * @param {string} token - Token to mask
 * @returns {string} Masked token
 */
function maskToken(token) {
  if (!token || typeof token !== 'string') return 'invalid_token';
  if (token.length <= 8) return token.substring(0, 4) + '***';
  return token.substring(0, 8) + '***';
}

/**
 * Get Polling Metrics Tool Handler
 * Implements: get_polling_metrics MCP tool
 * 
 * Retrieves comprehensive metrics about the polling service including
 * active subscriptions, queue sizes, memory usage, and performance statistics.
 * 
 * @param {Object} args - Tool arguments
 * @param {boolean} [args.includeSubscriptionDetails=false] - Include per-subscription details
 * @param {string} [args.format='summary'] - Output format (summary, detailed, json)
 * @param {string} requestId - MCP request identifier
 * @returns {Object} MCP tool response with polling metrics
 */
export async function handleGetPollingMetrics(args, requestId) {
  const startTime = Date.now();
  
  try {
    logger.info({ 
      requestId, 
      format: args?.format || 'summary',
      includeDetails: args?.includeSubscriptionDetails || false
    }, 'MCP tool: get_polling_metrics called');
    
    // Get comprehensive metrics from polling service
    const metrics = pollingService.getMetrics();
    const responseTime = Date.now() - startTime;
    
    // Build response based on format
    let metricsData = {
      overview: {
        activeSubscriptions: metrics.activeSubscriptions,
        totalQueuedAlerts: metrics.totalQueuedAlerts,
        totalAlertsPolled: metrics.totalAlertsPolled,
        averageQueueSize: Math.round(metrics.averageQueueSize * 100) / 100,
        cleanupCycles: metrics.cleanupCycles
      },
      performance: {
        uptime: formatUptime(metrics.uptime),
        uptimeSeconds: metrics.uptime,
        responseTimeMs: responseTime,
        memoryUsage: {
          heapUsedMB: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotalMB: Math.round(metrics.memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
          externalMB: Math.round(metrics.memoryUsage.external / 1024 / 1024 * 100) / 100
        }
      },
      timestamp: metrics.timestamp
    };

    // Add detailed subscription information if requested
    if (args?.includeSubscriptionDetails) {
      metricsData.subscriptions = [];
      
      for (const [subscriptionId, subscription] of pollingService.subscriptions) {
        const queueSize = pollingService.getQueueSize(subscriptionId);
        metricsData.subscriptions.push({
          subscriptionId: subscriptionId,
          isActive: subscription.isActive,
          createdAt: subscription.createdAt,
          expiresAt: subscription.expiresAt,
          lastPolled: subscription.lastPolled,
          pollCount: subscription.pollCount,
          totalAlertsReceived: subscription.totalAlertsReceived,
          queuedAlerts: queueSize,
          cardTokenCount: subscription.cardTokens?.length || 0,
          alertTypes: subscription.alertTypes || []
        });
      }
    }

    // Format response for MCP
    const response = {
      content: [{
        type: "text",
        text: JSON.stringify({
          pollingMetrics: metricsData,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            toolVersion: '1.0.0',
            format: args?.format || 'summary'
          }
        }, null, 2)
      }]
    };

    logger.info({
      requestId,
      activeSubscriptions: metrics.activeSubscriptions,
      totalQueuedAlerts: metrics.totalQueuedAlerts,
      memoryUsageMB: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
      responseTime
    }, 'MCP tool: get_polling_metrics completed successfully');

    return response;

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    logger.error({ 
      requestId, 
      error: error.message,
      stack: error.stack,
      responseTime
    }, 'MCP tool error: get_polling_metrics');
    
    throw new Error(`Tool 'get_polling_metrics' failed: ${error.message}`);
  }
}

/**
 * Format uptime in human-readable string
 * @param {number} uptimeSeconds - Uptime in seconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(uptimeSeconds) {
  const days = Math.floor(uptimeSeconds / (24 * 60 * 60));
  const hours = Math.floor((uptimeSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((uptimeSeconds % (60 * 60)) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Extract timestamp from MCP request ID for performance metrics
 * @param {string} requestId - MCP request identifier
 * @returns {number} Extracted timestamp or current time
 */
function extractTimestamp(requestId) {
  if (!requestId || typeof requestId !== 'string') return Date.now();
  const match = requestId.match(/mcp_(\d+)_/);
  return match ? parseInt(match[1]) : Date.now();
}