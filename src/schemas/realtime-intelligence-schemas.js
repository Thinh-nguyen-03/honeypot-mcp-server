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

export const analyzeSpendingPatternsSchema = {
  name: "analyze_spending_patterns",
  description: "Real-time behavioral analysis and pattern recognition for fraud detection",
  inputSchema: {
    type: "object",
    properties: {
      cardToken: {
        type: "string",
        description: "Card to analyze spending patterns for",
        pattern: "^card_[a-zA-Z0-9]+$"
      },
      analysisType: {
        type: "string",
        enum: ["velocity", "merchant_patterns", "amount_patterns", "time_patterns", "comprehensive"],
        description: "Type of spending pattern analysis",
        default: "comprehensive"
      },
      timeWindow: {
        type: "string",
        enum: ["1h", "4h", "24h", "7d", "30d"],
        description: "Time window for pattern analysis",
        default: "24h"
      },
      includeBaseline: {
        type: "boolean",
        description: "Compare against historical baseline",
        default: true
      },
      deviationThreshold: {
        type: "number",
        description: "Threshold for flagging deviations (0-1)",
        minimum: 0,
        maximum: 1,
        default: 0.6
      },
      includePredictions: {
        type: "boolean",
        description: "Include predictive analysis and trends",
        default: true
      },
      realTimeMode: {
        type: "boolean",
        description: "Enable real-time continuous monitoring",
        default: false
      }
    },
    required: ["cardToken"],
    additionalProperties: false
  }
};

export const generateVerificationQuestionsSchema = {
  name: "generate_verification_questions",
  description: "AI-assisted generation of scammer verification questions based on transaction history",
  inputSchema: {
    type: "object",
    properties: {
      cardToken: {
        type: "string",
        description: "Card token for transaction history context",
        pattern: "^card_[a-zA-Z0-9]+$"
      },
      questionType: {
        type: "string",
        enum: ["transaction_specific", "merchant_based", "pattern_based", "mixed"],
        description: "Type of verification questions to generate",
        default: "mixed"
      },
      difficultyLevel: {
        type: "string",
        enum: ["easy", "medium", "hard"],
        description: "Difficulty level for questions",
        default: "medium"
      },
      questionCount: {
        type: "number",
        description: "Number of questions to generate",
        minimum: 1,
        maximum: 10,
        default: 5
      },
      timeframe: {
        type: "string",
        enum: ["24h", "7d", "30d", "90d"],
        description: "Transaction history timeframe for questions",
        default: "30d"
      },
      includeDecoys: {
        type: "boolean",
        description: "Include false options to make questions harder",
        default: true
      },
      contextualHints: {
        type: "boolean",
        description: "Provide hints based on legitimate user behavior",
        default: false
      },
      adaptToScammerTactics: {
        type: "boolean",
        description: "Adapt questions to counter known scammer tactics",
        default: true
      }
    },
    required: ["cardToken"],
    additionalProperties: false
  }
};

// Export all real-time intelligence tool schemas
export const realtimeIntelligenceToolSchemas = [
  subscribeToAlertsSchema,
  getLiveTransactionFeedSchema,
  analyzeSpendingPatternsSchema,
  generateVerificationQuestionsSchema
]; 