/**
 * Transaction Query Tool Schemas
 * MCP tool definitions for transaction query operations
 * 
 * Uses existing reporting and supabase services for business logic
 */

export const getTransactionSchema = {
  name: "get_transaction",
  description: "Retrieve single transaction by ID",
  inputSchema: {
    type: "object",
    properties: {
      transactionToken: {
        type: "string",
        description: "Lithic transaction token",
        pattern: "^txn_[a-zA-Z0-9]+$"
      },
      includeMetadata: {
        type: "boolean",
        description: "Include fraud analysis metadata",
        default: true
      }
    },
    required: ["transactionToken"],
    additionalProperties: false
  }
};

export const searchTransactionsSchema = {
  name: "search_transactions",
  description: "Advanced transaction search with multiple filters",
  inputSchema: {
    type: "object",
    properties: {
      cardToken: {
        type: "string",
        description: "Filter by specific card token",
        pattern: "^card_[a-zA-Z0-9]+$"
      },
      startDate: {
        type: "string",
        format: "date-time",
        description: "Search from this date (ISO 8601)"
      },
      endDate: {
        type: "string", 
        format: "date-time",
        description: "Search until this date (ISO 8601)"
      },
      merchantName: {
        type: "string",
        description: "Merchant name or descriptor"
      },
      amountRange: {
        type: "object",
        properties: {
          min: { 
            type: "number",
            description: "Minimum amount in cents"
          },
          max: { 
            type: "number",
            description: "Maximum amount in cents"
          }
        },
        additionalProperties: false
      },
      status: {
        type: "array",
        items: {
          type: "string",
          enum: ["PENDING", "SETTLED", "DECLINED"]
        },
        description: "Transaction status filter"
      },
      limit: {
        type: "number",
        description: "Maximum number of transactions to return",
        default: 50,
        maximum: 200
      },
      sortBy: {
        type: "string",
        enum: ["created", "amount", "merchant"],
        default: "created"
      },
      sortOrder: {
        type: "string",
        enum: ["asc", "desc"],
        default: "desc"
      }
    },
    additionalProperties: false
  }
};

export const getRecentTransactionsSchema = {
  name: "get_recent_transactions",
  description: "Get latest transactions for specific card",
  inputSchema: {
    type: "object",
    properties: {
      cardToken: {
        type: "string",
        description: "Lithic card token",
        pattern: "^card_[a-zA-Z0-9]+$"
      },
      limit: {
        type: "number",
        description: "Maximum number of transactions",
        default: 20,
        maximum: 100
      },
      includeFraudAnalysis: {
        type: "boolean",
        description: "Include fraud analysis data",
        default: true
      }
    },
    required: ["cardToken"],
    additionalProperties: false
  }
};

export const getTransactionsByMerchantSchema = {
  name: "get_transactions_by_merchant",
  description: "Get all transactions for specific merchant",
  inputSchema: {
    type: "object",
    properties: {
      merchantDescriptor: {
        type: "string",
        description: "Merchant name or descriptor"
      },
      timeframe: {
        type: "string",
        enum: ["24h", "7d", "30d", "90d"],
        description: "Time window for search",
        default: "30d"
      },
      includeAnalytics: {
        type: "boolean",
        description: "Include merchant analytics and patterns",
        default: true
      },
      limit: {
        type: "number",
        description: "Maximum number of transactions",
        default: 50,
        maximum: 200
      }
    },
    required: ["merchantDescriptor"],
    additionalProperties: false
  }
};

export const getTransactionDetailsSchema = {
  name: "get_transaction_details",
  description: "Comprehensive transaction analysis with fraud indicators",
  inputSchema: {
    type: "object",
    properties: {
      transactionToken: {
        type: "string",
        description: "Lithic transaction token",
        pattern: "^txn_[a-zA-Z0-9]+$"
      },
      analysisLevel: {
        type: "string",
        enum: ["basic", "standard", "comprehensive"],
        description: "Depth of fraud analysis to perform",
        default: "standard"
      },
      includeRiskFactors: {
        type: "boolean",
        description: "Include detailed risk factor analysis",
        default: true
      },
      includeMerchantIntel: {
        type: "boolean",
        description: "Include merchant intelligence data",
        default: true
      }
    },
    required: ["transactionToken"],
    additionalProperties: false
  }
};

// Export all transaction tool schemas
export const transactionToolSchemas = [
  getTransactionSchema,
  searchTransactionsSchema,
  getRecentTransactionsSchema,
  getTransactionsByMerchantSchema,
  getTransactionDetailsSchema
]; 