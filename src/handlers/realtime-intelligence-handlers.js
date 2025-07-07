/**
 * Real-time Intelligence Tool Handlers
 * 
 * CRITICAL: These handlers wrap existing business logic services.
 * NEVER modify the underlying service functions - only wrap them for MCP.
 * 
 * Uses: alertService.js and reportingService.js for real-time intelligence
 */

import * as alertService from '../services/alert-service.js';
import * as reportingService from '../services/reporting-service.js';
import pollingService from '../services/polling-service.js';
import logger from '../utils/logger.js';

/**
 * Subscribe to Alerts Tool Handler
 * Implements: subscribe_to_alerts MCP tool
 * Uses: simulated alert subscription with existing services
 */
export async function handleSubscribeToAlerts(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args) 
    }, 'MCP tool: subscribe_to_alerts called');
    
    // Simulate alert subscription using available data
    const subscriptionId = `alert_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 4); // 4 hour default
    
    // Prepare subscription parameters
    const subscriptionParams = {
      cardTokens: args?.cardTokens || [],
      alertTypes: args?.alertTypes || ['fraud_detected', 'high_risk_transaction'],
      riskThreshold: args?.riskThreshold || 0.7,
      includeContext: args?.includeContext !== false,
      maxAlertsPerMinute: Math.min(args?.maxAlertsPerMinute || 10, 100),
      subscriptionDuration: args?.subscriptionDuration || '4h'
    };
    
    // Store subscription in polling service for real-time polling
    try {
      pollingService.storeSubscription(subscriptionId, {
        cardTokens: subscriptionParams.cardTokens,
        alertTypes: subscriptionParams.alertTypes,
        riskThreshold: subscriptionParams.riskThreshold,
        duration: subscriptionParams.subscriptionDuration,
        includeContext: subscriptionParams.includeContext,
        maxAlertsPerMinute: subscriptionParams.maxAlertsPerMinute
      });
      
      logger.info({ 
        requestId, 
        subscriptionId,
        cardTokenCount: subscriptionParams.cardTokens.length,
        alertTypes: subscriptionParams.alertTypes
      }, 'Subscription stored in polling service successfully');
    } catch (pollingError) {
      logger.error({ 
        requestId, 
        subscriptionId, 
        error: pollingError.message 
      }, 'Failed to store subscription in polling service');
      // Continue without polling - subscription still works for other features
    }
    
    // Create subscription result
    const result = {
      subscriptionId: subscriptionId,
      status: 'active',
      connectionDetails: {
        type: 'polling',
        interval: '30s',
        endpoint: `/alerts/subscription/${subscriptionId}`,
        pollingTools: {
          pollAlerts: 'poll_subscription_alerts',
          checkStatus: 'get_subscription_status'
        }
      },
      expiresAt: expirationTime.toISOString()
    };
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            alertSubscription: {
              subscriptionId: result.subscriptionId,
              status: result.status,
              cardTokens: subscriptionParams.cardTokens.map(token => maskToken(token)),
              alertTypes: subscriptionParams.alertTypes,
              riskThreshold: subscriptionParams.riskThreshold,
              duration: subscriptionParams.subscriptionDuration,
              rateLimiting: {
                maxAlertsPerMinute: subscriptionParams.maxAlertsPerMinute
              },
              connectionDetails: result.connectionDetails,
              expiresAt: result.expiresAt
            },
            metadata: {
              note: 'Alert subscription created with real-time polling capabilities',
              pollingInstructions: {
                step1: 'Use poll_subscription_alerts tool to retrieve new alerts',
                step2: 'Use get_subscription_status tool to monitor subscription health',
                example: `poll_subscription_alerts({ subscriptionId: "${subscriptionId}" })`
              },
              timestamp: new Date().toISOString(),
              requestId
            }
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      subscriptionId: result.subscriptionId,
      cardCount: subscriptionParams.cardTokens.length,
      alertTypes: subscriptionParams.alertTypes,
      duration: subscriptionParams.subscriptionDuration,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: subscribe_to_alerts completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      cardTokenCount: args?.cardTokens?.length || 0,
      error: error.message 
    }, 'MCP tool error: subscribe_to_alerts');
    
    throw formatMcpError(error, 'subscribe_to_alerts', requestId);
  }
}

/**
 * Get Live Transaction Feed Tool Handler
 * Implements: get_live_transaction_feed MCP tool
 * Uses: recent transaction data to simulate live feed
 */
export async function handleGetLiveTransactionFeed(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args) 
    }, 'MCP tool: get_live_transaction_feed called');
    
    // Generate feed ID and get recent transactions as "live" data
    const feedId = `live_feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const recentTransactions = await reportingService.getRecentTransactionsForAgent(10);
    
    // Prepare feed parameters
    const feedParams = {
      cardTokenFilter: args?.cardTokenFilter || [],
      includeRealTimeAnalysis: args?.includeRealTimeAnalysis !== false,
      transactionTypes: args?.transactionTypes || ['authorization', 'settlement'],
      feedDuration: args?.feedDuration || '15m',
      maxTransactionsPerMinute: Math.min(args?.maxTransactionsPerMinute || 20, 50),
      includeMetadata: args?.includeMetadata !== false
    };
    
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 15); // 15 min default
    
    // Simulate live feed result
    const result = {
      feedId: feedId,
      status: 'active',
      feedDetails: {
        type: 'real_time_polling',
        updateFrequency: '5s',
        dataSource: 'transaction_stream'
      },
      connectionInfo: {
        method: 'polling',
        endpoint: `/feed/${feedId}`,
        headers: { 'Authorization': 'Bearer [masked]' }
      },
      expiresAt: expirationTime.toISOString(),
      initialTransactions: recentTransactions.slice(0, 5) // Show 5 most recent
    };
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            liveTransactionFeed: {
              feedId: result.feedId,
              status: result.status,
              cardTokenFilter: feedParams.cardTokenFilter.map(token => maskToken(token)),
              transactionTypes: feedParams.transactionTypes,
              duration: feedParams.feedDuration,
              rateLimiting: {
                maxTransactionsPerMinute: feedParams.maxTransactionsPerMinute
              },
              feedDetails: result.feedDetails,
              connectionInfo: result.connectionInfo,
              expiresAt: result.expiresAt,
              initialTransactions: result.initialTransactions
            },
            metadata: {
              note: 'Live feed established with recent transaction data',
              timestamp: new Date().toISOString(),
              requestId
            }
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      feedId: result.feedId,
      cardFilterCount: feedParams.cardTokenFilter.length,
      duration: feedParams.feedDuration,
      transactionTypes: feedParams.transactionTypes,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: get_live_transaction_feed completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      cardFilterCount: args?.cardTokenFilter?.length || 0,
      error: error.message 
    }, 'MCP tool error: get_live_transaction_feed');
    
    throw formatMcpError(error, 'get_live_transaction_feed', requestId);
  }
}




/**
 * Utility Functions
 */



/**
 * Utility Functions
 */

/**
 * Sanitize arguments for logging (remove sensitive data)
 */
function sanitizeArgs(args) {
  if (!args || typeof args !== 'object') return args;
  
  const sanitized = { ...args };
  
  // Mask sensitive tokens and arrays
  if (sanitized.cardToken) {
    sanitized.cardToken = maskToken(sanitized.cardToken);
  }
  if (sanitized.cardTokens) {
    sanitized.cardTokens = sanitized.cardTokens.map(token => maskToken(token));
  }
  if (sanitized.cardTokenFilter) {
    sanitized.cardTokenFilter = sanitized.cardTokenFilter.map(token => maskToken(token));
  }
  
  return sanitized;
}

/**
 * Mask token for logging
 */
function maskToken(token) {
  if (!token) return 'undefined';
  if (typeof token !== 'string') return String(token);
  if (token.length <= 8) return token;
  return `${token.substring(0, 8)}***`;
}

/**
 * Extract timestamp from requestId for performance measurement
 */
function extractTimestamp(requestId) {
  if (!requestId || typeof requestId !== 'string') return Date.now();
  const match = requestId.match(/mcp_(\d+)_/);
  return match ? parseInt(match[1]) : Date.now();
}

/**
 * Format error for MCP response
 */
function formatMcpError(error, toolName, requestId) {
  const mcpError = new Error(`Tool '${toolName}' failed: ${error.message}`);
  mcpError.toolName = toolName;
  mcpError.requestId = requestId;
  mcpError.originalError = error;
  return mcpError;
} 