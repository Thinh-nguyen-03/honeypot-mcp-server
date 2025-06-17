/**
 * Transaction Query Tool Handlers
 * 
 * CRITICAL: These handlers wrap existing business logic services.
 * NEVER modify the underlying service functions - only wrap them for MCP.
 * 
 * Uses: reportingService.js and supabaseService.js for business logic
 */

import * as supabaseService from '../services/supabase-service.js';
import * as reportingService from '../services/reporting-service.js';
import logger from '../utils/logger.js';

/**
 * Get Transaction Tool Handler
 * Implements: get_transaction MCP tool
 * Uses: supabaseService.getTransactionDetails() - existing business logic
 */
export async function handleGetTransaction(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args) 
    }, 'MCP tool: get_transaction called');
    
    // Validate required parameters
    if (!args?.transactionToken) {
      throw new Error('transactionToken is required');
    }
    
    // Call existing service function - ZERO business logic changes
    const result = await supabaseService.getTransactionDetails(args.transactionToken);
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            transaction: result,
            metadata: {
              includeMetadata: args.includeMetadata !== false,
              timestamp: new Date().toISOString(),
              requestId
            }
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      transactionToken: maskToken(args.transactionToken),
      found: !!result,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: get_transaction completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      transactionToken: args?.transactionToken ? maskToken(args.transactionToken) : 'not_provided',
      error: error.message 
    }, 'MCP tool error: get_transaction');
    
    throw formatMcpError(error, 'get_transaction', requestId);
  }
}

/**
 * Search Transactions Tool Handler
 * Implements: search_transactions MCP tool
 * Uses: reportingService.processTransactionSearchQuery() - existing business logic
 */
export async function handleSearchTransactions(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args) 
    }, 'MCP tool: search_transactions called');
    
    // Enhanced parameter extraction to handle both flat and nested structures
    let cardToken;
    
    if (args?.cardToken) {
      // Handle nested structure
      if (typeof args.cardToken === 'object' && args.cardToken.cardToken) {
        cardToken = args.cardToken.cardToken;
      } 
      // Handle flat structure
      else if (typeof args.cardToken === 'string') {
        cardToken = args.cardToken;
      } else {
        throw new Error('cardToken must be a string or object with cardToken property');
      }
    }
    
    // Validate cardToken if provided
    if (cardToken && typeof cardToken !== 'string') {
      throw new Error('cardToken must be a string');
    }
    
    // Build search query from parameters
    let searchQuery = '';
    const queryParts = [];
    
    if (args?.merchantName) queryParts.push(`merchant: ${args.merchantName}`);
    if (args?.amountRange) queryParts.push(`amount: ${args.amountRange.min}-${args.amountRange.max}`);
    if (args?.status) queryParts.push(`status: ${args.status}`);
    if (args?.startDate) queryParts.push(`after: ${args.startDate}`);
    if (args?.endDate) queryParts.push(`before: ${args.endDate}`);
    
    searchQuery = queryParts.join(' ') || 'recent transactions';
    
    // Call existing service function - ZERO business logic changes
    const result = await reportingService.processTransactionSearchQuery(
      searchQuery,
      Math.min(args?.limit || 50, 200),
      cardToken,
      requestId
    );
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            searchResults: {
              transactions: result.transactions || result,
              totalCount: result.totalCount || result.length || 0,
              searchQuery: searchQuery,
              searchParams: {
                ...sanitizeArgs(args),
                cardToken: cardToken ? maskToken(cardToken) : undefined
              }
            },
            metadata: {
              timestamp: new Date().toISOString(),
              requestId
            }
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      resultCount: result.totalCount || result.length || 0,
      cardToken: cardToken ? maskToken(cardToken) : 'all_cards',
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: search_transactions completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      cardTokenInfo: args?.cardToken ? (typeof args.cardToken === 'string' ? maskToken(args.cardToken) : 'nested_object') : 'not_provided',
      error: error.message, 
      stack: error.stack 
    }, 'MCP tool error: search_transactions');
    
    throw formatMcpError(error, 'search_transactions', requestId);
  }
}

/**
 * Get Recent Transactions Tool Handler
 * Implements: get_recent_transactions MCP tool
 * Uses: reportingService.getRecentTransactionsForAgent() - existing business logic
 */
export async function handleGetRecentTransactions(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args) 
    }, 'MCP tool: get_recent_transactions called');
    
    // Enhanced parameter extraction to handle both flat and nested structures
    let cardToken;
    
    if (args?.cardToken) {
      // Handle nested structure
      if (typeof args.cardToken === 'object' && args.cardToken.cardToken) {
        cardToken = args.cardToken.cardToken;
      } 
      // Handle flat structure
      else if (typeof args.cardToken === 'string') {
        cardToken = args.cardToken;
      } else {
        throw new Error('cardToken must be a string or object with cardToken property');
      }
    }
    
    // Validate cardToken if provided
    if (cardToken && typeof cardToken !== 'string') {
      throw new Error('cardToken must be a string');
    }
    
    // Use available method from reporting service with proper card filtering
    const limit = Math.min(args?.limit || 20, 100);
    const result = await reportingService.getRecentTransactionsForAgent(limit, cardToken);
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            recentTransactions: {
              cardToken: cardToken ? maskToken(cardToken) : 'all_cards',
              transactions: result,
              count: result?.length || 0,
              includeFraudAnalysis: args?.includeFraudAnalysis !== false,
              note: cardToken ? `Filtered for specific card: ${maskToken(cardToken)}` : 'Transactions from all cards'
            },
            metadata: {
              timestamp: new Date().toISOString(),
              requestId
            }
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      cardToken: cardToken ? maskToken(cardToken) : 'all_cards',
      transactionCount: result?.length || 0,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: get_recent_transactions completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      cardTokenInfo: args?.cardToken ? (typeof args.cardToken === 'string' ? maskToken(args.cardToken) : 'nested_object') : 'not_provided',
      error: error.message, 
      stack: error.stack 
    }, 'MCP tool error: get_recent_transactions');
    
    throw formatMcpError(error, 'get_recent_transactions', requestId);
  }
}

/**
 * Get Transactions by Merchant Tool Handler
 * Implements: get_transactions_by_merchant MCP tool
 * Uses: processTransactionSearchQuery() - existing business logic
 */
export async function handleGetTransactionsByMerchant(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args) 
    }, 'MCP tool: get_transactions_by_merchant called');
    
    // Validate required parameters
    if (!args?.merchantDescriptor) {
      throw new Error('merchantDescriptor is required');
    }
    
    // Enhanced parameter extraction to handle both flat and nested structures
    let cardToken;
    
    if (args?.cardToken) {
      // Handle nested structure
      if (typeof args.cardToken === 'object' && args.cardToken.cardToken) {
        cardToken = args.cardToken.cardToken;
      } 
      // Handle flat structure
      else if (typeof args.cardToken === 'string') {
        cardToken = args.cardToken;
      } else {
        throw new Error('cardToken must be a string or object with cardToken property');
      }
    }
    
    // Validate cardToken if provided
    if (cardToken && typeof cardToken !== 'string') {
      throw new Error('cardToken must be a string');
    }
    
    // Prepare parameters for search query
    const searchQuery = `merchant: ${args.merchantDescriptor}`;
    const limit = Math.min(args?.limit || 50, 200);
    
    // Use existing processTransactionSearchQuery method
    const result = await reportingService.processTransactionSearchQuery(
      searchQuery, 
      limit, 
      cardToken, 
      requestId
    );
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            merchantTransactions: {
              merchantDescriptor: args.merchantDescriptor,
              cardToken: cardToken ? maskToken(cardToken) : 'all_cards',
              timeframe: args?.timeframe || '30d',
              transactions: result.transactions || result,
              totalCount: result.totalCount || result.length || 0
            },
            metadata: {
              timestamp: new Date().toISOString(),
              requestId
            }
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      merchantDescriptor: args.merchantDescriptor,
      cardToken: cardToken ? maskToken(cardToken) : 'all_cards',
      transactionCount: result.totalCount || result.length || 0,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: get_transactions_by_merchant completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      merchantDescriptor: args?.merchantDescriptor || 'not_provided',
      cardTokenInfo: args?.cardToken ? (typeof args.cardToken === 'string' ? maskToken(args.cardToken) : 'nested_object') : 'not_provided',
      error: error.message 
    }, 'MCP tool error: get_transactions_by_merchant');
    
    throw formatMcpError(error, 'get_transactions_by_merchant', requestId);
  }
}

/**
 * Get Transaction Details Tool Handler
 * Implements: get_transaction_details MCP tool
 * Uses: supabaseService.getTransactionDetails() - existing business logic
 */
export async function handleGetTransactionDetails(args, requestId) {
  try {
    logger.info({ 
      requestId, 
      args: sanitizeArgs(args) 
    }, 'MCP tool: get_transaction_details called');
    
    // Validate required parameters
    if (!args?.transactionToken) {
      throw new Error('transactionToken is required');
    }
    
    // Get basic transaction data using existing method
    const transactionResult = await supabaseService.getTransactionDetails(
      args.transactionToken
    );
    
    if (!transactionResult) {
      throw new Error(`Transaction not found: ${args.transactionToken}`);
    }
    
    // Enhance with analysis (using available data)
    const analysis = {
      riskScore: calculateRiskScore(transactionResult),
      analysisLevel: args?.analysisLevel || 'standard',
      factors: extractRiskFactors(transactionResult),
      merchantInfo: {
        name: transactionResult.merchant_name,
        mcc: transactionResult.merchant_mcc_code,
        location: [
          transactionResult.merchant_city,
          transactionResult.merchant_state,
          transactionResult.merchant_country
        ].filter(Boolean).join(', ')
      }
    };
    
    // Format for MCP response
    const response = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            transactionDetails: {
              transactionToken: maskToken(args.transactionToken),
              transaction: transactionResult,
              analysis: analysis,
              riskFactors: args?.includeRiskFactors !== false ? analysis.factors : undefined,
              merchantIntel: args?.includeMerchantIntel !== false ? analysis.merchantInfo : undefined,
              analysisLevel: analysis.analysisLevel
            },
            metadata: {
              timestamp: new Date().toISOString(),
              requestId
            }
          }, null, 2)
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      transactionToken: maskToken(args.transactionToken),
      analysisLevel: analysis.analysisLevel,
      riskScore: analysis.riskScore,
      responseTime: Date.now() - extractTimestamp(requestId)
    }, 'MCP tool: get_transaction_details completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      transactionToken: args?.transactionToken ? maskToken(args.transactionToken) : 'not_provided',
      error: error.message 
    }, 'MCP tool error: get_transaction_details');
    
    throw formatMcpError(error, 'get_transaction_details', requestId);
  }
}

/**
 * Helper function to calculate risk score based on transaction data
 */
function calculateRiskScore(transaction) {
  let score = 0;
  
  // Add risk factors
  if (transaction.result !== 'APPROVED') score += 30;
  if (transaction.cardholder_amount_usd > 1000) score += 20;
  if (transaction.merchant_country !== 'USA') score += 15;
  if (!transaction.authorization_code) score += 10;
  
  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Helper function to extract risk factors from transaction
 */
function extractRiskFactors(transaction) {
  const factors = [];
  
  if (transaction.result !== 'APPROVED') {
    factors.push({ type: 'declined_transaction', severity: 'high' });
  }
  if (transaction.cardholder_amount_usd > 1000) {
    factors.push({ type: 'high_amount', severity: 'medium' });
  }
  if (transaction.merchant_country !== 'USA') {
    factors.push({ type: 'international_transaction', severity: 'low' });
  }
  
  return factors;
}

/**
 * Utility Functions
 */

/**
 * Sanitize arguments for logging (remove sensitive data)
 */
function sanitizeArgs(args) {
  if (!args || typeof args !== 'object') return args;
  
  const sanitized = { ...args };
  
  // Mask sensitive tokens
  if (sanitized.transactionToken) {
    sanitized.transactionToken = maskToken(sanitized.transactionToken);
  }
  if (sanitized.cardToken) {
    sanitized.cardToken = maskToken(sanitized.cardToken);
  }
  
  return sanitized;
}

/**
 * Mask token for logging
 */
function maskToken(token) {
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