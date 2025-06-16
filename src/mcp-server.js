#!/usr/bin/env node

/**
 * Honeypot MCP Server - AI-powered Transaction Intelligence
 * 
 * Production-grade MCP server for fraud detection using Lithic honeypot cards.
 * Enables AI agents to perform fraud detection and real-time scammer verification.
 * 
 * @version 1.0.0
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import logger from './utils/logger.js';
import healthService from './services/health-service.js';

// Import tool schemas and handlers
import { cardToolSchemas } from './schemas/card-schemas.js';
import * as cardHandlers from './handlers/card-handlers.js';
import { transactionToolSchemas } from './schemas/transaction-schemas.js';
import * as transactionHandlers from './handlers/transaction-handlers.js';
import { patternAnalysisToolSchemas } from './schemas/pattern-analysis-schemas.js';
import * as patternAnalysisHandlers from './handlers/pattern-analysis-handlers.js';
import { realtimeIntelligenceToolSchemas } from './schemas/realtime-intelligence-schemas.js';
import * as realtimeIntelligenceHandlers from './handlers/realtime-intelligence-handlers.js';

const server = new Server(
  {
    name: "honeypot-transaction-intelligence",
    version: "1.0.0",
    description: "AI-powered fraud detection using Lithic honeypot cards for real-time scammer verification"
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

/**
 * Tool Discovery Endpoint
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('MCP tool discovery requested');
  
  return {
    tools: [
      {
        name: "health_check",
        description: "Comprehensive system health monitoring for MCP server and dependencies",
        inputSchema: {
          type: "object",
          properties: {
            includeDetails: {
              type: "boolean",
              description: "Include detailed check results for each component",
              default: true
            },
            format: {
              type: "string",
              enum: ["summary", "detailed", "json"],
              description: "Output format for health report",
              default: "summary"
            },
            skipCache: {
              type: "boolean", 
              description: "Skip cached results and force fresh health check",
              default: false
            }
          },
          additionalProperties: false
        }
      },
      
      ...cardToolSchemas,
      ...transactionToolSchemas,
      ...patternAnalysisToolSchemas,
      ...realtimeIntelligenceToolSchemas
    ]
  };
});

/**
 * Tool Execution Endpoint
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const requestId = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info({ 
    requestId, 
    toolName: name, 
    args: sanitizeArgs(args) 
  }, 'MCP tool execution requested');

  try {
    switch (name) {
      case 'health_check':
        return await handleHealthCheck(args, requestId);
        
      // Card Management Tools
      case 'list_available_cards':
        return await cardHandlers.handleListAvailableCards(args, requestId);
      case 'get_card_details':
        return await cardHandlers.handleGetCardDetails(args, requestId);
      case 'create_honeypot_card':
        return await cardHandlers.handleCreateHoneypotCard(args, requestId);
      case 'update_card_limits':
        return await cardHandlers.handleUpdateCardLimits(args, requestId);
      case 'toggle_card_state':
        return await cardHandlers.handleToggleCardState(args, requestId);
        
      // Transaction Query Tools
      case 'get_transaction':
        return await transactionHandlers.handleGetTransaction(args, requestId);
      case 'search_transactions':
        return await transactionHandlers.handleSearchTransactions(args, requestId);
      case 'get_recent_transactions':
        return await transactionHandlers.handleGetRecentTransactions(args, requestId);
      case 'get_transactions_by_merchant':
        return await transactionHandlers.handleGetTransactionsByMerchant(args, requestId);
      case 'get_transaction_details':
        return await transactionHandlers.handleGetTransactionDetails(args, requestId);
        
      // Pattern Analysis Tools
      case 'analyze_transaction_patterns':
        return await patternAnalysisHandlers.handleAnalyzeTransactionPatterns(args, requestId);
      case 'detect_fraud_indicators':
        return await patternAnalysisHandlers.handleDetectFraudIndicators(args, requestId);
      case 'generate_merchant_intelligence':
        return await patternAnalysisHandlers.handleGenerateMerchantIntelligence(args, requestId);
      case 'perform_risk_assessment':
        return await patternAnalysisHandlers.handlePerformRiskAssessment(args, requestId);
        
      // Real-time Intelligence Tools
      case 'subscribe_to_alerts':
        return await realtimeIntelligenceHandlers.handleSubscribeToAlerts(args, requestId);
      case 'get_live_transaction_feed':
        return await realtimeIntelligenceHandlers.handleGetLiveTransactionFeed(args, requestId);
      case 'analyze_spending_patterns':
        return await realtimeIntelligenceHandlers.handleAnalyzeSpendingPatterns(args, requestId);
      case 'generate_verification_questions':
        return await realtimeIntelligenceHandlers.handleGenerateVerificationQuestions(args, requestId);
        
      default:
        const error = new Error(`Unknown tool: ${name}`);
        logger.error({ requestId, toolName: name }, error.message);
        throw error;
    }
    
  } catch (error) {
    logger.error({ 
      requestId, 
      toolName: name, 
      error: error.message,
      stack: error.stack 
    }, 'MCP tool execution failed');
    
    throw error;
  }
});

/**
 * Health Check Tool Handler
 */
async function handleHealthCheck(args, requestId) {
  try {
    logger.info({ requestId, args: sanitizeArgs(args) }, 'Executing health check tool');
    
    const { includeDetails = true, format = 'summary', skipCache = false } = args || {};
    
    const healthResult = await healthService.performHealthCheck({
      includeDetails,
      skipCache
    });
    
    const formattedReport = healthService.formatHealthReport(healthResult, format);
    
    const response = {
      content: [
        {
          type: "text",
          text: `# System Health Check Report\n\n` +
                `**Overall Status:** ${formattedReport.overallStatus}\n` +
                `**Health Score:** ${formattedReport.overallScore}/100\n` +
                `**Response Time:** ${formattedReport.responseTimeMs}ms\n` +
                `**Timestamp:** ${formattedReport.timestamp}\n\n` +
                (format === 'summary' ? 
                  `**Summary:**\n` +
                  `- Status: ${formattedReport.summary.status}\n` +
                  `- Score: ${formattedReport.summary.score}\n` +
                  `- Response Time: ${formattedReport.summary.responseTime}\n` +
                  `- Checks: ${formattedReport.summary.checks}\n` +
                  `- Issues: ${formattedReport.summary.issues}\n` :
                  `**Detailed Results:**\n\`\`\`json\n${JSON.stringify(formattedReport, null, 2)}\n\`\`\``
                )
        }
      ]
    };
    
    logger.info({ 
      requestId, 
      status: healthResult.overallStatus, 
      score: healthResult.overallScore,
      responseTime: healthResult.responseTimeMs 
    }, 'Health check tool completed successfully');
    
    return response;
    
  } catch (error) {
    logger.error({ 
      requestId, 
      error: error.message, 
      stack: error.stack 
    }, 'Health check tool execution failed');
    
    return {
      content: [
        {
          type: "text",
          text: `# Health Check Failed\n\n` +
                `**Error:** ${error.message}\n` +
                `**Timestamp:** ${new Date().toISOString()}\n\n` +
                `The health check could not be completed. Please check the server logs for more details.`
        }
      ]
    };
  }
}

/**
 * Sanitize arguments for logging (remove sensitive data)
 */
function sanitizeArgs(args) {
  if (!args || typeof args !== 'object') return args;
  
  const sanitized = { ...args };
  
  if (sanitized.cardToken) {
    sanitized.cardToken = `${sanitized.cardToken.substring(0, 8)}***`;
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
 * Main server startup function
 */
async function main() {
  try {
    logger.info('Starting Honeypot MCP Server...');
    
    const isHttpMode = process.env.NODE_ENV === 'production' || process.env.MCP_TRANSPORT === 'http';
    
    if (isHttpMode) {
      // HTTP mode for deployment (Railway, Heroku, etc.)
      const app = express();
      app.use(cors());
      app.use(express.json());
      
      // Health check endpoint for deployment platform
      app.get('/health', (req, res) => {
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
      });
      
      // Store SSE transports by session ID
      const sseTransports = {};
      
      // SSE endpoint for establishing connection
      app.get('/mcp', async (req, res) => {
        try {
          logger.info('Establishing SSE connection for MCP');
          
          // Create transport with separate message endpoint
          const transport = new SSEServerTransport('/mcp/messages', res);
          
          // Store transport by session ID
          sseTransports[transport.sessionId] = transport;
          
          res.on('close', () => {
            logger.info(`SSE connection closed for session ${transport.sessionId}`);
            delete sseTransports[transport.sessionId];
          });
          
          await server.connect(transport);
          
        } catch (error) {
          logger.error('Error establishing SSE connection:', error);
          if (!res.headersSent) {
            res.status(500).json({
              error: 'Failed to establish SSE connection'
            });
          }
        }
      });
      
      // Message endpoint for handling client POST messages
      app.post('/mcp/messages', async (req, res) => {
        try {
          const sessionId = req.query.sessionId;
          logger.info(`Received MCP message for session ${sessionId}`);
          
          const transport = sseTransports[sessionId];
          if (transport) {
            await transport.handlePostMessage(req, res, req.body);
          } else {
            logger.warn(`No transport found for session ${sessionId}`);
            res.status(400).json({
              error: 'No transport found for sessionId'
            });
          }
          
        } catch (error) {
          logger.error('Error handling MCP message:', error);
          if (!res.headersSent) {
            res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error',
              },
              id: null,
            });
          }
        }
      });
      
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        logger.info({
          serverName: "honeypot-transaction-intelligence",
          version: "1.0.0",
          capabilities: ["tools"],
          toolCount: 18,
          transport: "http",
          port: port,
          endpoints: {
            health: `/health`,
            mcp: `/mcp`
          }
        }, 'Honeypot MCP Server started successfully');
      });
      
    } else {
      // Stdio mode for local development
      const transport = new StdioServerTransport();
      await server.connect(transport);
      
      logger.info({
        serverName: "honeypot-transaction-intelligence",
        version: "1.0.0",
        capabilities: ["tools"],
        toolCount: 18,
        transport: "stdio"
      }, 'Honeypot MCP Server started successfully');
    }
    
  } catch (error) {
    logger.error({ 
      error: error.message, 
      stack: error.stack 
    }, 'Failed to start MCP server');
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down MCP server gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down MCP server gracefully');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error({ error: error.message }, 'Unhandled error in main');
  process.exit(1);
}); 