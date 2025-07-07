/**
 * Pattern Analysis Tool Handlers
 * 
 * CRITICAL: These handlers wrap existing business logic services.
 * NEVER modify the underlying service functions - only wrap them for MCP.
 * 
 * Uses: reportingService.js and mccService.js for advanced fraud detection
 */

import * as reportingService from '../services/reporting-service.js';
import * as mccService from '../services/mcc-service.js';
import logger from '../utils/logger.js';

/**
 * Utility Functions
 */

/**
 * Sanitize arguments for logging (remove sensitive data)
 */
function sanitizeArgs(args) {
  if (!args || typeof args !== 'object') return args;
  
  const sanitized = { ...args };
  
  // Mask sensitive tokens and IDs
  if (sanitized.transactionToken) {
    sanitized.transactionToken = maskToken(sanitized.transactionToken);
  }
  if (sanitized.cardToken) {
    sanitized.cardToken = maskToken(sanitized.cardToken);
  }
  if (sanitized.entityId) {
    sanitized.entityId = maskSensitiveId(sanitized.entityId);
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
 * Mask sensitive ID for logging
 */
function maskSensitiveId(id) {
  if (!id || typeof id !== 'string') return id;
  if (id.length <= 8) return id;
  return `${id.substring(0, 8)}***`;
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

// Helper functions for pattern analysis


function calculateAverageAmount(transactions) {
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) return 0;
  
  const total = transactions.reduce((sum, t) => {
    const amount = parseFloat(t.amount?.split(' ')[1] || '0');
    return sum + amount;
  }, 0);
  
  return (total / transactions.length).toFixed(2);
}

function extractCommonLocations(transactions) {
  if (!transactions || !Array.isArray(transactions)) return [];
  
  const locations = transactions.map(t => t.location).filter(Boolean);
  const locationCounts = {};
  
  locations.forEach(loc => {
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });
  
  return Object.entries(locationCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([location, count]) => ({ location, count }));
}

function extractMccCodes(transactions) {
  if (!transactions || !Array.isArray(transactions)) return [];
  
  const codes = transactions.map(t => t.merchant_mcc).filter(Boolean);
  return [...new Set(codes)];
}