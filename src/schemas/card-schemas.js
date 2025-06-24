/**
 * Card Management Tool Schemas
 * MCP tool definitions for card management operations
 * 
 * SECURITY CRITICAL: Some tools handle sensitive PAN data
 */

export const listAvailableCardsSchema = {
  name: "list_available_cards",
  description: "Get available honeypot cards for scammer testing scenarios",
  inputSchema: {
    type: "object",
    properties: {
      includeDetails: {
        type: "boolean",
        description: "Include additional card metadata",
        default: false
      },
      activeOnly: {
        type: "boolean", 
        description: "Filter for only active cards",
        default: true
      },
      limit: {
        type: "number",
        description: "Maximum number of cards to return",
        default: 20,
        maximum: 100
      }
    },
    additionalProperties: false
  }
};

export const getCardDetailsSchema = {
  name: "get_card_details",
  description: "Get full card information including PAN for verified scammer scenarios",
  inputSchema: {
    type: "object",
    properties: {
      cardToken: {
        type: "string",
        description: "Lithic card token (UUID format)",
        pattern: "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$"
      },
      includePan: {
        type: "boolean",
        description: "Include full PAN (requires verification)",
        default: false
      },
      reason: {
        type: "string",
        description: "Reason for PAN access",
        enum: ["scammer_verification", "fraud_investigation", "testing"]
      }
    },
    required: ["cardToken"],
    additionalProperties: false
  }
};

export const createHoneypotCardSchema = {
  name: "create_honeypot_card",
  description: "Create new honeypot card for scammer scenarios",
  inputSchema: {
    type: "object",
    properties: {
      spendLimit: {
        type: "number",
        description: "Spending limit in cents",
        default: 50000,
        maximum: 100000
      },
      spendLimitDuration: {
        type: "string",
        enum: ["DAILY", "WEEKLY", "MONTHLY"],
        default: "MONTHLY"
      },
      memo: {
        type: "string",
        description: "Card purpose description",
        default: "Honeypot card for fraud detection"
      },
      metadata: {
        type: "object",
        properties: {
          purpose: { type: "string" },
          region: { type: "string" },
          campaign: { type: "string" }
        },
        additionalProperties: false
      }
    },
    additionalProperties: false
  }
};

export const updateCardLimitsSchema = {
  name: "update_card_limits",
  description: "Dynamically adjust card spending limits",
  inputSchema: {
    type: "object",
    properties: {
      cardToken: {
        type: "string",
        description: "Lithic card token (UUID format)",
        pattern: "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$"
      },
      spendLimit: {
        type: "number",
        description: "New spending limit in cents"
      },
      spendLimitDuration: {
        type: "string",
        enum: ["DAILY", "WEEKLY", "MONTHLY"]
      }
    },
    required: ["cardToken"],
    additionalProperties: false
  }
};

export const toggleCardStateSchema = {
  name: "toggle_card_state",
  description: "Activate or deactivate honeypot cards",
  inputSchema: {
    type: "object",
    properties: {
      cardToken: {
        type: "string",
        description: "Lithic card token (UUID format)",
        pattern: "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$"
      },
      state: {
        type: "string",
        enum: ["ACTIVE", "PAUSED"],
        description: "Desired card state"
      },
      reason: {
        type: "string",
        description: "Reason for state change"
      }
    },
    required: ["cardToken", "state"],
    additionalProperties: false
  }
};

// Export all card tool schemas
export const cardToolSchemas = [
  listAvailableCardsSchema,
  getCardDetailsSchema,
  createHoneypotCardSchema,
  updateCardLimitsSchema,
  toggleCardStateSchema
]; 