/**
 * Polling Service - Manages subscription lifecycles and alert queues for real-time polling
 * 
 * This service provides the foundation for AI agents to poll for alerts in real-time.
 * It manages subscription state in memory, queues alerts, and handles automatic cleanup.
 * 
 * Key Features:
 * - In-memory subscription storage with O(1) lookups
 * - Per-subscription alert queues with size limits
 * - Automatic cleanup of expired subscriptions
 * - Event emission for loose coupling
 * - Comprehensive metrics and monitoring
 */

import EventEmitter from 'events';
import logger from '../utils/logger.js';

class PollingService extends EventEmitter {
  constructor() {
    super();
    
    // Core state storage using Maps for performance
    // subscriptions: Map<subscriptionId, subscriptionData>
    this.subscriptions = new Map();
    
    // alertQueues: Map<subscriptionId, Array<alertData>>
    this.alertQueues = new Map();
    
    // feeds: Map<feedId, feedData> - for live transaction feeds
    this.feeds = new Map();
    
    // Performance metrics
    this.metrics = {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalAlertsQueued: 0,
      totalAlertsPolled: 0,
      averageQueueSize: 0,
      cleanupCycles: 0
    };
    
    // Cleanup runs every minute to remove expired subscriptions
    // This prevents memory leaks in production
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    
    logger.info('PollingService initialized successfully');
  }

  /**
   * Store a new subscription with configuration and expiration
   * @param {string} subscriptionId - Unique subscription identifier
   * @param {Object} config - Subscription configuration
   * @returns {Object} Stored subscription data
   */
  storeSubscription(subscriptionId, config) {
    try {
      const expirationMs = this.parseDuration(config.duration);
      const now = new Date();
      
      const subscriptionData = {
        ...config,
        subscriptionId,
        createdAt: now,
        expiresAt: new Date(now.getTime() + expirationMs),
        lastPolled: null,
        isActive: true,
        pollCount: 0,
        totalAlertsReceived: 0
      };
      
      // Store subscription and initialize empty alert queue
      this.subscriptions.set(subscriptionId, subscriptionData);
      this.alertQueues.set(subscriptionId, []);
      
      // Update metrics
      this.metrics.totalSubscriptions++;
      this.metrics.activeSubscriptions = this.subscriptions.size;
      
      logger.info({ 
        subscriptionId, 
        expiresIn: `${expirationMs/1000/60} minutes`,
        cardTokens: config.cardTokens?.length || 0,
        alertTypes: config.alertTypes?.length || 0
      }, 'Subscription stored successfully');
      
      // Emit event for monitoring
      this.emit('subscription:created', { subscriptionId, config: subscriptionData });
      
      return subscriptionData;
    } catch (error) {
      logger.error({ subscriptionId, error: error.message }, 'Failed to store subscription');
      throw new Error(`Failed to store subscription: ${error.message}`);
    }
  }

  /**
   * Queue an alert for a specific subscription
   * @param {string} subscriptionId - Target subscription
   * @param {Object} alert - Alert data to queue
   * @returns {boolean} Success status
   */
  queueAlert(subscriptionId, alert) {
    try {
      const queue = this.alertQueues.get(subscriptionId);
      if (!queue) {
        logger.warn({ subscriptionId, alertType: alert.alertType }, 'Attempted to queue alert for non-existent subscription');
        return false;
      }

      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription || !subscription.isActive) {
        logger.warn({ subscriptionId, alertType: alert.alertType }, 'Attempted to queue alert for inactive subscription');
        return false;
      }

      // Add queue metadata
      const queuedAlert = { 
        ...alert, 
        queuedAt: new Date().toISOString(),
        subscriptionId,
        queuePosition: queue.length + 1
      };
      
      queue.push(queuedAlert);
      
      // Implement queue size limit to prevent memory issues
      const maxQueueSize = 1000;
      if (queue.length > maxQueueSize) {
        const removedAlert = queue.shift();
        logger.warn({ 
          subscriptionId, 
          queueSize: queue.length,
          removedAlert: removedAlert.queuedAt 
        }, 'Alert queue at capacity, removing oldest alert');
      }
      
      // Update subscription metrics
      subscription.totalAlertsReceived++;
      this.metrics.totalAlertsQueued++;
      
      logger.debug({ 
        subscriptionId, 
        queueSize: queue.length, 
        alertType: alert.alertType,
        riskScore: alert.riskScore 
      }, 'Alert queued successfully');
      
      // Emit event for real-time monitoring
      this.emit('alert:queued', { subscriptionId, alert: queuedAlert, queueSize: queue.length });
      
      return true;
    } catch (error) {
      logger.error({ subscriptionId, alertType: alert?.alertType, error: error.message }, 'Failed to queue alert');
      return false;
    }
  }

  /**
   * Poll alerts for a subscription (consume pattern - clears queue)
   * @param {string} subscriptionId - Subscription to poll
   * @param {number} maxAlerts - Maximum alerts to return (default: 50)
   * @returns {Array} Array of queued alerts
   */
  pollAlerts(subscriptionId, maxAlerts = 50) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }
      
      if (!subscription.isActive) {
        throw new Error(`Subscription ${subscriptionId} is inactive`);
      }

      const now = new Date();
      if (subscription.expiresAt < now) {
        subscription.isActive = false;
        throw new Error(`Subscription ${subscriptionId} has expired`);
      }

      const queue = this.alertQueues.get(subscriptionId) || [];
      
      // Apply maxAlerts limit
      const alertsToReturn = queue.slice(0, maxAlerts);
      
      // Clear the consumed alerts from queue (consume pattern)
      this.alertQueues.set(subscriptionId, queue.slice(maxAlerts));
      
      // Update subscription metadata
      subscription.lastPolled = now;
      subscription.pollCount++;
      
      // Update metrics
      this.metrics.totalAlertsPolled += alertsToReturn.length;
      this.updateAverageQueueSize();
      
      logger.info({ 
        subscriptionId, 
        alertCount: alertsToReturn.length,
        remainingInQueue: queue.length - maxAlerts,
        lastPolled: subscription.lastPolled,
        pollCount: subscription.pollCount
      }, 'Alerts polled and queue updated');
      
      // Emit event for monitoring
      this.emit('subscription:polled', { 
        subscriptionId, 
        alertCount: alertsToReturn.length, 
        remainingInQueue: Math.max(0, queue.length - maxAlerts)
      });
      
      return alertsToReturn;
    } catch (error) {
      logger.error({ subscriptionId, error: error.message }, 'Failed to poll alerts');
      throw error;
    }
  }

  /**
   * Get detailed subscription status and metadata
   * @param {string} subscriptionId - Subscription to check
   * @returns {Object} Subscription status data
   */
  getSubscriptionStatus(subscriptionId) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      const queue = this.alertQueues.get(subscriptionId) || [];
      const now = new Date();
      
      return {
        ...subscription,
        queuedAlerts: queue.length,
        timeRemaining: Math.max(0, subscription.expiresAt.getTime() - now.getTime()),
        timeRemainingHuman: this.formatDuration(subscription.expiresAt.getTime() - now.getTime()),
        isExpired: subscription.expiresAt < now,
        queueSample: queue.slice(-3).map(alert => ({
          alertType: alert.alertType,
          queuedAt: alert.queuedAt,
          riskScore: alert.riskScore
        }))
      };
    } catch (error) {
      logger.error({ subscriptionId, error: error.message }, 'Failed to get subscription status');
      throw error;
    }
  }

  /**
   * Get queue size for a subscription
   * @param {string} subscriptionId - Subscription to check
   * @returns {number} Number of queued alerts
   */
  getQueueSize(subscriptionId) {
    const queue = this.alertQueues.get(subscriptionId);
    return queue ? queue.length : 0;
  }

  /**
   * Parse human-readable duration strings to milliseconds
   * @param {string} duration - Duration string (e.g., "4h", "30m", "1d")
   * @returns {number} Duration in milliseconds
   */
  parseDuration(duration) {
    const units = { 
      m: 60 * 1000, 
      h: 60 * 60 * 1000, 
      d: 24 * 60 * 60 * 1000 
    };
    
    const match = duration.match(/^(\d+)([mhd])$/);
    if (!match) {
      logger.warn({ duration }, 'Invalid duration format, using default 4h');
      return 4 * 60 * 60 * 1000; // Default 4 hours
    }
    
    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  /**
   * Format duration in milliseconds to human-readable string
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Human-readable duration
   */
  formatDuration(ms) {
    if (ms <= 0) return 'expired';
    
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }

  /**
   * Clean up expired subscriptions and update metrics
   */
  cleanup() {
    try {
      const now = new Date();
      let cleanedCount = 0;
      
      for (const [id, subscription] of this.subscriptions) {
        if (subscription.expiresAt < now) {
          this.subscriptions.delete(id);
          this.alertQueues.delete(id);
          cleanedCount++;
          
          logger.info({ 
            subscriptionId: id,
            lifespan: now.getTime() - subscription.createdAt.getTime(),
            totalAlertsReceived: subscription.totalAlertsReceived,
            pollCount: subscription.pollCount
          }, 'Expired subscription cleaned up');
          
          // Emit cleanup event
          this.emit('subscription:expired', { subscriptionId: id, subscription });
        }
      }
      
      // Update metrics
      this.metrics.activeSubscriptions = this.subscriptions.size;
      this.metrics.cleanupCycles++;
      this.updateAverageQueueSize();
      
      if (cleanedCount > 0) {
        logger.info({ 
          cleanedCount, 
          activeSubscriptions: this.metrics.activeSubscriptions,
          cleanupCycle: this.metrics.cleanupCycles
        }, 'Subscription cleanup completed');
      }
    } catch (error) {
      logger.error({ error: error.message }, 'Error during subscription cleanup');
    }
  }

  /**
   * Update average queue size metric
   */
  updateAverageQueueSize() {
    if (this.alertQueues.size === 0) {
      this.metrics.averageQueueSize = 0;
      return;
    }
    
    const totalQueueSize = Array.from(this.alertQueues.values())
      .reduce((sum, queue) => sum + queue.length, 0);
    
    this.metrics.averageQueueSize = totalQueueSize / this.alertQueues.size;
  }

  /**
   * Get comprehensive service metrics
   * @returns {Object} Service metrics and health data
   */
  getMetrics() {
    this.updateAverageQueueSize();
    
    const totalQueuedAlerts = Array.from(this.alertQueues.values())
      .reduce((sum, queue) => sum + queue.length, 0);
    
    return {
      ...this.metrics,
      activeSubscriptions: this.subscriptions.size,
      totalQueuedAlerts,
      memoryUsage: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Graceful shutdown - cleanup intervals and emit shutdown event
   */
  shutdown() {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      
      const finalMetrics = this.getMetrics();
      logger.info({ finalMetrics }, 'PollingService shutdown initiated');
      
      // Emit shutdown event for any listeners
      this.emit('service:shutdown', { metrics: finalMetrics });
      
      logger.info('PollingService shutdown complete');
    } catch (error) {
      logger.error({ error: error.message }, 'Error during PollingService shutdown');
    }
  }
}

// Export singleton instance
export default new PollingService();