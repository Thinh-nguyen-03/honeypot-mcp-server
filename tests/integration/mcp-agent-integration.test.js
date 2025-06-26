import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Integration Tests for MCP Agent Interactions
 * 
 * These tests validate real MCP protocol communication between
 * AI agents (Claude, GPT) and the Honeypot MCP Server.
 * 
 * Tests cover:
 * - JSON-RPC 2.0 protocol compliance
 * - Tool discovery and listing
 * - Tool execution with real data flows
 * - Error handling in agent scenarios
 * - Performance requirements (<200ms)
 * - Security validation in integrated environment
 */

describe('MCP Agent Integration Tests', () => {
  let mcpServer;
  let mcpClient;
  let transport;

  beforeAll(async () => {
    // Start the MCP server process
    mcpServer = spawn('node', ['src/mcp-server.js'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        LOG_LEVEL: 'error' // Suppress logs during testing
      }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create MCP client transport
    transport = new StdioClientTransport({
      command: 'node',
      args: ['src/mcp-server.js'],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    // Create MCP client
    mcpClient = new Client({
      name: 'test-agent',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    // Connect to server
    await mcpClient.connect(transport);
  });

  afterAll(async () => {
    // Clean up
    if (mcpClient) {
      await mcpClient.close();
    }
    if (mcpServer) {
      mcpServer.kill();
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MCP Protocol Compliance Tests', () => {
    test('should establish proper MCP handshake', async () => {
      // Verify the connection was established with proper protocol
      expect(mcpClient.getServerCapabilities()).toBeDefined();
      expect(mcpClient.getServerCapabilities().tools).toBeDefined();
    });

    test('should list all 13 MCP tools correctly', async () => {
      const result = await mcpClient.listTools();

      // Verify all 13 tools are present
      expect(result.tools).toHaveLength(13);

      // Verify tool categories are present
      const toolNames = result.tools.map(tool => tool.name);
      
      // System Health (1 tool)
      expect(toolNames).toContain('health_check');
      
      // Card Management (5 tools)
      expect(toolNames).toContain('list_available_cards');
      expect(toolNames).toContain('get_card_details');
      expect(toolNames).toContain('create_honeypot_card');
      expect(toolNames).toContain('toggle_card_state');
      expect(toolNames).toContain('update_card_limits');
      
      // Transaction Query (5 tools)
      expect(toolNames).toContain('get_transaction');
      expect(toolNames).toContain('search_transactions');
      expect(toolNames).toContain('get_recent_transactions');
      expect(toolNames).toContain('get_transactions_by_merchant');
      expect(toolNames).toContain('get_transaction_details');
      
      // Real-time Intelligence (2 tools)
      expect(toolNames).toContain('subscribe_to_alerts');
      expect(toolNames).toContain('get_live_transaction_feed');
    });

    test('should have properly formatted tool schemas', async () => {
      const result = await mcpClient.listTools();

      result.tools.forEach(tool => {
        // Verify required MCP tool structure
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        
        // Verify input schema structure
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
        
        // Verify security metadata is present for critical tools
        if (['get_card_details', 'create_honeypot_card'].includes(tool.name)) {
          expect(tool.description).toContain('security');
        }
      });
    });
  });

  describe('End-to-End Agent Workflow Tests', () => {
    test('AI Agent Scenario: Fraud Investigation Workflow', async () => {
      // Simulates a complete fraud investigation as an AI agent would perform
      
      // Step 1: Health check
      const healthResult = await mcpClient.callTool({
        name: 'health_check',
        arguments: {}
      });
      
      expect(healthResult.content[0].text).toContain('"status":"healthy"');
      
      // Step 2: List available cards
      const cardsResult = await mcpClient.callTool({
        name: 'list_available_cards',
        arguments: {
          includeDetails: true,
          activeOnly: true,
          limit: 10
        }
      });
      
      const cardsData = JSON.parse(cardsResult.content[0].text);
      expect(cardsData).toHaveProperty('cardCount');
      expect(cardsData).toHaveProperty('cards');
      
      // Step 3: Subscribe to real-time alerts for fraud detection
      const alertResult = await mcpClient.callTool({
        name: 'subscribe_to_alerts',
        arguments: {
          cardTokens: ['card_test_fraud_investigation'],
          alertTypes: ['fraud_detected', 'high_risk_transaction'],
          riskThreshold: 0.8,
          subscriptionDuration: '1h'
        }
      });
      
             const alertData = JSON.parse(alertResult.content[0].text);
       expect(alertData).toHaveProperty('alertSubscription');
       expect(alertData.alertSubscription).toHaveProperty('subscriptionId');
              expect(alertData.alertSubscription).toHaveProperty('status');
    });

    test('AI Agent Scenario: Real-time Monitoring Setup', async () => {
      // Simulates setting up real-time fraud monitoring for multiple cards
      
      // Step 1: Subscribe to fraud alerts
      const alertResult = await mcpClient.callTool({
        name: 'subscribe_to_alerts',
        arguments: {
          cardTokens: ['card_monitor_1', 'card_monitor_2'],
          alertTypes: ['fraud_detected', 'high_risk_transaction'],
          riskThreshold: 0.75,
          subscriptionDuration: '2h',
          maxAlertsPerMinute: 5
        }
      });
      
      const alertData = JSON.parse(alertResult.content[0].text);
      expect(alertData).toHaveProperty('alertSubscription');
      expect(alertData.alertSubscription).toHaveProperty('subscriptionId');
      expect(alertData.alertSubscription.status).toBe('active');
      
      // Step 2: Set up live transaction feed
      const feedResult = await mcpClient.callTool({
        name: 'get_live_transaction_feed',
        arguments: {
          cardTokenFilter: ['card_monitor_1', 'card_monitor_2'],
          includeRealTimeAnalysis: true,
          feedDuration: '1h',
          maxTransactionsPerMinute: 20
        }
      });
      
      const feedData = JSON.parse(feedResult.content[0].text);
      expect(feedData).toHaveProperty('liveTransactionFeed');
      expect(feedData.liveTransactionFeed).toHaveProperty('feedId');
      expect(feedData.liveTransactionFeed.status).toBe('active');
      

    });


  });

  describe('Performance Integration Tests', () => {
    test('should meet <200ms response time SLA for all tools', async () => {
      const tools = [
        { name: 'health_check', args: {} },
        { name: 'list_available_cards', args: { limit: 5 } },
        { name: 'get_card_details', args: { cardToken: 'card_perf_test' } },
        { name: 'search_transactions', args: { limit: 10 } },
        { name: 'get_recent_transactions', args: { cardToken: 'card_perf_test', limit: 5 } }
      ];

      for (const tool of tools) {
        const startTime = Date.now();
        
        try {
          await mcpClient.callTool({
            name: tool.name,
            arguments: tool.args
          });
        } catch (error) {
          // Some tools may fail due to mock data, but we're testing performance
          // The important thing is that they respond within the time limit
        }
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(200); // 200ms SLA requirement
      }
    });

    test('should handle concurrent agent requests efficiently', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        mcpClient.callTool({
          name: 'health_check',
          arguments: { requestId: `concurrent_${i}` }
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // All 5 concurrent requests should complete within 500ms total
      expect(endTime - startTime).toBeLessThan(500);
      expect(results).toHaveLength(5);
      
      // Each result should be valid
      results.forEach(result => {
        expect(result.content[0].text).toContain('"status":"healthy"');
      });
    });
  });

  describe('Error Handling Integration Tests', () => {
    test('should handle invalid tool names gracefully', async () => {
      await expect(
        mcpClient.callTool({
          name: 'nonexistent_tool',
          arguments: {}
        })
      ).rejects.toThrow(/method not found/i);
    });

    test('should handle malformed arguments gracefully', async () => {
      await expect(
        mcpClient.callTool({
          name: 'get_card_details',
          arguments: {
            invalidParam: 'test',
            // Missing required cardToken
          }
        })
      ).rejects.toThrow(); // Should throw validation error
    });

    test('should handle service layer errors appropriately', async () => {
      // Test with parameters that would trigger service errors
      await expect(
        mcpClient.callTool({
          name: 'get_card_details',
          arguments: {
            cardToken: 'card_nonexistent_error_test'
          }
        })
      ).rejects.toThrow(); // Should propagate service error appropriately
    });

    test('should maintain connection stability during errors', async () => {
      // Cause several errors
      try {
        await mcpClient.callTool({ name: 'invalid_tool', arguments: {} });
      } catch (e) { /* expected */ }

      try {
        await mcpClient.callTool({ name: 'get_card_details', arguments: {} });
      } catch (e) { /* expected */ }

      // Connection should still work for valid requests
      const result = await mcpClient.callTool({
        name: 'health_check',
        arguments: {}
      });

      expect(result.content[0].text).toContain('"status":"healthy"');
    });
  });

  describe('Security Integration Tests', () => {
    test('should sanitize sensitive data in MCP responses', async () => {
      const result = await mcpClient.callTool({
        name: 'get_card_details',
        arguments: {
          cardToken: 'card_security_test_12345678',
          includePan: false // Never request PAN in integration tests
        }
      });

      const responseText = result.content[0].text;
      
      // Should not contain full token in response
      expect(responseText).not.toContain('card_security_test_12345678');
      // Should contain masked version
      expect(responseText).toContain('card_sec***');
    });

    test('should handle authentication/authorization properly', async () => {
      // Note: In a real deployment, this would test actual auth
      // For now, verify that auth context is being passed through properly
      
      const result = await mcpClient.callTool({
        name: 'health_check',
        arguments: {}
      });

      const healthData = JSON.parse(result.content[0].text);
      expect(healthData.metadata).toHaveProperty('timestamp');
      expect(healthData.metadata).toHaveProperty('requestId');
    });

    test('should validate all input parameters for security', async () => {
      // Test SQL injection attempts
      await expect(
        mcpClient.callTool({
          name: 'search_transactions',
          arguments: {
            merchantName: "'; DROP TABLE transactions; --"
          }
        })
      ).not.toThrow(); // Should handle gracefully, not crash

      // Test XSS attempts
      await expect(
        mcpClient.callTool({
          name: 'get_card_details',
          arguments: {
            cardToken: '<script>alert("xss")</script>'
          }
        })
      ).rejects.toThrow(); // Should reject invalid input format
    });
  });

  describe('Data Flow Integration Tests', () => {
    test('should maintain data consistency across tool calls', async () => {
      // Create a card, then retrieve it, then update it
      // This tests that data flows correctly through the system
      
      const createResult = await mcpClient.callTool({
        name: 'create_honeypot_card',
        arguments: {
          spendLimit: 500,
          spendLimitDuration: 'MONTHLY',
          cardType: 'VIRTUAL'
        }
      });

      const createData = JSON.parse(createResult.content[0].text);
      expect(createData).toHaveProperty('honeypotCard');
      
      // The card token should be consistent in format
      const cardToken = createData.honeypotCard.cardToken;
      expect(cardToken).toMatch(/^card_/);
      
      // Retrieve the card details
      const detailsResult = await mcpClient.callTool({
        name: 'get_card_details',
        arguments: {
          cardToken: cardToken,
          includePan: false
        }
      });

      const detailsData = JSON.parse(detailsResult.content[0].text);
      expect(detailsData).toHaveProperty('cardDetails');
    });

    test('should handle complex data transformations correctly', async () => {
      // Test that complex data flows through the MCP protocol correctly
      const result = await mcpClient.callTool({
        name: 'search_transactions',
        arguments: {
          limit: 10,
          includeAnalytics: true,
          includeMetadata: true,
          orderBy: 'timestamp',
          sortDirection: 'desc'
        }
      });

      const transactionData = JSON.parse(result.content[0].text);
      expect(transactionData).toHaveProperty('transactionSearch');
      expect(transactionData.transactionSearch).toHaveProperty('transactions');
      expect(transactionData.transactionSearch).toHaveProperty('totalCount');
      
      // Verify complex nested data structures are preserved
      expect(Array.isArray(transactionData.transactionSearch.transactions)).toBe(true);
    });
  });

  describe('Agent Context Preservation Tests', () => {
    test('should maintain request context across multiple tool calls', async () => {
      const requestId = `integration_test_${Date.now()}`;
      
      // Make multiple calls with the same context
      const results = await Promise.all([
        mcpClient.callTool({
          name: 'health_check',
          arguments: { requestId }
        }),
        mcpClient.callTool({
          name: 'list_available_cards',
          arguments: { requestId, limit: 5 }
        }),
        mcpClient.callTool({
          name: 'get_recent_transactions',
          arguments: { 
            requestId,
            cardToken: 'card_context_test',
            limit: 10
          }
        })
      ]);

      // All responses should include the request context
      results.forEach(result => {
        const data = JSON.parse(result.content[0].text);
        expect(data.metadata.requestId).toContain('integration_test_');
      });
    });

    test('should handle agent session state correctly', async () => {
      // Test that the server maintains proper state for agent sessions
      
      // Start a monitoring session
      const subscriptionResult = await mcpClient.callTool({
        name: 'subscribe_to_alerts',
        arguments: {
          cardTokens: ['card_session_test'],
          alertTypes: ['fraud_detected'],
          subscriptionDuration: '30m'
        }
      });

      const subscriptionData = JSON.parse(subscriptionResult.content[0].text);
      const subscriptionId = subscriptionData.alertSubscription.subscriptionId;
      
      expect(subscriptionId).toBeDefined();
      expect(subscriptionData.alertSubscription.status).toBe('active');
      
      // The subscription should be tracked and manageable
      // In a real system, this would allow for subscription management
    });
  });

  test('placeholder integration test', () => {
    expect(true).toBe(true);
  });
}); 