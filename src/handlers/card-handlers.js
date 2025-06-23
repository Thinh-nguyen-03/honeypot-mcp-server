/**
 * Card Management Tool Handlers
 * 
 * CRITICAL: These handlers wrap existing business logic services.
 * NEVER modify the underlying service functions - only wrap them for MCP.
 * 
 * Security: Some handlers access sensitive PAN data - follow strict logging rules.
 */

import * as cardService from '../services/card-service.js';
import logger from '../utils/logger.js';

/**
 * List Available Cards Tool Handler
 * Implements: list_available_cards MCP tool
 * Uses: cardService.getAvailableCardsForMcp() - existing business logic
 */
export async function handleListAvailableCards(args, requestId) {
  try {
    logger.info({ requestId, args: sanitizeArgs(args) }, 'MCP tool: list_available_cards called');
    
    // Input validation - use existing service validation
    const params = {
      includeDetails: args?.includeDetails || false,
      activeOnly: args?.activeOnly !== false, // Default to true
      limit: Math.min(args?.limit || 20, 100) // Enforce maximum
    };
    
    // Call existing service function - ZERO business logic changes
    const result = await cardService.getAvailableCardsForMcp(params, requestId);
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            queryType: result.queryType || "available_cards_list",
            cardCount: result.cardCount || result.cards?.length || 0,
            cards: result.cards || [],
            timestamp: new Date().toISOString(),
            requestId
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      cardCount: result.cardCount || result.cards?.length || 0,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: list_available_cards completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      error: error.message, 
      stack: error.stack 
    }, 'MCP tool error: list_available_cards');
    
    throw formatMcpError(error, 'list_available_cards', requestId);
  }
}

/**
 * Get Card Details Tool Handler
 * Implements: get_card_details MCP tool
 * Uses: cardService.getCardDetailsForMcp() - existing business logic
 * 
 * SECURITY CRITICAL: Handles PAN data access
 */
export async function handleGetCardDetails(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args),
      panRequested: args?.includePan || false 
    }, 'MCP tool: get_card_details called');
    
    // Enhanced parameter extraction to handle both flat and nested structures
    let cardToken, includePan, reason;
    
    if (args?.cardToken) {
      // Handle nested structure: { cardToken: { cardToken: "uuid", includePan: true, reason: "uuid" } }
      if (typeof args.cardToken === 'object' && args.cardToken.cardToken) {
        cardToken = args.cardToken.cardToken;
        includePan = args.cardToken.includePan || args.includePan || false;
        reason = args.cardToken.reason || args.reason;
      } 
      // Handle flat structure: { cardToken: "uuid", includePan: true, reason: "uuid" }
      else if (typeof args.cardToken === 'string') {
        cardToken = args.cardToken;
        includePan = args.includePan || false;
        reason = args.reason;
      } else {
        throw new Error('cardToken must be a string or object with cardToken property');
      }
    } else {
      throw new Error('cardToken is required');
    }
    
    // Validate that we have a valid string cardToken
    if (!cardToken || typeof cardToken !== 'string') {
      throw new Error('Card token is required and must be a string');
    }
    
    // Security: Log PAN access attempts
    if (includePan) {
      logger.warn({ 
        requestId, 
        cardToken: maskCardToken(cardToken),
        reason: reason || 'not_specified'
      }, 'SECURITY: PAN access requested');
    }
    
    // Call existing service function - ZERO business logic changes
    const result = await cardService.getCardDetailsForMcp(cardToken, requestId, {
      includePan: includePan,
      reason: reason
    });
    
    // Format for MCP response (PAN already handled by service)
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ...result,
            timestamp: new Date().toISOString(),
            requestId
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      cardToken: maskCardToken(cardToken),
      panIncluded: !!result.pan,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: get_card_details completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      cardTokenInfo: args?.cardToken ? (typeof args.cardToken === 'string' ? maskCardToken(args.cardToken) : 'nested_object') : 'not_provided',
      error: error.message 
    }, 'MCP tool error: get_card_details');
    
    throw formatMcpError(error, 'get_card_details', requestId);
  }
}

/**
 * Create Honeypot Card Tool Handler
 * Implements: create_honeypot_card MCP tool
 * Uses: cardService.createHoneypotCard() - existing business logic
 */
export async function handleCreateHoneypotCard(args, requestId) {
  try {
    logger.info({ requestId, args: sanitizeArgs(args) }, 'MCP tool: create_honeypot_card called');
    
    // Fix memo parameter validation - ensure it's a string
    let memo = 'Honeypot card for fraud detection';
    if (args?.memo) {
      if (typeof args.memo === 'string') {
        memo = args.memo;
      } else if (typeof args.memo === 'object') {
        memo = JSON.stringify(args.memo);
      } else {
        memo = String(args.memo);
      }
    }
    
    // Prepare parameters for service call
    const params = {
      spendLimit: args?.spendLimit || 50000,
      spendLimitDuration: args?.spendLimitDuration || 'MONTHLY',
      memo: memo,
      metadata: args?.metadata || {}
    };
    
    // Call existing service function - ZERO business logic changes
    const result = await cardService.createHoneypotCard(params, requestId);
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            cardToken: result.token || result.cardToken,
            cardDetails: result,
            timestamp: new Date().toISOString(),
            requestId
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      cardToken: maskCardToken(result.token || result.cardToken),
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: create_honeypot_card completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      error: error.message, 
      stack: error.stack 
    }, 'MCP tool error: create_honeypot_card');
    
    throw formatMcpError(error, 'create_honeypot_card', requestId);
  }
}

/**
 * Update Card Limits Tool Handler
 * Implements: update_card_limits MCP tool
 * Uses: cardService.updateCardLimit() - existing business logic
 */
export async function handleUpdateCardLimits(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args) 
    }, 'MCP tool: update_card_limits called');
    
    // Enhanced parameter extraction to handle both flat and nested structures
    let cardToken, spendLimit, spendLimitDuration, singleUseLimit;
    
    if (args?.cardToken) {
      // Handle nested structure: { cardToken: { cardToken: "uuid", spendLimit: 1000, ... } }
      if (typeof args.cardToken === 'object' && args.cardToken.cardToken) {
        cardToken = args.cardToken.cardToken;
        spendLimit = args.cardToken.spendLimit || args.spendLimit;
        spendLimitDuration = args.cardToken.spendLimitDuration || args.spendLimitDuration;
        singleUseLimit = args.cardToken.singleUseLimit || args.singleUseLimit;
      } 
      // Handle flat structure: { cardToken: "uuid", spendLimit: 1000, ... }
      else if (typeof args.cardToken === 'string') {
        cardToken = args.cardToken;
        spendLimit = args.spendLimit;
        spendLimitDuration = args.spendLimitDuration;
        singleUseLimit = args.singleUseLimit;
      } else {
        throw new Error('cardToken must be a string or object with cardToken property');
      }
    } else {
      throw new Error('cardToken is required');
    }
    
    // Validate that we have a valid string cardToken
    if (!cardToken || typeof cardToken !== 'string') {
      throw new Error('Card token is required and must be a string');
    }
    
    // Prepare parameters for service call
    const params = {
      cardToken: cardToken,
      spendLimit: spendLimit,
      spendLimitDuration: spendLimitDuration,
      singleUseLimit: singleUseLimit
    };
    
    // Call existing service function - ZERO business logic changes
    const result = await cardService.updateCardLimit(params, requestId);
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            cardToken: maskCardToken(cardToken),
            updatedLimits: result,
            timestamp: new Date().toISOString(),
            requestId
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      cardToken: maskCardToken(cardToken),
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: update_card_limits completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      cardTokenInfo: args?.cardToken ? (typeof args.cardToken === 'string' ? maskCardToken(args.cardToken) : 'nested_object') : 'not_provided',
      error: error.message 
    }, 'MCP tool error: update_card_limits');
    
    throw formatMcpError(error, 'update_card_limits', requestId);
  }
}

/**
 * Toggle Card State Tool Handler
 * Implements: toggle_card_state MCP tool
 * Uses: cardService.toggleCardState() - existing business logic
 */
export async function handleToggleCardState(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args),
      cardToken: maskCardToken(args?.cardToken)
    }, 'MCP tool: toggle_card_state called');
    
    // Validate required parameters
    if (!args?.cardToken || !args?.state) {
      throw new Error('cardToken and state are required');
    }
    
    // Call existing service function - ZERO business logic changes
    const result = await cardService.toggleCardState({
      cardToken: args.cardToken,
      state: args.state,
      reason: args.reason
    }, requestId);
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            cardToken: args.cardToken,
            newState: args.state,
            result: result,
            timestamp: new Date().toISOString(),
            requestId
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      cardToken: maskCardToken(args.cardToken),
      newState: args.state,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: toggle_card_state completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      cardToken: args?.cardToken ? maskCardToken(args.cardToken) : 'not_provided',
      error: error.message 
    }, 'MCP tool error: toggle_card_state');
    
    throw formatMcpError(error, 'toggle_card_state', requestId);
  }
}

/**
 * Utility Functions
 */

/**
 * Sanitize arguments for logging (remove sensitive data)
 * CRITICAL: Never log PAN, CVV, or other sensitive financial data
 */
function sanitizeArgs(args) {
  if (!args || typeof args !== 'object') return args;
  
  const sanitized = { ...args };
  
  // Remove or mask sensitive fields
  if (sanitized.cardToken) {
    sanitized.cardToken = maskCardToken(sanitized.cardToken);
  }
  if (sanitized.pan) {
    sanitized.pan = '****-****-****-' + (sanitized.pan.slice(-4) || '****');
  }
  if (sanitized.cvv) {
    sanitized.cvv = '***';
  }
  
  return sanitized;
}

/**
 * Mask card token for logging
 */
function maskCardToken(token) {
  if (!token) return 'undefined';
  if (typeof token !== 'string') return String(token);
  if (token.length <= 8) return token;
  return `${token.substring(0, 8)}***`;
}

/**
 * Extract timestamp from requestId for performance measurement
 */
function extractTimestamp(requestId) {
  if (!requestId || typeof requestId !== 'string') return Date.now();
  const match = requestId.match(/mcp_(\d+)_/);
  return match ? parseInt(match[1]) : Date.now();
}

/**
 * Format error for MCP response
 */
function formatMcpError(error, toolName, requestId) {
  const mcpError = new Error(`Tool '${toolName}' failed: ${error.message}`);
  mcpError.toolName = toolName;
  mcpError.requestId = requestId;
  mcpError.originalError = error;
  return mcpError;
} 