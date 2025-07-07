/**
 * Alert Service - Manages AI agent connections and broadcasts real-time transaction alerts
 * 
 * This service handles:
 * - Connection registry for active AI agents
 * - Message broadcasting to connected agents
 * - Connection health monitoring and cleanup
 * - Alert formatting for AI consumption
 * - Real-time polling integration for subscription-based alerts
 */

import EventEmitter from 'events';
import logger from '../utils/logger.js';
import pollingService from './polling-service.js';

class AlertService extends EventEmitter {
  constructor() {
    super();
    
    // Connection registry: Map<sessionId, connectionInfo>
    this.connections = new Map();
    
    // Card-to-sessions mapping: Map<cardToken, Set<sessionId>>
    this.cardSessions = new Map();
    
    // Message queue for failed deliveries: Map<sessionId, Array<message>>
    this.messageQueue = new Map();
    
    // Connection health tracking
    this.connectionHealth = new Map();
    
    // Performance metrics
    this.metrics = {
      totalConnections: 0,
      totalAlertsSent: 0,
      failedDeliveries: 0,
      activeConnections: 0
    };
    
    // Start health check interval
    this.startHealthCheck();
  }
  
  /**
   * Register a new AI agent connection
   * @param {string} sessionId - Unique session identifier
   * @param {string} cardToken - Honeypot card token to monitor
   * @param {Object} connection - Connection object (SSE response or WebSocket)
   * @returns {boolean} Success status
   */
  registerConnection(sessionId, cardToken, connection) {
    try {
      // Store connection info
      this.connections.set(sessionId, {
        connection,
        cardToken,
        connectedAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      });
      
      // Update card-to-sessions mapping
      if (!this.cardSessions.has(cardToken)) {
        this.cardSessions.set(cardToken, new Set());
      }
      this.cardSessions.get(cardToken).add(sessionId);
      
      // Initialize health tracking
      this.connectionHealth.set(sessionId, {
        lastPing: new Date(),
        failedPings: 0
      });
      
      // Update metrics
      this.metrics.totalConnections++;
      this.metrics.activeConnections = this.connections.size;
      
      logger.info({
        sessionId,
        cardToken,
        activeConnections: this.metrics.activeConnections
      }, 'AI agent connection registered');
      
      // Emit connection event
      this.emit('connection:registered', { sessionId, cardToken });
      
      return true;
    } catch (error) {
      logger.error({
        error: error.message,
        sessionId,
        cardToken
      }, 'Failed to register connection');
      return false;
    }
  }
  
  /**
   * Broadcast alert to all agents monitoring a specific card
   * @param {string} cardToken - Card token that triggered the alert
   * @param {Object} alertData - Transaction alert data (can be raw transaction data or pre-formatted alert)
   * @returns {Object} Broadcast result with success/failure counts
   */
  async broadcastAlert(cardToken, alertData) {
    const result = {
      successful: 0,
      failed: 0,
      sessions: []
    };
    
    try {
      // Get all sessions monitoring this card
      const sessions = this.cardSessions.get(cardToken);
      if (!sessions || sessions.size === 0) {
        logger.debug({ cardToken }, 'No active sessions for card');
        return result;
      }
      
      // Check if alert is already formatted (has alertType, immediate, verification, intelligence)
      // or if it's raw transaction data that needs formatting
      let formattedAlert;
      if (alertData.alertType && alertData.immediate && alertData.verification && alertData.intelligence) {
        // Already formatted alert object - use as is
        formattedAlert = alertData;
        logger.debug({ 
          cardToken, 
          transactionId: alertData.transactionId 
        }, 'Using pre-formatted alert data');
      } else {
        // Raw transaction data - needs formatting
        formattedAlert = this.formatTransactionAlert(alertData);
        logger.debug({ 
          cardToken, 
          transactionId: alertData.token || alertData.id 
        }, 'Formatting raw transaction data for alert');
      }
      
      // Broadcast to all connected sessions
      for (const sessionId of sessions) {
        const connectionInfo = this.connections.get(sessionId);
        if (!connectionInfo || !connectionInfo.isActive) {
          continue;
        }
        
        try {
          // Send alert based on connection type (SSE or WebSocket)
          await this.sendAlert(connectionInfo.connection, formattedAlert);
          
          // Update activity timestamp
          connectionInfo.lastActivity = new Date();
          
          // Track successful delivery
          result.successful++;
          result.sessions.push({ sessionId, status: 'delivered' });
          
          // Clear any queued messages for this session
          this.messageQueue.delete(sessionId);
          
        } catch (error) {
          logger.warn({
            error: error.message,
            sessionId,
            cardToken
          }, 'Failed to deliver alert to session');
          
          // Queue message for retry
          this.queueMessage(sessionId, formattedAlert);
          
          result.failed++;
          result.sessions.push({ sessionId, status: 'failed', error: error.message });
          this.metrics.failedDeliveries++;
        }
      }
      
      // Update metrics
      this.metrics.totalAlertsSent += result.successful;
      
      // NEW: Also queue alerts for polling subscriptions
      try {
        this.queueAlertsForPolling(cardToken, formattedAlert);
      } catch (pollingError) {
        logger.warn({ 
          error: pollingError.message, 
          cardToken,
          alertType: formattedAlert.alertType 
        }, 'Failed to queue alert for polling subscriptions');
      }
      
      logger.info({
        cardToken,
        successful: result.successful,
        failed: result.failed,
        totalSessions: sessions.size
      }, 'Alert broadcast completed');
      
      return result;
      
    } catch (error) {
      logger.error({
        error: error.message,
        cardToken
      }, 'Alert broadcast failed');
      throw error;
    }
  }
  
  /**
   * Remove a disconnected AI agent connection
   * @param {string} sessionId - Session to remove
   * @returns {boolean} Success status
   */
  removeConnection(sessionId) {
    try {
      const connectionInfo = this.connections.get(sessionId);
      if (!connectionInfo) {
        return false;
      }
      
      // Remove from card sessions
      const cardToken = connectionInfo.cardToken;
      if (this.cardSessions.has(cardToken)) {
        this.cardSessions.get(cardToken).delete(sessionId);
        
        // Clean up empty sets
        if (this.cardSessions.get(cardToken).size === 0) {
          this.cardSessions.delete(cardToken);
        }
      }
      
      // Clean up related data
      this.connections.delete(sessionId);
      this.connectionHealth.delete(sessionId);
      this.messageQueue.delete(sessionId);
      
      // Update metrics
      this.metrics.activeConnections = this.connections.size;
      
      logger.info({
        sessionId,
        cardToken,
        activeConnections: this.metrics.activeConnections
      }, 'AI agent connection removed');
      
      // Emit disconnection event
      this.emit('connection:removed', { sessionId, cardToken });
      
      return true;
    } catch (error) {
      logger.error({
        error: error.message,
        sessionId
      }, 'Failed to remove connection');
      return false;
    }
  }
  
  /**
   * Get count and details of active connections
   * @returns {Object} Active connection statistics
   */
  getActiveConnections() {
    const stats = {
      totalActive: this.connections.size,
      byCard: {},
      connectionDetails: []
    };
    
    // Group by card
    for (const [cardToken, sessions] of this.cardSessions) {
      stats.byCard[cardToken] = sessions.size;
    }
    
    // Get connection details
    for (const [sessionId, info] of this.connections) {
      if (info.isActive) {
        stats.connectionDetails.push({
          sessionId,
          cardToken: info.cardToken,
          connectedAt: info.connectedAt,
          lastActivity: info.lastActivity
        });
      }
    }
    
    return stats;
  }
  
  /**
   * Format transaction data into AI-consumable alert structure
   * @param {Object} transactionData - Raw transaction data
   * @returns {Object} Formatted alert for AI consumption
   */
  formatTransactionAlert(transactionData) {
    try {
      // Calculate amount with proper fallbacks for both Lithic raw data and parsed data
      let rawAmount = 0;
      
      // Try multiple sources for amount data
      if (transactionData.cardholder_amount !== undefined) {
        // Already parsed transaction data
        rawAmount = transactionData.cardholder_amount;
      } else if (transactionData.merchant_amount !== undefined) {
        rawAmount = transactionData.merchant_amount;
      } else if (transactionData.amount !== undefined) {
        // Direct amount field
        rawAmount = transactionData.amount;
      } else if (transactionData.events && transactionData.events[0]?.amounts?.cardholder?.amount !== undefined) {
        // Lithic raw transaction structure
        rawAmount = transactionData.events[0].amounts.cardholder.amount;
      } else if (transactionData.events && transactionData.events[0]?.amounts?.merchant?.amount !== undefined) {
        rawAmount = transactionData.events[0].amounts.merchant.amount;
      }
      
      const formattedAmount = typeof rawAmount === 'number' && !isNaN(rawAmount) 
        ? `$${(rawAmount / 100).toFixed(2)}`
        : '$0.00';

      const alert = {
        alertType: 'NEW_TRANSACTION',
        timestamp: new Date().toISOString(),
        transactionId: transactionData.token || transactionData.id,
        cardToken: transactionData.card_token,
        immediate: {
          amount: formattedAmount,
          merchant: transactionData.merchant?.descriptor || 'Unknown Merchant',
          location: this.formatLocation(transactionData.merchant),
          status: transactionData.status || transactionData.events?.[0]?.result || 'PENDING',
          network: transactionData.network || 'UNKNOWN',
          networkTransactionId: transactionData.network_transaction_id || 
                                 transactionData.events?.[0]?.network_info?.visa?.transaction_id ||
                                 transactionData.events?.[0]?.network_info?.mastercard?.transaction_id ||
                                 ''
        },
        verification: {
          mccCode: transactionData.merchant?.mcc || '',
          merchantType: transactionData.merchant_info?.mcc_description || 'Unknown',
          merchantCategory: transactionData.merchant_info?.mcc_category || 'Unknown',
          authorizationCode: transactionData.authorization_code || '',
          retrievalReference: transactionData.acquirer_reference_number || 
                             transactionData.events?.[0]?.network_info?.acquirer?.retrieval_reference_number ||
                             ''
        },
        intelligence: {
          isFirstTransaction: transactionData.isFirstTransaction || false,
          merchantHistory: transactionData.merchantHistory || 'New merchant for this card',
          geographicPattern: transactionData.geographicPattern || 'New location for this card'
        }
      };

      logger.debug({
        rawAmount,
        formattedAmount,
        transactionId: transactionData.token || transactionData.id,
        hasEvents: !!transactionData.events,
        eventCount: transactionData.events?.length || 0,
        merchantDescriptor: transactionData.merchant?.descriptor,
        status: transactionData.status,
        network: transactionData.network
      }, 'Formatted transaction alert - debug data');
      
      return alert;
    } catch (error) {
      logger.error({
        error: error.message,
        transactionId: transactionData?.id
      }, 'Failed to format transaction alert');
      throw error;
    }
  }
  
  /**
   * Send alert to a specific connection
   * @private
   * @param {Object} connection - Connection object
   * @param {Object} alert - Formatted alert data
   */
  async sendAlert(connection, alert) {
    // For SSE connections
    if (connection.write) {
      const data = `data: ${JSON.stringify(alert)}\n\n`;
      connection.write(data);
      return;
    }
    
    // For WebSocket connections
    if (connection.send) {
      connection.send(JSON.stringify(alert));
      return;
    }
    
    throw new Error('Unknown connection type');
  }
  
  /**
   * Queue message for failed delivery retry
   * @private
   * @param {string} sessionId - Session ID
   * @param {Object} message - Message to queue
   */
  queueMessage(sessionId, message) {
    if (!this.messageQueue.has(sessionId)) {
      this.messageQueue.set(sessionId, []);
    }
    
    const queue = this.messageQueue.get(sessionId);
    
    // Limit queue size to prevent memory issues
    if (queue.length < 10) {
      queue.push({
        message,
        queuedAt: new Date(),
        attempts: 0
      });
    }
  }
  
  /**
   * Format location string from merchant data
   * @private
   * @param {Object} merchant - Merchant object
   * @returns {string} Formatted location
   */
  formatLocation(merchant) {
    if (!merchant) return 'Unknown Location';
    
    const parts = [];
    if (merchant.city) parts.push(merchant.city);
    if (merchant.state) parts.push(merchant.state);
    if (merchant.country) parts.push(merchant.country);
    
    return parts.join(', ') || 'Unknown Location';
  }
  
  /**
   * Start health check interval
   * @private
   */
  startHealthCheck() {
    // Check connection health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 30000);
  }
  
  /**
   * Check health of all connections
   * @private
   */
  checkConnectionHealth() {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [sessionId, info] of this.connections) {
      const timeSinceActivity = now - info.lastActivity;
      
      if (timeSinceActivity > staleThreshold) {
        logger.warn({
          sessionId,
          lastActivity: info.lastActivity,
          minutesInactive: Math.floor(timeSinceActivity / 60000)
        }, 'Removing stale connection');
        
        this.removeConnection(sessionId);
      }
    }
    
    // Retry queued messages
    this.retryQueuedMessages();
  }
  
  /**
   * Retry delivery of queued messages
   * @private
   */
  async retryQueuedMessages() {
    for (const [sessionId, queue] of this.messageQueue) {
      const connectionInfo = this.connections.get(sessionId);
      if (!connectionInfo || !connectionInfo.isActive) {
        continue;
      }
      
      const messagesToRetry = [...queue];
      queue.length = 0; // Clear queue
      
      for (const item of messagesToRetry) {
        try {
          await this.sendAlert(connectionInfo.connection, item.message);
          logger.info({ sessionId }, 'Successfully delivered queued message');
        } catch (error) {
          item.attempts++;
          if (item.attempts < 3) {
            queue.push(item);
          } else {
            logger.error({
              sessionId,
              attempts: item.attempts
            }, 'Failed to deliver queued message after max attempts');
          }
        }
      }
    }
  }
  
  /**
   * Queue alerts for relevant polling subscriptions
   * @param {string} cardToken - Card token that triggered the alert
   * @param {Object} alert - Formatted alert data
   */
  queueAlertsForPolling(cardToken, alert) {
    try {
      let queuedCount = 0;
      
      for (const [subscriptionId, subscription] of pollingService.subscriptions) {
        if (!subscription.isActive) continue;
        
        const shouldReceive = this.shouldReceiveAlert(subscription, cardToken, alert);
        if (shouldReceive) {
          const success = pollingService.queueAlert(subscriptionId, alert);
          if (success) {
            queuedCount++;
          }
        }
      }
      
      if (queuedCount > 0) {
        logger.debug({ 
          cardToken, 
          alertType: alert.alertType,
          queuedCount,
          totalSubscriptions: pollingService.subscriptions.size
        }, 'Alert queued for polling subscriptions');
      }
    } catch (error) {
      logger.error({ 
        error: error.message, 
        cardToken, 
        alertType: alert?.alertType 
      }, 'Error queuing alerts for polling');
      throw error;
    }
  }
  
  /**
   * Determine if a subscription should receive an alert
   * @param {Object} subscription - Subscription configuration
   * @param {string} cardToken - Card token that triggered the alert
   * @param {Object} alert - Alert data
   * @returns {boolean} Whether subscription should receive alert
   */
  shouldReceiveAlert(subscription, cardToken, alert) {
    try {
      // Check card filter - if cardTokens array is empty, receive all cards
      if (subscription.cardTokens && subscription.cardTokens.length > 0) {
        if (!subscription.cardTokens.includes(cardToken)) {
          return false;
        }
      }
      
      // Check alert type filter
      if (subscription.alertTypes && subscription.alertTypes.length > 0) {
        if (!subscription.alertTypes.includes(alert.alertType)) {
          return false;
        }
      }
      
      // Check risk threshold (if applicable and alert has risk score)
      if (subscription.riskThreshold && alert.riskScore !== undefined) {
        if (alert.riskScore < subscription.riskThreshold) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      logger.error({ 
        error: error.message, 
        subscriptionId: subscription.subscriptionId,
        cardToken,
        alertType: alert?.alertType 
      }, 'Error checking if subscription should receive alert');
      return false;
    }
  }

  /**
   * Get service metrics including polling integration stats
   * @returns {Object} Current service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queuedMessages: Array.from(this.messageQueue.values())
        .reduce((sum, queue) => sum + queue.length, 0),
      pollingIntegration: {
        activeSubscriptions: pollingService.subscriptions.size,
        totalQueuedAlerts: pollingService.getMetrics().totalQueuedAlerts
      }
    };
  }
  
  /**
   * Shutdown service gracefully
   */
  shutdown() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Close all connections
    for (const sessionId of this.connections.keys()) {
      this.removeConnection(sessionId);
    }
    
    logger.info('Alert service shutdown complete');
  }
}

// Export singleton instance
const alertService = new AlertService();
export default alertService; 