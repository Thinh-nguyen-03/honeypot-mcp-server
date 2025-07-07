/**
 * Polling Tool Schemas - MCP tool definitions for real-time alert polling
 * 
 * These schemas define the MCP tool interfaces for AI agents to poll for alerts
 * and check subscription status. They specify input validation, parameter types,
 * and tool descriptions following JSON Schema standards.
 * 
 * Tools defined:
 * - poll_subscription_alerts: Poll an active alert subscription for new alerts
 * - get_subscription_status: Get status and metadata for an alert subscription
 * - poll_live_feed: Poll a live transaction feed (future enhancement)
 */

/**
 * Poll Subscription Alerts Tool Schema
 * 
 * Enables AI agents to poll an active alert subscription for new transaction alerts.
 * Uses a consume pattern - retrieved alerts are removed from the queue.
 */
export const pollSubscriptionAlertsSchema = {
  name: "poll_subscription_alerts",
  description: "Poll an active alert subscription for new transaction alerts. Retrieved alerts are removed from the queue (consume pattern). Essential for real-time fraud monitoring by AI agents.",
  inputSchema: {
    type: "object",
    properties: {
      subscriptionId: {
        type: "string",
        description: "Subscription ID returned by subscribe_to_alerts tool",
        pattern: "^alert_sub_[0-9]+_[a-zA-Z0-9]+$",
        minLength: 20,
        maxLength: 100
      },
      maxAlerts: {
        type: "number",
        description: "Maximum number of alerts to return in single poll (default: 50)",
        minimum: 1,
        maximum: 100,
        default: 50
      }
    },
    required: ["subscriptionId"],
    additionalProperties: false,
    examples: [
      {
        subscriptionId: "alert_sub_1703123456789_abc123def456",
        maxAlerts: 25
      },
      {
        subscriptionId: "alert_sub_1703123456789_xyz789uvw012"
      }
    ]
  }
};

/**
 * Get Subscription Status Tool Schema
 * 
 * Enables AI agents to check the health, configuration, and activity metrics
 * of an active alert subscription for monitoring and debugging purposes.
 */
export const getSubscriptionStatusSchema = {
  name: "get_subscription_status", 
  description: "Get comprehensive status, health metrics, and configuration details for an active alert subscription. Useful for monitoring subscription health and debugging polling issues.",
  inputSchema: {
    type: "object",
    properties: {
      subscriptionId: {
        type: "string",
        description: "Subscription ID to check status for",
        pattern: "^alert_sub_[0-9]+_[a-zA-Z0-9]+$",
        minLength: 20,
        maxLength: 100
      },
      includeQueueSample: {
        type: "boolean",
        description: "Include sample of recent alerts in queue (default: true)",
        default: true
      }
    },
    required: ["subscriptionId"],
    additionalProperties: false,
    examples: [
      {
        subscriptionId: "alert_sub_1703123456789_abc123def456",
        includeQueueSample: true
      },
      {
        subscriptionId: "alert_sub_1703123456789_xyz789uvw012",
        includeQueueSample: false
      }
    ]
  }
};

/**
 * Poll Live Feed Tool Schema (Future Enhancement)
 * 
 * Placeholder schema for future live transaction feed polling capability.
 * This will enable AI agents to poll real-time transaction streams.
 */
export const pollLiveFeedSchema = {
  name: "poll_live_feed",
  description: "Poll a live transaction feed for new transactions. [FUTURE ENHANCEMENT - Currently returns not implemented message]",
  inputSchema: {
    type: "object",
    properties: {
      feedId: {
        type: "string",
        description: "Feed ID returned by get_live_transaction_feed tool",
        pattern: "^feed_[0-9]+_[a-zA-Z0-9]+$",
        minLength: 15,
        maxLength: 80
      },
      maxTransactions: {
        type: "number",
        description: "Maximum number of transactions to return (default: 20)",
        minimum: 1,
        maximum: 50,
        default: 20
      },
      includeMetadata: {
        type: "boolean",
        description: "Include transaction metadata and enrichment data",
        default: true
      }
    },
    required: ["feedId"],
    additionalProperties: false,
    examples: [
      {
        feedId: "feed_1703123456789_live_001",
        maxTransactions: 10,
        includeMetadata: true
      }
    ]
  }
};

/**
 * Get Polling Metrics Tool Schema
 * 
 * Administrative tool for monitoring overall polling service health and performance.
 * Useful for system administrators and monitoring systems.
 */
export const getPollingMetricsSchema = {
  name: "get_polling_metrics",
  description: "Get comprehensive metrics and health information about the polling service. Includes active subscription counts, queue sizes, memory usage, and performance statistics.",
  inputSchema: {
    type: "object",
    properties: {
      includeSubscriptionDetails: {
        type: "boolean",
        description: "Include detailed information about each active subscription",
        default: false
      },
      format: {
        type: "string",
        enum: ["summary", "detailed", "json"],
        description: "Output format for metrics report",
        default: "summary"
      }
    },
    additionalProperties: false,
    examples: [
      {
        includeSubscriptionDetails: true,
        format: "detailed"
      },
      {
        format: "summary"
      }
    ]
  }
};

/**
 * Array of all polling tool schemas for easy import
 * Used by the MCP server for tool registration and discovery
 */
export const pollingToolSchemas = [
  pollSubscriptionAlertsSchema,
  getSubscriptionStatusSchema,
  pollLiveFeedSchema,
  getPollingMetricsSchema
];

/**
 * Tool category metadata for documentation and organization
 */
export const pollingToolCategory = {
  category: "real-time-polling",
  description: "Tools for real-time alert polling and subscription management",
  version: "1.0.0",
  tools: pollingToolSchemas.map(schema => schema.name),
  dependencies: [
    "polling-service",
    "alert-service"
  ],
  performance: {
    expectedResponseTime: "< 200ms",
    maxConcurrentPolls: 100,
    queueSizeLimit: 1000
  }
};

/**
 * Validation patterns used across polling schemas
 */
export const pollingValidationPatterns = {
  subscriptionId: "^alert_sub_[0-9]+_[a-zA-Z0-9]+$",
  feedId: "^feed_[0-9]+_[a-zA-Z0-9]+$",
  sessionId: "^session_[0-9]+_[a-zA-Z0-9]+$"
};

/**
 * Default parameter values for polling tools
 */
export const pollingDefaults = {
  maxAlerts: 50,
  maxTransactions: 20,
  includeMetadata: true,
  includeQueueSample: true,
  format: "summary"
};

/**
 * Tool usage examples for documentation and testing
 */
export const pollingExamples = {
  basicPolling: {
    tool: "poll_subscription_alerts",
    args: {
      subscriptionId: "alert_sub_1703123456789_example123"
    },
    description: "Basic alert polling with default settings"
  },
  limitedPolling: {
    tool: "poll_subscription_alerts", 
    args: {
      subscriptionId: "alert_sub_1703123456789_example123",
      maxAlerts: 10
    },
    description: "Limited alert polling with custom max alerts"
  },
  statusCheck: {
    tool: "get_subscription_status",
    args: {
      subscriptionId: "alert_sub_1703123456789_example123",
      includeQueueSample: true
    },
    description: "Check subscription status with queue sample"
  },
  metricsOverview: {
    tool: "get_polling_metrics",
    args: {
      format: "detailed",
      includeSubscriptionDetails: false
    },
    description: "Get detailed polling service metrics"
  }
};