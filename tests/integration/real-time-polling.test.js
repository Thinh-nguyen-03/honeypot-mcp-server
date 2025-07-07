/**
 * Integration Tests - Real-time Polling Workflow
 * 
 * End-to-end integration tests for the complete real-time polling system
 * including subscription creation, alert queuing, and polling operations.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createMcpTestClient } from '../helpers/test-helpers.js';
import pollingService from '../../src/services/polling-service.js';
import alertService from '../../src/services/alert-service.js';

describe('Real-time Polling Integration', () => {
  let client;

  beforeEach(async () => {
    // Create fresh MCP test client for each test
    client = await createMcpTestClient();
    
    // Clear polling service state
    pollingService.subscriptions.clear();
    pollingService.alertQueues.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    if (client && client.close) {
      await client.close();
    }
    pollingService.subscriptions.clear();
    pollingService.alertQueues.clear();
  });

  describe('Complete Subscription and Polling Workflow', () => {
    test('should create subscription and enable polling', async () => {
      // Step 1: Create subscription using MCP tool
      const subscription = await client.callTool({
        name: 'subscribe_to_alerts',
        arguments: {
          cardTokens: ['card_test_123'],
          alertTypes: ['fraud_detected', 'high_risk_transaction'],
          riskThreshold: 0.8,
          subscriptionDuration: '1h'
        }
      });

      expect(subscription).toBeDefined();
      expect(subscription.content).toBeDefined();
      expect(subscription.content[0].type).toBe('text');

      const subscriptionData = JSON.parse(subscription.content[0].text);
      expect(subscriptionData.alertSubscription).toBeDefined();
      
      const subscriptionId = subscriptionData.alertSubscription.subscriptionId;
      expect(subscriptionId).toMatch(/^alert_sub_\d+_[a-zA-Z0-9]+$/);
      expect(subscriptionData.alertSubscription.status).toBe('active');

      // Verify subscription is stored in polling service
      expect(pollingService.subscriptions.has(subscriptionId)).toBe(true);
      expect(pollingService.alertQueues.has(subscriptionId)).toBe(true);

      // Step 2: Check subscription status
      const status = await client.callTool({
        name: 'get_subscription_status',
        arguments: { subscriptionId }
      });

      const statusData = JSON.parse(status.content[0].text);
      expect(statusData.subscriptionStatus.isActive).toBe(true);
      expect(statusData.subscriptionStatus.queuedAlerts).toBe(0);
      expect(statusData.subscriptionStatus.configuration.alertTypes).toContain('fraud_detected');
      expect(statusData.subscriptionStatus.configuration.alertTypes).toContain('high_risk_transaction');
    });

    test('should poll empty subscription initially', async () => {
      // Create subscription
      const subscription = await client.callTool({
        name: 'subscribe_to_alerts',
        arguments: {
          cardTokens: ['card_test_456'],
          alertTypes: ['fraud_detected'],
          subscriptionDuration: '1h'
        }
      });

      const subscriptionData = JSON.parse(subscription.content[0].text);
      const subscriptionId = subscriptionData.alertSubscription.subscriptionId;

      // Poll for alerts (should be empty initially)
      const polling = await client.callTool({
        name: 'poll_subscription_alerts',
        arguments: { subscriptionId }
      });

      const pollingData = JSON.parse(polling.content[0].text);
      expect(pollingData.pollingResult.alertCount).toBe(0);
      expect(pollingData.pollingResult.alerts).toEqual([]);
      expect(pollingData.pollingResult.hasMoreAlerts).toBe(false);
      expect(pollingData.pollingResult.subscription.isActive).toBe(true);
    });

    test('should queue and poll alerts correctly', async () => {
      // Create subscription
      const subscription = await client.callTool({
        name: 'subscribe_to_alerts',
        arguments: {
          cardTokens: ['card_test_789'],
          alertTypes: ['fraud_detected'],
          subscriptionDuration: '1h'
        }
      });

      const subscriptionData = JSON.parse(subscription.content[0].text);
      const subscriptionId = subscriptionData.alertSubscription.subscriptionId;

      // Manually queue some test alerts (simulating real alerts)
      const testAlerts = [
        {
          alertType: 'fraud_detected',
          transactionId: 'txn_test_001',
          cardToken: 'card_test_789',
          amount: '$150.00',
          merchantName: 'Suspicious Merchant',
          riskScore: 0.9,
          timestamp: new Date().toISOString()
        },
        {
          alertType: 'fraud_detected',
          transactionId: 'txn_test_002',
          cardToken: 'card_test_789',
          amount: '$75.50',
          merchantName: 'Another Merchant',
          riskScore: 0.85,
          timestamp: new Date().toISOString()
        }
      ];

      testAlerts.forEach(alert => {
        pollingService.queueAlert(subscriptionId, alert);
      });

      // Poll for alerts
      const polling = await client.callTool({
        name: 'poll_subscription_alerts',
        arguments: { subscriptionId, maxAlerts: 10 }
      });

      const pollingData = JSON.parse(polling.content[0].text);
      expect(pollingData.pollingResult.alertCount).toBe(2);
      expect(pollingData.pollingResult.alerts).toHaveLength(2);
      expect(pollingData.pollingResult.alerts[0].transactionId).toBe('txn_test_001');
      expect(pollingData.pollingResult.alerts[1].transactionId).toBe('txn_test_002');
      expect(pollingData.pollingResult.hasMoreAlerts).toBe(false);

      // Queue should be empty after polling
      const emptyPoll = await client.callTool({
        name: 'poll_subscription_alerts',
        arguments: { subscriptionId }
      });

      const emptyPollingData = JSON.parse(emptyPoll.content[0].text);
      expect(emptyPollingData.pollingResult.alertCount).toBe(0);
    });

    test('should respect maxAlerts parameter', async () => {
      // Create subscription
      const subscription = await client.callTool({
        name: 'subscribe_to_alerts',
        arguments: {
          cardTokens: ['card_test_max'],
          alertTypes: ['fraud_detected'],
          subscriptionDuration: '1h'
        }
      });

      const subscriptionData = JSON.parse(subscription.content[0].text);
      const subscriptionId = subscriptionData.alertSubscription.subscriptionId;

      // Queue 5 test alerts
      for (let i = 1; i <= 5; i++) {
        pollingService.queueAlert(subscriptionId, {
          alertType: 'fraud_detected',
          transactionId: `txn_max_${i}`,
          cardToken: 'card_test_max',
          riskScore: 0.8
        });
      }

      // Poll with maxAlerts = 3
      const polling = await client.callTool({
        name: 'poll_subscription_alerts',
        arguments: { subscriptionId, maxAlerts: 3 }
      });

      const pollingData = JSON.parse(polling.content[0].text);
      expect(pollingData.pollingResult.alertCount).toBe(3);
      expect(pollingData.pollingResult.hasMoreAlerts).toBe(true);

      // Poll remaining alerts
      const remainingPoll = await client.callTool({
        name: 'poll_subscription_alerts',
        arguments: { subscriptionId }
      });

      const remainingData = JSON.parse(remainingPoll.content[0].text);
      expect(remainingData.pollingResult.alertCount).toBe(2);
      expect(remainingData.pollingResult.hasMoreAlerts).toBe(false);
    });
  });

  describe('Alert Service Integration', () => {
    test('should automatically queue alerts for matching subscriptions', async () => {
      // Create subscription with specific card token
      const subscription = await client.callTool({
        name: 'subscribe_to_alerts',
        arguments: {
          cardTokens: ['card_integration_test'],
          alertTypes: ['fraud_detected'],
          riskThreshold: 0.7,
          subscriptionDuration: '1h'
        }
      });

      const subscriptionData = JSON.parse(subscription.content[0].text);
      const subscriptionId = subscriptionData.alertSubscription.subscriptionId;

      // Simulate alert broadcast (this should queue the alert for our subscription)
      const testAlert = {
        alertType: 'fraud_detected',
        transactionId: 'txn_integration_001',
        cardToken: 'card_integration_test',
        amount: '$200.00',
        riskScore: 0.85,
        timestamp: new Date().toISOString()
      };

      // Use alert service to broadcast (this should trigger queuing)
      alertService.queueAlertsForPolling('card_integration_test', testAlert);

      // Poll for alerts
      const polling = await client.callTool({
        name: 'poll_subscription_alerts',
        arguments: { subscriptionId }
      });

      const pollingData = JSON.parse(polling.content[0].text);
      expect(pollingData.pollingResult.alertCount).toBe(1);
      expect(pollingData.pollingResult.alerts[0].transactionId).toBe('txn_integration_001');
      expect(pollingData.pollingResult.alerts[0].alertType).toBe('fraud_detected');
    });

    test('should filter alerts based on subscription criteria', async () => {
      // Create subscription with specific filters
      const subscription = await client.callTool({
        name: 'subscribe_to_alerts',
        arguments: {
          cardTokens: ['card_filter_test'],
          alertTypes: ['fraud_detected'], // Only fraud alerts
          riskThreshold: 0.8, // High risk only
          subscriptionDuration: '1h'
        }
      });

      const subscriptionData = JSON.parse(subscription.content[0].text);
      const subscriptionId = subscriptionData.alertSubscription.subscriptionId;

      // Test alerts with different criteria
      const testAlerts = [
        {
          alertType: 'fraud_detected',
          riskScore: 0.9, // Should match (fraud + high risk)
          transactionId: 'txn_match_1'
        },
        {
          alertType: 'high_risk_transaction',
          riskScore: 0.9, // Should NOT match (not fraud alert)
          transactionId: 'txn_no_match_1'
        },
        {
          alertType: 'fraud_detected',
          riskScore: 0.6, // Should NOT match (low risk)
          transactionId: 'txn_no_match_2'
        },
        {
          alertType: 'fraud_detected',
          riskScore: 0.85, // Should match (fraud + high risk)
          transactionId: 'txn_match_2'
        }
      ];

      // Queue all alerts through alert service
      testAlerts.forEach(alert => {
        alertService.queueAlertsForPolling('card_filter_test', {
          ...alert,
          cardToken: 'card_filter_test',
          timestamp: new Date().toISOString()
        });
      });

      // Poll for alerts
      const polling = await client.callTool({
        name: 'poll_subscription_alerts',
        arguments: { subscriptionId }
      });

      const pollingData = JSON.parse(polling.content[0].text);
      expect(pollingData.pollingResult.alertCount).toBe(2); // Only matching alerts
      
      const alertIds = pollingData.pollingResult.alerts.map(a => a.transactionId);
      expect(alertIds).toContain('txn_match_1');
      expect(alertIds).toContain('txn_match_2');
      expect(alertIds).not.toContain('txn_no_match_1');
      expect(alertIds).not.toContain('txn_no_match_2');
    });
  });

  describe('Error Handling', () => {
    test('should handle polling non-existent subscription', async () => {
      try {
        await client.callTool({
          name: 'poll_subscription_alerts',
          arguments: { subscriptionId: 'alert_sub_nonexistent_123' }
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('poll_subscription_alerts');
        expect(error.message).toContain('failed');
      }
    });

    test('should handle status check for non-existent subscription', async () => {
      try {
        await client.callTool({
          name: 'get_subscription_status',
          arguments: { subscriptionId: 'alert_sub_nonexistent_456' }
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('get_subscription_status');
        expect(error.message).toContain('failed');
      }
    });

    test('should validate polling parameters', async () => {
      try {
        await client.callTool({
          name: 'poll_subscription_alerts',
          arguments: { maxAlerts: 150 } // Missing subscriptionId, maxAlerts too high
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('poll_subscription_alerts');
      }
    });
  });

  describe('Performance and Metrics', () => {
    test('should provide polling metrics', async () => {
      // Create some test data
      await client.callTool({
        name: 'subscribe_to_alerts',
        arguments: {
          cardTokens: ['card_metrics_1'],
          alertTypes: ['fraud_detected'],
          subscriptionDuration: '1h'
        }
      });

      await client.callTool({
        name: 'subscribe_to_alerts',
        arguments: {
          cardTokens: ['card_metrics_2'],
          alertTypes: ['high_risk_transaction'],
          subscriptionDuration: '2h'
        }
      });

      const metrics = await client.callTool({
        name: 'get_polling_metrics',
        arguments: { format: 'detailed' }
      });

      const metricsData = JSON.parse(metrics.content[0].text);
      expect(metricsData.pollingMetrics.overview.activeSubscriptions).toBe(2);
      expect(metricsData.pollingMetrics.performance).toBeDefined();
      expect(metricsData.pollingMetrics.performance.memoryUsage).toBeDefined();
      expect(metricsData.pollingMetrics.performance.responseTimeMs).toBeDefined();
    });

    test('should maintain fast response times', async () => {
      // Create subscription
      const subscription = await client.callTool({
        name: 'subscribe_to_alerts',
        arguments: {
          cardTokens: ['card_perf_test'],
          alertTypes: ['fraud_detected'],
          subscriptionDuration: '1h'
        }
      });

      const subscriptionData = JSON.parse(subscription.content[0].text);
      const subscriptionId = subscriptionData.alertSubscription.subscriptionId;

      // Add many alerts to test performance
      for (let i = 0; i < 100; i++) {
        pollingService.queueAlert(subscriptionId, {
          alertType: 'fraud_detected',
          transactionId: `txn_perf_${i}`,
          riskScore: 0.8
        });
      }

      const startTime = Date.now();
      
      const polling = await client.callTool({
        name: 'poll_subscription_alerts',
        arguments: { subscriptionId, maxAlerts: 50 }
      });

      const responseTime = Date.now() - startTime;
      
      // Response should be fast (under 200ms as per requirements)
      expect(responseTime).toBeLessThan(200);

      const pollingData = JSON.parse(polling.content[0].text);
      expect(pollingData.pollingResult.alertCount).toBe(50);
      expect(pollingData.pollingResult.hasMoreAlerts).toBe(true);
    });
  });
});