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
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
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



/**
 * Create and configure the MCP server
 */
function createMcpServer() {
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

  return server;
}

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
  
  if (sanitized.cardToken && typeof sanitized.cardToken === 'string') {
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
      
      // Enhanced CORS configuration for MCP
      app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'mcp-session-id',
          'Accept',
          'Origin',
          'X-Requested-With',
          'Cache-Control'
        ],
        exposedHeaders: ['mcp-session-id'],
        credentials: false
      }));
      
      app.use(express.json());
      
      // Additional logging for all requests (moved before routes)
      app.use((req, res, next) => {
        logger.info({ 
          method: req.method, 
          path: req.path, 
          query: req.query,
          headers: {
            'user-agent': req.headers['user-agent'],
            'accept': req.headers['accept'],
            'mcp-session-id': req.headers['mcp-session-id']
          }
        }, 'Incoming request');
        next();
      });
      
      // Environment variable validation
      const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'LITHIC_API_KEY'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        logger.error('Missing required environment variables:', { missingVars });
        // Don't fail completely - allow server to start but log warnings
        logger.warn('Server starting with missing environment variables - some features may not work');
      }
      
      // Health check endpoint for deployment platform
      app.get('/health', (req, res) => {
        res.json({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          environment: {
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
            hasLithicKey: !!process.env.LITHIC_API_KEY,
            nodeEnv: process.env.NODE_ENV
          }
        });
      });
      
      // Store transports by session ID for StreamableHTTP
      const transports = {};
      
      // Handle OPTIONS requests for CORS preflight
      app.options('/mcp', (req, res) => {
        logger.info('Received OPTIONS request for CORS preflight');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id, Accept');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
        res.status(200).end();
      });
      
      // Handle POST requests for client-to-server communication (StreamableHTTP)
      app.post('/mcp', async (req, res) => {
        try {
          logger.info('Received POST request to /mcp for StreamableHTTP', {
            contentType: req.headers['content-type'],
            accept: req.headers['accept'],
            userAgent: req.headers['user-agent'],
            bodyKeys: req.body ? Object.keys(req.body) : 'no body',
            method: req.body?.method,
            requestId: req.body?.id,
            hasParams: !!req.body?.params
          });
          
          // Set appropriate response headers for MCP
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id, Accept');
          
          // Optional: Handle authorization header if present (but don't require it)
          const authHeader = req.headers.authorization;
          if (authHeader) {
            logger.info('Authorization header received (but not validated)', {
              hasAuth: true,
              authType: authHeader.split(' ')[0] || 'unknown'
            });
            // Note: We log but don't validate the token since server doesn't require auth
          }
          
          // StreamableHTTP handling
          const sessionId = req.headers['mcp-session-id'];
          let transport;

          if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId];
            logger.info(`Reusing existing transport for session ${sessionId}`);
          } else {
            // Create new transport for any request without valid session
            logger.info('Creating new StreamableHTTP transport', { 
              hasSessionId: !!sessionId, 
              method: req.body?.method 
            });
            
            // Generate a new session ID
            const newSessionId = randomUUID();
            
            // Create transport with the generated session ID
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => newSessionId
            });

            // Create and connect server to transport BEFORE handling any requests
            const server = createMcpServer();
            await server.connect(transport);
            
            // Store the transport immediately with the session ID
            transports[newSessionId] = transport;
            logger.info(`Transport created and stored with session ID: ${newSessionId}`);

            // Set the session ID header in the response
            res.setHeader('mcp-session-id', newSessionId);

            // Clean up transport when closed
            transport.onclose = () => {
              logger.info(`Transport closed for session ${newSessionId}`);
              delete transports[newSessionId];
            };
          }

          // Ensure transport is ready before handling request
          if (!transport) {
            logger.error('Transport is null or undefined');
            res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Transport initialization failed',
              },
              id: req.body?.id || null,
            });
            return;
          }

          // Handle the request with proper error handling
          logger.info('About to call transport.handleRequest', {
            sessionId: transport.sessionId || 'unknown',
            bodyMethod: req.body?.method,
            hasTransport: !!transport,
            requestId: req.body?.id
          });
          
          await transport.handleRequest(req, res, req.body);
          
          logger.info('transport.handleRequest completed successfully', {
            method: req.body?.method,
            requestId: req.body?.id,
            responseHeadersSent: res.headersSent
          });
          
        } catch (error) {
          logger.error('Error handling StreamableHTTP POST request:', {
            error: error.message,
            stack: error.stack,
            method: req.body?.method,
            hasSessionId: !!req.headers['mcp-session-id']
          });
          
          if (!res.headersSent) {
            res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
              },
              id: req.body?.id || null,
            });
          }
        }
      });

      // Handle GET requests for server-to-client notifications (StreamableHTTP)
      app.get('/mcp', async (req, res) => {
        try {
          logger.info('Received GET request to /mcp for StreamableHTTP');
          
          // StreamableHTTP handling
          let sessionId = req.headers['mcp-session-id'] || req.query.sessionId;
          
          // If no session ID provided, generate one for Streamable HTTP
          if (!sessionId) {
            sessionId = randomUUID();
            logger.info('No session ID provided, generating new one for Streamable HTTP', { 
              newSessionId: `${sessionId.substring(0, 8)}...` 
            });
          }
          
          let transport = transports[sessionId];
          
          if (!transport) {
            logger.info('Creating new transport for session', { 
              sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : 'none',
              availableSessions: Object.keys(transports).length
            });
            
            // Create a new transport for this session
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => sessionId
            });

            const server = createMcpServer();
            await server.connect(transport);
            
            transports[sessionId] = transport;
            logger.info(`New transport created and stored for session: ${sessionId.substring(0, 8)}...`);

            // Set session ID header for client tracking
            res.setHeader('mcp-session-id', sessionId);

            transport.onclose = () => {
              logger.info(`Transport closed for session ${sessionId.substring(0, 8)}...`);
              delete transports[sessionId];
            };
          }
          
          await transport.handleRequest(req, res);
          
        } catch (error) {
          logger.error('Error handling StreamableHTTP GET request:', {
            error: error.message,
            stack: error.stack,
            sessionId: req.headers['mcp-session-id'] || 'generated'
          });
          
          if (!res.headersSent) {
            res.status(500).send('Internal server error');
          }
        }
      });

      // Handle DELETE requests for session termination (StreamableHTTP)
      app.delete('/mcp', async (req, res) => {
        try {
          logger.info('Received DELETE request to /mcp for StreamableHTTP session termination');
          
          const sessionId = req.headers['mcp-session-id'];
          if (!sessionId || !transports[sessionId]) {
            logger.warn('Invalid or missing session ID for DELETE request');
            res.status(400).send('Invalid or missing session ID');
            return;
          }
          
          const transport = transports[sessionId];
          await transport.handleRequest(req, res);
          
        } catch (error) {
          logger.error('Error handling StreamableHTTP DELETE request:', error);
          if (!res.headersSent) {
            res.status(500).send('Internal server error');
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
            streamable_http_post: `POST /mcp (StreamableHTTP Client-to-Server)`,
            streamable_http_get: `GET /mcp (StreamableHTTP Server-to-Client)`,
            streamable_http_delete: `DELETE /mcp (StreamableHTTP Session Termination)`
          }
        }, 'Honeypot MCP Server started successfully with StreamableHTTP');
      });
    } else {
      // Stdio mode for local development
      const server = createMcpServer();
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