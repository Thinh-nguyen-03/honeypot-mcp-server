/**
 * Unit Tests - Polling Service
 * 
 * Comprehensive test suite for the polling service functionality including
 * subscription management, alert queuing, polling operations, and cleanup.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import pollingService from '../../../src/services/polling-service.js';

describe('PollingService', () => {
  beforeEach(() => {
    // Clear any existing state before each test
    pollingService.subscriptions.clear();
    pollingService.alertQueues.clear();
    pollingService.feeds.clear();
  });

  afterEach(() => {
    // Clean up after each test
    pollingService.subscriptions.clear();
    pollingService.alertQueues.clear();
    pollingService.feeds.clear();
  });

  describe('Subscription Management', () => {
    test('should store subscription correctly', () => {
      const config = {
        cardTokens: ['card_123'],
        alertTypes: ['fraud_detected'],
        riskThreshold: 0.8,
        duration: '1h'
      };

      const result = pollingService.storeSubscription('sub_123', config);

      expect(pollingService.subscriptions.has('sub_123')).toBe(true);
      expect(pollingService.alertQueues.has('sub_123')).toBe(true);
      expect(result.isActive).toBe(true);
      expect(result.subscriptionId).toBe('sub_123');
      expect(result.cardTokens).toEqual(['card_123']);
      expect(result.alertTypes).toEqual(['fraud_detected']);
      expect(result.riskThreshold).toBe(0.8);
    });

    test('should handle subscription creation with empty arrays', () => {
      const config = {
        cardTokens: [],
        alertTypes: [],
        duration: '2h'
      };

      const result = pollingService.storeSubscription('sub_empty', config);

      expect(result.isActive).toBe(true);
      expect(result.cardTokens).toEqual([]);
      expect(result.alertTypes).toEqual([]);
    });

    test('should create expiration time correctly', () => {
      const config = {
        cardTokens: ['card_test'],
        alertTypes: ['fraud_detected'],
        duration: '30m'
      };

      const beforeCreate = new Date();
      const result = pollingService.storeSubscription('sub_expiry', config);
      const afterCreate = new Date();

      const expectedExpiry = new Date(beforeCreate.getTime() + 30 * 60 * 1000);
      const actualExpiry = new Date(result.expiresAt);

      // Allow for small timing differences (within 1 second)
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000);
      expect(actualExpiry > afterCreate).toBe(true);
    });
  });

  describe('Alert Queuing', () => {
    beforeEach(() => {
      // Set up a test subscription
      pollingService.storeSubscription('sub_test', {
        cardTokens: ['card_123'],
        alertTypes: ['fraud_detected'],
        duration: '1h'
      });
    });

    test('should queue alert correctly', () => {
      const alert = { 
        alertType: 'fraud_detected', 
        transactionId: 'txn_123',
        amount: '$100',
        riskScore: 0.9
      };

      const result = pollingService.queueAlert('sub_test', alert);

      expect(result).toBe(true);
      const queue = pollingService.alertQueues.get('sub_test');
      expect(queue).toHaveLength(1);
      expect(queue[0].alertType).toBe('fraud_detected');
      expect(queue[0].transactionId).toBe('txn_123');
      expect(queue[0].queuedAt).toBeDefined();
      expect(queue[0].subscriptionId).toBe('sub_test');
    });

    test('should handle multiple alerts in queue', () => {
      const alerts = [
        { alertType: 'fraud_detected', transactionId: 'txn_1', riskScore: 0.8 },
        { alertType: 'high_risk_transaction', transactionId: 'txn_2', riskScore: 0.7 },
        { alertType: 'fraud_detected', transactionId: 'txn_3', riskScore: 0.9 }
      ];

      alerts.forEach(alert => {
        pollingService.queueAlert('sub_test', alert);
      });

      const queue = pollingService.alertQueues.get('sub_test');
      expect(queue).toHaveLength(3);
      expect(queue[0].transactionId).toBe('txn_1');
      expect(queue[1].transactionId).toBe('txn_2');
      expect(queue[2].transactionId).toBe('txn_3');
    });

    test('should reject alerts for non-existent subscription', () => {
      const alert = { alertType: 'fraud_detected', transactionId: 'txn_123' };

      const result = pollingService.queueAlert('sub_nonexistent', alert);

      expect(result).toBe(false);
    });

    test('should enforce queue size limit', () => {
      // Create many alerts to test the 1000 alert limit
      for (let i = 0; i < 1002; i++) {
        pollingService.queueAlert('sub_test', {
          alertType: 'fraud_detected',
          transactionId: `txn_${i}`,
          riskScore: 0.8
        });
      }

      const queue = pollingService.alertQueues.get('sub_test');
      expect(queue.length).toBe(1000); // Should be capped at 1000
      
      // First alerts should have been removed (oldest first)
      expect(queue[0].transactionId).toBe('txn_2'); // txn_0 and txn_1 should be removed
      expect(queue[999].transactionId).toBe('txn_1001');
    });
  });

  describe('Alert Polling', () => {
    beforeEach(() => {
      pollingService.storeSubscription('sub_polling', {
        cardTokens: ['card_test'],
        alertTypes: ['fraud_detected'],
        duration: '1h'
      });

      // Add some test alerts
      ['txn_1', 'txn_2', 'txn_3'].forEach(txnId => {
        pollingService.queueAlert('sub_polling', {
          alertType: 'fraud_detected',
          transactionId: txnId,
          riskScore: 0.8
        });
      });
    });

    test('should poll alerts correctly and clear queue', () => {
      const alerts = pollingService.pollAlerts('sub_polling');

      expect(alerts).toHaveLength(3);
      expect(alerts[0].transactionId).toBe('txn_1');
      expect(alerts[1].transactionId).toBe('txn_2');
      expect(alerts[2].transactionId).toBe('txn_3');

      // Queue should be empty after polling
      const emptyPoll = pollingService.pollAlerts('sub_polling');
      expect(emptyPoll).toHaveLength(0);
    });

    test('should respect maxAlerts parameter', () => {
      const alerts = pollingService.pollAlerts('sub_polling', 2);

      expect(alerts).toHaveLength(2);
      expect(alerts[0].transactionId).toBe('txn_1');
      expect(alerts[1].transactionId).toBe('txn_2');

      // One alert should remain in queue
      const remainingAlerts = pollingService.pollAlerts('sub_polling');
      expect(remainingAlerts).toHaveLength(1);
      expect(remainingAlerts[0].transactionId).toBe('txn_3');
    });

    test('should update subscription metadata after polling', () => {
      const beforePoll = pollingService.getSubscriptionStatus('sub_polling');
      expect(beforePoll.lastPolled).toBeNull();
      expect(beforePoll.pollCount).toBe(0);

      pollingService.pollAlerts('sub_polling');

      const afterPoll = pollingService.getSubscriptionStatus('sub_polling');
      expect(afterPoll.lastPolled).not.toBeNull();
      expect(afterPoll.pollCount).toBe(1);
    });

    test('should throw error for non-existent subscription', () => {
      expect(() => {
        pollingService.pollAlerts('sub_nonexistent');
      }).toThrow('Subscription sub_nonexistent not found');
    });
  });

  describe('Duration Parsing', () => {
    test('should parse duration strings correctly', () => {
      expect(pollingService.parseDuration('30m')).toBe(30 * 60 * 1000);
      expect(pollingService.parseDuration('2h')).toBe(2 * 60 * 60 * 1000);
      expect(pollingService.parseDuration('1d')).toBe(24 * 60 * 60 * 1000);
    });

    test('should handle invalid duration format', () => {
      // Should return default 4 hours for invalid format
      expect(pollingService.parseDuration('invalid')).toBe(4 * 60 * 60 * 1000);
      expect(pollingService.parseDuration('30s')).toBe(4 * 60 * 60 * 1000);
      expect(pollingService.parseDuration('')).toBe(4 * 60 * 60 * 1000);
    });

    test('should format duration correctly', () => {
      expect(pollingService.formatDuration(30 * 60 * 1000)).toBe('30m');
      expect(pollingService.formatDuration(2 * 60 * 60 * 1000)).toBe('2h 0m');
      expect(pollingService.formatDuration(25 * 60 * 60 * 1000)).toBe('1d 1h');
      expect(pollingService.formatDuration(0)).toBe('expired');
      expect(pollingService.formatDuration(-1000)).toBe('expired');
    });
  });

  describe('Subscription Status', () => {
    test('should get subscription status correctly', () => {
      pollingService.storeSubscription('sub_status', {
        cardTokens: ['card_test'],
        alertTypes: ['fraud_detected', 'high_risk_transaction'],
        riskThreshold: 0.8,
        duration: '2h'
      });

      const status = pollingService.getSubscriptionStatus('sub_status');

      expect(status.subscriptionId).toBe('sub_status');
      expect(status.isActive).toBe(true);
      expect(status.cardTokens).toEqual(['card_test']);
      expect(status.alertTypes).toEqual(['fraud_detected', 'high_risk_transaction']);
      expect(status.riskThreshold).toBe(0.8);
      expect(status.queuedAlerts).toBe(0);
      expect(status.timeRemaining).toBeGreaterThan(0);
      expect(status.isExpired).toBe(false);
    });

    test('should throw error for non-existent subscription status', () => {
      expect(() => {
        pollingService.getSubscriptionStatus('sub_nonexistent');
      }).toThrow('Subscription sub_nonexistent not found');
    });
  });

  describe('Cleanup Operations', () => {
    test('should clean up expired subscriptions', () => {
      // Create subscription with very short duration
      pollingService.storeSubscription('sub_expire', {
        cardTokens: ['card_test'],
        alertTypes: ['fraud_detected'],
        duration: '1m'
      });

      // Manually set expiration to past
      const subscription = pollingService.subscriptions.get('sub_expire');
      subscription.expiresAt = new Date(Date.now() - 1000); // 1 second ago

      expect(pollingService.subscriptions.has('sub_expire')).toBe(true);
      expect(pollingService.alertQueues.has('sub_expire')).toBe(true);

      // Run cleanup
      pollingService.cleanup();

      expect(pollingService.subscriptions.has('sub_expire')).toBe(false);
      expect(pollingService.alertQueues.has('sub_expire')).toBe(false);
    });

    test('should keep active subscriptions during cleanup', () => {
      pollingService.storeSubscription('sub_active', {
        cardTokens: ['card_test'],
        alertTypes: ['fraud_detected'],
        duration: '1h'
      });

      expect(pollingService.subscriptions.has('sub_active')).toBe(true);

      pollingService.cleanup();

      expect(pollingService.subscriptions.has('sub_active')).toBe(true);
    });
  });

  describe('Metrics', () => {
    test('should provide comprehensive metrics', () => {
      // Create test data
      pollingService.storeSubscription('sub_metrics1', {
        cardTokens: ['card_1'],
        alertTypes: ['fraud_detected'],
        duration: '1h'
      });
      
      pollingService.storeSubscription('sub_metrics2', {
        cardTokens: ['card_2'],
        alertTypes: ['high_risk_transaction'],
        duration: '2h'
      });

      pollingService.queueAlert('sub_metrics1', { alertType: 'fraud_detected', transactionId: 'txn_1' });
      pollingService.queueAlert('sub_metrics2', { alertType: 'high_risk_transaction', transactionId: 'txn_2' });

      const metrics = pollingService.getMetrics();

      expect(metrics.activeSubscriptions).toBe(2);
      expect(metrics.totalQueuedAlerts).toBe(2);
      expect(metrics.totalSubscriptions).toBe(2);
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(metrics.timestamp).toBeDefined();
    });
  });

  describe('Service Lifecycle', () => {
    test('should shutdown gracefully', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      pollingService.shutdown();

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});