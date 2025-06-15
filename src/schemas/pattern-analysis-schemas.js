/**
 * Pattern Analysis Tool Schemas
 * MCP tool definitions for advanced fraud detection and analysis operations
 * 
 * Uses: reportingService.js and mccService.js for sophisticated business logic
 */

export const analyzeTransactionPatternsSchema = {
  name: "analyze_transaction_patterns",
  description: "Detect behavioral patterns in transaction history for fraud analysis",
  inputSchema: {
    type: "object",
    properties: {
      cardToken: {
        type: "string",
        description: "Lithic card token to analyze",
        pattern: "^card_[a-zA-Z0-9]+$"
      },
      analysisWindow: {
        type: "string",
        enum: ["7d", "30d", "90d"],
        description: "Time window for pattern analysis",
        default: "30d"
      },
      patternTypes: {
        type: "array",
        items: {
          type: "string",
          enum: ["temporal", "merchant", "amount", "geographic"]
        },
        description: "Types of patterns to analyze",
        default: ["temporal", "merchant", "amount"]
      },
      includeAnomalies: {
        type: "boolean",
        description: "Include anomaly detection in analysis",
        default: true
      },
      confidenceThreshold: {
        type: "number",
        description: "Minimum confidence level for patterns (0-1)",
        minimum: 0,
        maximum: 1,
        default: 0.7
      }
    },
    required: ["cardToken"],
    additionalProperties: false
  }
};

export const detectFraudIndicatorsSchema = {
  name: "detect_fraud_indicators",
  description: "Automated fraud scoring and suspicious pattern identification",
  inputSchema: {
    type: "object",
    properties: {
      transactionToken: {
        type: "string",
        description: "Specific transaction to analyze",
        pattern: "^txn_[a-zA-Z0-9]+$"
      },
      cardToken: {
        type: "string",
        description: "Card to analyze (alternative to transaction)",
        pattern: "^card_[a-zA-Z0-9]+$"
      },
      analysisDepth: {
        type: "string",
        enum: ["quick", "standard", "comprehensive"],
        description: "Depth of fraud analysis",
        default: "standard"
      },
      riskThreshold: {
        type: "number",
        description: "Risk score threshold for flagging (0-1)",
        minimum: 0,
        maximum: 1,
        default: 0.8
      },
      includeMLModels: {
        type: "boolean",
        description: "Use machine learning fraud models",
        default: true
      },
      historicalContext: {
        type: "string",
        enum: ["7d", "30d", "90d", "all"],
        description: "Historical context for comparison",
        default: "30d"
      }
    },
    anyOf: [
      { required: ["transactionToken"] },
      { required: ["cardToken"] }
    ],
    additionalProperties: false
  }
};

export const generateMerchantIntelligenceSchema = {
  name: "generate_merchant_intelligence",
  description: "Merchant verification and intelligence data for fraud prevention",
  inputSchema: {
    type: "object",
    properties: {
      merchantDescriptor: {
        type: "string",
        description: "Merchant name or descriptor to analyze"
      },
      merchantId: {
        type: "string",
        description: "Specific merchant ID (alternative to descriptor)"
      },
      analysisType: {
        type: "string",
        enum: ["reputation", "risk_profile", "transaction_patterns", "comprehensive"],
        description: "Type of merchant analysis",
        default: "comprehensive"
      },
      timeframe: {
        type: "string",
        enum: ["7d", "30d", "90d", "180d", "1y"],
        description: "Analysis timeframe",
        default: "90d"
      },
      includeIndustryData: {
        type: "boolean",
        description: "Include industry comparison data",
        default: true
      },
      includeRiskFactors: {
        type: "boolean",
        description: "Include detailed risk factor analysis",
        default: true
      },
      includeGeographic: {
        type: "boolean",
        description: "Include geographic transaction patterns",
        default: true
      }
    },
    anyOf: [
      { required: ["merchantDescriptor"] },
      { required: ["merchantId"] }
    ],
    additionalProperties: false
  }
};

export const performRiskAssessmentSchema = {
  name: "perform_risk_assessment",
  description: "Comprehensive transaction and entity risk evaluation",
  inputSchema: {
    type: "object",
    properties: {
      entityType: {
        type: "string",
        enum: ["transaction", "card", "merchant", "pattern"],
        description: "Type of entity to assess"
      },
      entityId: {
        type: "string",
        description: "ID of the entity (transaction token, card token, etc.)"
      },
      assessmentType: {
        type: "string",
        enum: ["fraud", "credit", "operational", "comprehensive"],
        description: "Type of risk assessment",
        default: "fraud"
      },
      riskFactors: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "velocity", "amount_deviation", "merchant_risk", "geographic", 
            "temporal", "behavioral", "network", "device"
          ]
        },
        description: "Specific risk factors to evaluate",
        default: ["velocity", "amount_deviation", "merchant_risk", "behavioral"]
      },
      includeRecommendations: {
        type: "boolean",
        description: "Include risk mitigation recommendations",
        default: true
      },
      includePredictions: {
        type: "boolean", 
        description: "Include predictive risk modeling",
        default: true
      },
      confidenceLevel: {
        type: "number",
        description: "Required confidence level (0-1)",
        minimum: 0,
        maximum: 1,
        default: 0.85
      }
    },
    required: ["entityType", "entityId"],
    additionalProperties: false
  }
};

// Export all pattern analysis tool schemas
export const patternAnalysisToolSchemas = [
  analyzeTransactionPatternsSchema,
  detectFraudIndicatorsSchema,
  generateMerchantIntelligenceSchema,
  performRiskAssessmentSchema
]; 