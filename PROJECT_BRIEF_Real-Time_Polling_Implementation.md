# Project Brief: Real-Time Transaction Polling Implementation

---

## 🎯 Executive Summary & Business Impact

### Why This Matters to Our Business

Hey there! I'm assigning you a critical feature enhancement that will significantly improve our fraud detection capabilities. Currently, our Honeypot MCP Server can detect fraudulent transactions, but AI agents have no way to continuously monitor for them in real-time. This creates a gap where fraud could occur and go unnoticed for minutes or hours.

**The Problem:**
- AI agents can subscribe to alerts, but can't actually poll for new ones
- No real-time monitoring capability for immediate fraud response
- Agents must repeatedly call setup tools instead of efficient polling
- Missing critical infrastructure for proactive fraud prevention

**Business Impact:**
- **Potential fraud losses** prevented through faster detection
- **Enhanced customer trust** through real-time protection
- **Competitive advantage** - industry-leading fraud response times
- **Improved AI agent efficiency** - better user experience

**Your Mission:**
Build a robust polling system that enables AI agents to continuously monitor for fraudulent transactions and respond within seconds of detection.

---

## 📚 Technical Background & Learning Objectives

### Current Architecture Understanding

Before we dive in, let's make sure you understand our current system:

**Existing MCP Tools:**
- `subscribe_to_alerts` - Creates alert subscriptions (returns polling endpoint)
- `get_live_transaction_feed` - Establishes transaction feeds (returns connection info)

**Key Services:**
- `alertService.broadcastAlert()` - Automatically triggered when transactions occur
- `StreamableHTTP transport` - Handles MCP communication between clients and server

**The Critical Gap:**
We return polling endpoints but have no MCP tools to actually poll them! It's like giving someone a phone number but no phone to call it.

---

## 🏗️ Architecture Overview

### Design Philosophy

We're following the **"Extend, Don't Replace"** principle. Instead of rebuilding our alert system, we're enhancing it with polling capabilities. This is a common pattern in software engineering - build on proven foundations rather than starting from scratch.

### New Components You'll Build

```
┌─────────────────────────────────────────────────────────────┐
│                    HONEYPOT MCP SERVER                     │
├─────────────────────────────────────────────────────────────┤
│  📱 NEW MCP TOOLS (You'll implement these)                │
│   ├── poll_subscription_alerts                             │
│   ├── get_subscription_status                              │
│   └── poll_live_feed                                       │
├─────────────────────────────────────────────────────────────┤
│  🔧 ENHANCED SERVICES (You'll modify these)               │
│   ├── polling-service.js (NEW)                             │
│   ├── alert-service.js (ENHANCED)                          │
│   └── subscription-manager.js (NEW)                        │
├─────────────────────────────────────────────────────────────┤
│  💾 DATA FLOW (You'll design this)                        │
│   ├── In-Memory Subscription Storage                       │
│   ├── Alert Queue Management                               │
│   └── Automatic Cleanup & Expiration                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Design (Critical to Understand)

**Before Your Changes:**
1. AI Agent calls `subscribe_to_alerts` → Gets polling endpoint
2. AI Agent has no way to actually poll → **STUCK HERE**

**After Your Implementation:**
1. AI Agent calls `subscribe_to_alerts` → Gets subscriptionId
2. Server stores subscription state in memory
3. AI Agent calls `poll_subscription_alerts(subscriptionId)` → Gets queued alerts
4. Server automatically queues new alerts as transactions occur
5. Subscription expires after duration with automatic cleanup

---

## 🛠️ Detailed Implementation Guide

### Phase 1: Foundation - Polling Service (Week 1, Days 1-2)

**Learning Focus:** State management and service architecture patterns

**File to Create:** `src/services/polling-service.js`

This service will be the heart of your implementation. It manages subscription lifecycles and alert queues.

**Key Concepts to Understand:**
- **Map Data Structures**: We use `Map<subscriptionId, subscriptionData>` for O(1) lookups
- **Event Emitters**: Extends EventEmitter for loose coupling with other services
- **Cleanup Intervals**: Automatic background processes to prevent memory leaks
- **Duration Parsing**: Converting human-readable durations like "4h" to milliseconds

```javascript
/**
 * Junior Developer Note: This service follows the Singleton pattern - 
 * we export a single instance that's shared across the application.
 * This ensures all parts of the app see the same subscription state.
 */
import EventEmitter from 'events';
import logger from '../utils/logger.js';

class PollingService extends EventEmitter {
  constructor() {
    super();
    
    // These Maps store our application state in memory
    // In a larger system, you might use Redis or a database
    this.subscriptions = new Map();      // subscription metadata
    this.alertQueues = new Map();        // alerts waiting to be polled
    this.feeds = new Map();              // live feed state
    
    // Cleanup runs every minute to remove expired subscriptions
    // This prevents memory leaks in production
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    
    logger.info('PollingService initialized');
  }

  storeSubscription(subscriptionId, config) {
    const expirationMs = this.parseDuration(config.duration);
    
    const subscriptionData = {
      ...config,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expirationMs),
      lastPolled: null,
      isActive: true
    };
    
    this.subscriptions.set(subscriptionId, subscriptionData);
    this.alertQueues.set(subscriptionId, []);
    
    logger.info({ subscriptionId, expiresIn: `${expirationMs/1000/60} minutes` }, 'Subscription stored');
    return subscriptionData;
  }

  queueAlert(subscriptionId, alert) {
    const queue = this.alertQueues.get(subscriptionId);
    if (!queue) {
      logger.warn({ subscriptionId }, 'Attempted to queue alert for non-existent subscription');
      return false;
    }

    const queuedAlert = { ...alert, queuedAt: new Date().toISOString() };
    queue.push(queuedAlert);
    
    // Implement queue size limit to prevent memory issues
    if (queue.length > 1000) {
      queue.shift(); // Remove oldest alert
      logger.warn({ subscriptionId }, 'Alert queue at capacity, removing oldest alert');
    }
    
    logger.debug({ subscriptionId, queueSize: queue.length, alertType: alert.alertType }, 'Alert queued');
    return true;
  }

  pollAlerts(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }
    
    if (!subscription.isActive) {
      throw new Error(`Subscription ${subscriptionId} is inactive`);
    }

    const queue = this.alertQueues.get(subscriptionId) || [];
    const alerts = [...queue]; // Create copy before clearing
    
    // Clear queue after polling (consume pattern)
    this.alertQueues.set(subscriptionId, []);
    subscription.lastPolled = new Date();
    
    logger.info({ subscriptionId, alertCount: alerts.length, lastPolled: subscription.lastPolled }, 'Alerts polled and queue cleared');
    return alerts;
  }

  cleanup() {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [id, subscription] of this.subscriptions) {
      if (subscription.expiresAt < now) {
        this.subscriptions.delete(id);
        this.alertQueues.delete(id);
        cleanedCount++;
        logger.info({ subscriptionId: id }, 'Expired subscription cleaned up');
      }
    }
    
    if (cleanedCount > 0) {
      logger.info({ cleanedCount }, 'Cleanup completed');
    }
  }

  parseDuration(duration) {
    const units = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    const match = duration.match(/^(\d+)([mhd])$/);
    if (!match) {
      logger.warn({ duration }, 'Invalid duration format, using default 4h');
      return 4 * 60 * 60 * 1000; // Default 4 hours
    }
    
    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  getSubscriptionStatus(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }
    return subscription;
  }

  getQueueSize(subscriptionId) {
    const queue = this.alertQueues.get(subscriptionId);
    return queue ? queue.length : 0;
  }

  getMetrics() {
    const totalQueuedAlerts = Array.from(this.alertQueues.values())
      .reduce((sum, queue) => sum + queue.length, 0);
    
    return {
      activeSubscriptions: this.subscriptions.size,
      totalQueuedAlerts,
      memoryUsage: process.memoryUsage()
    };
  }

  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    logger.info('PollingService shutdown complete');
  }
}

export default new PollingService();
```

### Phase 2: MCP Tool Handlers (Week 1, Days 3-4)

**File to Create:** `src/handlers/polling-handlers.js`

```javascript
import pollingService from '../services/polling-service.js';
import logger from '../utils/logger.js';

export async function handlePollSubscriptionAlerts(args, requestId) {
  try {
    logger.info({ requestId, subscriptionId: args?.subscriptionId }, 'MCP tool: poll_subscription_alerts called');
    
    if (!args?.subscriptionId) {
      throw new Error('subscriptionId is required');
    }

    const alerts = pollingService.pollAlerts(args.subscriptionId);
    
    const response = {
      content: [{
        type: "text",
        text: JSON.stringify({
          pollingResult: {
            subscriptionId: args.subscriptionId,
            alertCount: alerts.length,
            alerts: alerts,
            polledAt: new Date().toISOString(),
            hasMoreAlerts: false,
            performance: {
              responseTimeMs: Date.now() - extractTimestamp(requestId)
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
      alertCount: alerts.length,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: poll_subscription_alerts completed successfully');

    return response;

  } catch (error) {
    logger.error({ requestId, subscriptionId: args?.subscriptionId, error: error.message, stack: error.stack }, 'MCP tool error: poll_subscription_alerts');
    throw new Error(`Tool 'poll_subscription_alerts' failed: ${error.message}`);
  }
}

export async function handleGetSubscriptionStatus(args, requestId) {
  try {
    logger.info({ requestId, subscriptionId: args?.subscriptionId }, 'MCP tool: get_subscription_status called');
    
    if (!args?.subscriptionId) {
      throw new Error('subscriptionId is required');
    }

    const subscription = pollingService.getSubscriptionStatus(args.subscriptionId);
    const queueSize = pollingService.getQueueSize(args.subscriptionId);
    const now = new Date();
    
    const response = {
      content: [{
        type: "text", 
        text: JSON.stringify({
          subscriptionStatus: {
            subscriptionId: args.subscriptionId,
            isActive: subscription.isActive,
            createdAt: subscription.createdAt,
            expiresAt: subscription.expiresAt,
            lastPolled: subscription.lastPolled,
            queuedAlerts: queueSize,
            timeRemaining: Math.max(0, subscription.expiresAt - now),
            timeRemainingHuman: formatDuration(subscription.expiresAt - now),
            configuration: {
              cardTokens: subscription.cardTokens?.map(token => token.substring(0, 8) + '***'),
              alertTypes: subscription.alertTypes,
              riskThreshold: subscription.riskThreshold
            },
            health: {
              status: subscription.isActive && subscription.expiresAt > now ? 'healthy' : 'expired',
              lastActivity: subscription.lastPolled || subscription.createdAt
            }
          },
          metadata: {
            requestId,
            timestamp: new Date().toISOString()
          }
        }, null, 2)
      }]
    };

    return response;

  } catch (error) {
    logger.error({ requestId, subscriptionId: args?.subscriptionId, error: error.message }, 'MCP tool error: get_subscription_status');
    throw new Error(`Tool 'get_subscription_status' failed: ${error.message}`);
  }
}

function extractTimestamp(requestId) {
  if (!requestId || typeof requestId !== 'string') return Date.now();
  const match = requestId.match(/mcp_(\d+)_/);
  return match ? parseInt(match[1]) : Date.now();
}

function formatDuration(ms) {
  if (ms <= 0) return 'expired';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
```

### Phase 3: MCP Tool Schemas (Week 1, Day 5)

**File to Create:** `src/schemas/polling-schemas.js`

```javascript
export const pollSubscriptionAlertsSchema = {
  name: "poll_subscription_alerts",
  description: "Poll an active alert subscription for new transaction alerts",
  inputSchema: {
    type: "object",
    properties: {
      subscriptionId: {
        type: "string",
        description: "Subscription ID returned by subscribe_to_alerts",
        pattern: "^alert_sub_[0-9]+_[a-zA-Z0-9]+$"
      },
      maxAlerts: {
        type: "number",
        description: "Maximum number of alerts to return (default: 50)",
        minimum: 1,
        maximum: 100,
        default: 50
      }
    },
    required: ["subscriptionId"],
    additionalProperties: false
  }
};

export const getSubscriptionStatusSchema = {
  name: "get_subscription_status", 
  description: "Get status and metadata for an active alert subscription",
  inputSchema: {
    type: "object",
    properties: {
      subscriptionId: {
        type: "string",
        description: "Subscription ID to check status for",
        pattern: "^alert_sub_[0-9]+_[a-zA-Z0-9]+$"
      }
    },
    required: ["subscriptionId"],
    additionalProperties: false
  }
};

export const pollingToolSchemas = [
  pollSubscriptionAlertsSchema,
  getSubscriptionStatusSchema
];
```

### Phase 4: Integration (Week 2, Days 1-2)

**Modify:** `src/services/alert-service.js`

Add this to the existing `broadcastAlert` method:

```javascript
// Add import at top
import pollingService from './polling-service.js';

// Add to broadcastAlert method after existing code
async broadcastAlert(cardToken, alertData) {
  // ... existing code ...
  
  // NEW: Also queue alerts for polling subscriptions
  try {
    this.queueAlertsForPolling(cardToken, formattedAlert);
  } catch (pollingError) {
    logger.warn({ error: pollingError.message }, 'Failed to queue alert for polling');
  }
  
  return result;
}

// NEW: Queue alerts for relevant subscriptions
queueAlertsForPolling(cardToken, alert) {
  for (const [subscriptionId, subscription] of pollingService.subscriptions) {
    if (!subscription.isActive) continue;
    
    const shouldReceive = this.shouldReceiveAlert(subscription, cardToken, alert);
    if (shouldReceive) {
      pollingService.queueAlert(subscriptionId, alert);
    }
  }
}

// NEW: Determine if subscription should receive alert
shouldReceiveAlert(subscription, cardToken, alert) {
  // Check card filter
  if (subscription.cardTokens.length > 0 && !subscription.cardTokens.includes(cardToken)) {
    return false;
  }
  
  // Check alert type filter
  if (!subscription.alertTypes.includes(alert.alertType)) {
    return false;
  }
  
  // Check risk threshold (if applicable)
  if (alert.riskScore && alert.riskScore < subscription.riskThreshold) {
    return false;
  }
  
  return true;
}
```

**Modify:** `src/mcp-server.js`

Add imports and register new tools:

```javascript
// Add imports
import * as pollingHandlers from './handlers/polling-handlers.js';
import { pollingToolSchemas } from './schemas/polling-schemas.js';

// Update tool registration in createMcpServer()
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ... existing tools ...
      ...pollingToolSchemas
    ]
  };
});

// Add polling tool handlers in CallToolRequestSchema handler
case 'poll_subscription_alerts':
  return await pollingHandlers.handlePollSubscriptionAlerts(args, requestId);
case 'get_subscription_status':
  return await pollingHandlers.handleGetSubscriptionStatus(args, requestId);
```

**Modify:** `src/handlers/realtime-intelligence-handlers.js`

Update to integrate with polling service:

```javascript
// Add import
import pollingService from '../services/polling-service.js';

export async function handleSubscribeToAlerts(args, requestId) {
  try {
    // ... existing code to create subscription ...
    
    // NEW: Store subscription in polling service
    pollingService.storeSubscription(subscriptionId, {
      cardTokens: subscriptionParams.cardTokens,
      alertTypes: subscriptionParams.alertTypes,
      riskThreshold: subscriptionParams.riskThreshold,
      duration: subscriptionParams.subscriptionDuration
    });
    
    // ... rest of existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
}
```

---

## 🧪 Testing & Quality Assurance (Week 2, Days 3-4)

### Unit Tests

**File to Create:** `tests/unit/services/polling-service.test.js`

```javascript
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import pollingService from '../../../src/services/polling-service.js';

describe('PollingService', () => {
  beforeEach(() => {
    // Clear any existing state
    pollingService.subscriptions.clear();
    pollingService.alertQueues.clear();
  });

  test('should store subscription correctly', () => {
    const config = {
      cardTokens: ['card_123'],
      alertTypes: ['fraud_detected'],
      duration: '1h'
    };

    const result = pollingService.storeSubscription('sub_123', config);

    expect(pollingService.subscriptions.has('sub_123')).toBe(true);
    expect(pollingService.alertQueues.has('sub_123')).toBe(true);
    expect(result.isActive).toBe(true);
  });

  test('should queue and poll alerts correctly', () => {
    const subscriptionId = 'sub_test';
    const config = { cardTokens: [], alertTypes: ['fraud_detected'], duration: '1h' };
    
    pollingService.storeSubscription(subscriptionId, config);
    
    const alert = { alertType: 'fraud_detected', amount: '$100' };
    pollingService.queueAlert(subscriptionId, alert);
    
    const alerts = pollingService.pollAlerts(subscriptionId);
    
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertType).toBe('fraud_detected');
    
    // Queue should be empty after polling
    const emptyPoll = pollingService.pollAlerts(subscriptionId);
    expect(emptyPoll).toHaveLength(0);
  });

  test('should parse duration strings correctly', () => {
    expect(pollingService.parseDuration('30m')).toBe(30 * 60 * 1000);
    expect(pollingService.parseDuration('2h')).toBe(2 * 60 * 60 * 1000);
    expect(pollingService.parseDuration('1d')).toBe(24 * 60 * 60 * 1000);
  });
});
```

### Integration Tests

**File to Create:** `tests/integration/real-time-polling.test.js`

```javascript
import { describe, test, expect } from 'vitest';
import { createMcpTestClient } from '../helpers/test-helpers.js';

describe('Real-time Polling Integration', () => {
  test('Complete subscription and polling workflow', async () => {
    const client = await createMcpTestClient();

    // Step 1: Create subscription
    const subscription = await client.callTool({
      name: 'subscribe_to_alerts',
      arguments: {
        cardTokens: ['card_test_123'],
        alertTypes: ['fraud_detected'],
        subscriptionDuration: '1h'
      }
    });

    const subscriptionData = JSON.parse(subscription.content[0].text);
    const subscriptionId = subscriptionData.alertSubscription.subscriptionId;

    // Step 2: Check subscription status
    const status = await client.callTool({
      name: 'get_subscription_status',
      arguments: { subscriptionId }
    });

    const statusData = JSON.parse(status.content[0].text);
    expect(statusData.subscriptionStatus.isActive).toBe(true);

    // Step 3: Poll for alerts (should be empty initially)
    const polling = await client.callTool({
      name: 'poll_subscription_alerts', 
      arguments: { subscriptionId }
    });

    const pollingData = JSON.parse(polling.content[0].text);
    expect(pollingData.pollingResult.alertCount).toBe(0);
  });
});
```

---

## 🚀 Deployment & Monitoring (Week 2, Day 5)

### Health Check Integration

Add to existing health check in `src/handlers/card-handlers.js`:

```javascript
// Add polling metrics to health check
const pollingHealth = pollingService.getMetrics();

// Include in health response
pollingHealth: {
  activeSubscriptions: pollingHealth.activeSubscriptions,
  totalQueuedAlerts: pollingHealth.totalQueuedAlerts,
  memoryUsage: pollingHealth.memoryUsage.heapUsed
}
```

### Production Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] Code reviewed and approved
- [ ] Memory usage validated under load
- [ ] Error handling tested with invalid inputs
- [ ] Logging verified for debugging
- [ ] Documentation updated

### Performance Monitoring

Monitor these metrics in production:
- Response times for polling tools (target: <50ms)
- Memory usage of subscription storage
- Alert queue sizes
- Subscription cleanup frequency

---

## 📊 Success Criteria & Validation

### Definition of Done

Your implementation will be considered complete when:

1. **Functional Requirements:**
   - ✅ AI agents can poll active subscriptions for new alerts
   - ✅ Alert queues are properly managed and cleaned up
   - ✅ Subscription status can be checked and monitored
   - ✅ Performance maintains sub-200ms response times

2. **Quality Requirements:**
   - ✅ Unit tests cover all new functionality (>90% coverage)
   - ✅ Integration tests verify end-to-end workflow
   - ✅ Error handling is comprehensive and informative
   - ✅ Logging provides sufficient debugging information

3. **Production Requirements:**
   - ✅ Memory usage is efficient and bounded
   - ✅ Automatic cleanup prevents memory leaks
   - ✅ Health checks include polling service metrics
   - ✅ Documentation is updated and accurate

### Testing Your Implementation

Use this AI agent prompt to validate your work:

```
"Please set up real-time fraud monitoring:
1. Subscribe to alerts for card token 'card_test_123' 
2. Poll for new alerts every 30 seconds
3. Show me the subscription status
4. Alert me immediately of any suspicious activity"
```

Expected workflow:
1. Agent calls `subscribe_to_alerts` → Gets subscriptionId
2. Agent calls `poll_subscription_alerts` repeatedly → Gets queued alerts
3. Agent calls `get_subscription_status` → Shows subscription health
4. System automatically queues alerts as transactions occur

---

## Industry Best Practices

- **Single Responsibility Principle** - Each service has one clear purpose
- **Defensive Programming** - Always validate inputs and handle errors
- **Observability** - Comprehensive logging and metrics
- **Performance Awareness** - Sub-200ms response time requirements

---