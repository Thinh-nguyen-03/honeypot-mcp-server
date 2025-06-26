/**
 * Real-time Intelligence Tool Schemas
 * MCP tool definitions for real-time fraud monitoring and AI-assisted verification
 * 
 * Uses: alertService.js and reportingService.js for real-time business logic
 */

export const subscribeToAlertsSchema = {
  name: "subscribe_to_alerts",
  description: "Subscribe to real-time transaction alerts and fraud notifications (MCP-adapted)",
  inputSchema: {
    type: "object",
    properties: {
      cardTokens: {
        type: "array",
        items: {
          type: "string",
          pattern: "^card_[a-zA-Z0-9]+$"
        },
        description: "Specific cards to monitor (empty for all cards)",
        maxItems: 50
      },
      alertTypes: {
        type: "array",
        items: {
          type: "string",
          enum: ["fraud_detected", "high_risk_transaction", "unusual_pattern", "merchant_alert", "velocity_breach"]
        },
        description: "Types of alerts to subscribe to",
        default: ["fraud_detected", "high_risk_transaction"]
      },
      riskThreshold: {
        type: "number",
        description: "Minimum risk score for alerts (0-1)",
        minimum: 0,
        maximum: 1,
        default: 0.7
      },
      includeContext: {
        type: "boolean",
        description: "Include transaction context in alerts",
        default: true
      },
      maxAlertsPerMinute: {
        type: "number",
        description: "Rate limiting for alert volume",
        minimum: 1,
        maximum: 100,
        default: 10
      },
      subscriptionDuration: {
        type: "string",
        enum: ["1h", "4h", "12h", "24h"],
        description: "How long to maintain subscription",
        default: "4h"
      }
    },
    additionalProperties: false
  }
};

export const getLiveTransactionFeedSchema = {
  name: "get_live_transaction_feed",
  description: "Access live transaction data stream for AI agent monitoring",
  inputSchema: {
    type: "object",
    properties: {
      cardTokenFilter: {
        type: "array",
        items: {
          type: "string",
          pattern: "^card_[a-zA-Z0-9]+$"
        },
        description: "Filter for specific cards (empty for all)",
        maxItems: 20
      },
      includeRealTimeAnalysis: {
        type: "boolean",
        description: "Include real-time fraud analysis with each transaction",
        default: true
      },
      transactionTypes: {
        type: "array",
        items: {
          type: "string",
          enum: ["authorization", "settlement", "decline", "reversal"]
        },
        description: "Transaction types to include in feed",
        default: ["authorization", "settlement"]
      },
      feedDuration: {
        type: "string",
        enum: ["5m", "15m", "30m", "1h"],
        description: "Duration to maintain live feed",
        default: "15m"
      },
      maxTransactionsPerMinute: {
        type: "number",
        description: "Rate limiting for transaction volume",
        minimum: 1,
        maximum: 50,
        default: 20
      },
      includeMetadata: {
        type: "boolean",
        description: "Include enhanced transaction metadata",
        default: true
      }
    },
    additionalProperties: false
  }
};

// Export all real-time intelligence tool schemas (2 remaining after cleanup)
export const realtimeIntelligenceToolSchemas = [
  subscribeToAlertsSchema,
  getLiveTransactionFeedSchema
]; 