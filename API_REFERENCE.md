# API Reference Guide - Honeypot MCP Server

## Table of Contents
1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Authentication](#authentication)
4. [MCP Protocol Overview](#mcp-protocol-overview)
5. [Tool Reference](#tool-reference)
6. [Response Formats](#response-formats)
7. [Error Handling](#error-handling)
8. [Performance & Limits](#performance--limits)
9. [Security Guidelines](#security-guidelines)
10. [Code Examples](#code-examples)
11. [Troubleshooting](#troubleshooting)

---

## Introduction

The Honeypot MCP Server provides AI agents with access to real-time fraud detection and transaction intelligence through the Model Context Protocol (MCP). This server transforms a production-grade fraud detection system into an AI-accessible service while maintaining all security and performance requirements.

### Key Features
- 18 specialized fraud detection tools
- Real-time transaction monitoring
- ML-powered fraud detection
- PCI DSS compliant data handling
- Sub-200ms response times
- Comprehensive audit logging

---

## Quick Start

### 1. Installation
```bash
git clone <repository-url>
cd honeypot-mcp-server
npm install
```

### 2. Configuration
```bash
cp .env.example .env
# Edit .env with your API keys and database credentials
```

### 3. Start Server
```bash
npm start
```

### 4. Test Connection
```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['src/mcp-server.js']
});

const client = new Client({
  name: 'fraud-detection-agent',
  version: '1.0.0'
}, {
  capabilities: { tools: {} }
});

await client.connect(transport);
const tools = await client.listTools();
console.log(`Connected! ${tools.tools.length} tools available.`);
```

---

## Authentication

### MCP Session Authentication
```javascript
// Authentication is handled automatically by the MCP client
// Ensure your client has proper capabilities configured
const client = new Client({
  name: 'your-agent-name',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {},
    // Add other required capabilities
  }
});
```

### API Key Management
```env
# .env file
LITHIC_API_KEY=your_lithic_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key

# Security settings
LOG_LEVEL=info
RATE_LIMIT_ENABLED=true
PCI_COMPLIANCE_MODE=true
```

---

## MCP Protocol Overview

### Protocol Structure
The server implements JSON-RPC 2.0 over the Model Context Protocol:

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      // Tool-specific parameters
    }
  }
}
```

### Tool Discovery
```javascript
// List all available tools
const tools = await client.listTools();

// Example response structure
{
  "tools": [
    {
      "name": "health_check",
      "description": "Check system health and connectivity",
      "inputSchema": {
        "type": "object",
        "properties": { /* ... */ }
      }
    }
    // ... 17 more tools
  ]
}
```

---

## Tool Reference

### System Health Tools

#### `health_check`
Verify system connectivity and service status.

**Parameters:**
```javascript
{
  "includeDetails": boolean  // Optional, default: false
}
```

**Usage:**
```javascript
const health = await client.callTool({
  name: 'health_check',
  arguments: { includeDetails: true }
});
```

**Response:**
```json
{
  "content": [{
    "type": "text",
    "text": "{\"systemHealth\":{\"status\":\"healthy\",\"uptime\":\"72h 45m\",\"services\":{\"database\":\"connected\",\"lithic\":\"connected\"}}}"
  }]
}
```

### Card Management Tools

#### `list_available_cards`
List cards available for fraud monitoring.

**Parameters:**
```javascript
{
  "includeDetails": boolean,  // Optional, default: false
  "activeOnly": boolean,      // Optional, default: true
  "limit": number            // Optional, default: 20, max: 100
}
```

**Usage:**
```javascript
const cards = await client.callTool({
  name: 'list_available_cards',
  arguments: {
    includeDetails: true,
    activeOnly: true,
    limit: 10
  }
});
```

#### `get_card_details`
Retrieve detailed card information.

**Parameters:**
```javascript
{
  "cardToken": string,        // Required, format: "card_[a-zA-Z0-9]{20,}"
  "includePan": boolean,      // Optional, default: false (requires elevated permissions)
  "reason": string           // Optional, enum: ["fraud_investigation", "scammer_verification", "pattern_analysis"]
}
```

**Usage:**
```javascript
const cardDetails = await client.callTool({
  name: 'get_card_details',
  arguments: {
    cardToken: 'card_abc123def456789012345',
    includePan: false,
    reason: 'fraud_investigation'
  }
});
```

#### `create_honeypot_card`
Create honeypot cards for scammer detection.

**Parameters:**
```javascript
{
  "spendLimit": number,           // Optional, 100-500000 cents, default: 10000
  "spendLimitDuration": string,   // Optional, enum: ["MONTHLY", "WEEKLY", "DAILY"], default: "MONTHLY"
  "cardType": string             // Optional, enum: ["VIRTUAL", "PHYSICAL"], default: "VIRTUAL"
}
```

### Transaction Query Tools

#### `search_transactions`
Advanced transaction search with filtering.

**Parameters:**
```javascript
{
  "cardToken": string,           // Optional
  "startDate": string,           // Optional, ISO 8601 format
  "endDate": string,             // Optional, ISO 8601 format
  "merchantName": string,        // Optional
  "amountRange": {               // Optional
    "min": number,
    "max": number
  },
  "status": string[],            // Optional, values: ["PENDING", "SETTLED", "DECLINED"]
  "limit": number,               // Optional, 1-200, default: 50
  "sortBy": string,              // Optional, enum: ["created", "amount", "merchant"], default: "created"
  "sortOrder": string            // Optional, enum: ["asc", "desc"], default: "desc"
}
```

**Usage:**
```javascript
const transactions = await client.callTool({
  name: 'search_transactions',
  arguments: {
    cardToken: 'card_12345',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    amountRange: { min: 1000, max: 50000 },
    status: ['SETTLED'],
    limit: 25
  }
});
```

#### `get_recent_transactions`
Get recent transactions for a specific card.

**Parameters:**
```javascript
{
  "cardToken": string,              // Required
  "limit": number,                  // Optional, 1-100, default: 20
  "includeFraudAnalysis": boolean   // Optional, default: true
}
```

### Pattern Analysis Tools

#### `analyze_transaction_patterns`
Analyze spending patterns for fraud detection.

**Parameters:**
```javascript
{
  "cardToken": string,              // Required
  "analysisWindow": string,         // Optional, default: "30d", format: "7d", "30d", "90d"
  "patternTypes": string[],         // Optional, default: ["temporal", "merchant", "amount"]
  "includeAnomalies": boolean,      // Optional, default: true
  "confidenceThreshold": number     // Optional, 0-1, default: 0.7
}
```

**Usage:**
```javascript
const patterns = await client.callTool({
  name: 'analyze_transaction_patterns',
  arguments: {
    cardToken: 'card_pattern_analysis',
    analysisWindow: '30d',
    patternTypes: ['temporal', 'merchant', 'amount'],
    includeAnomalies: true,
    confidenceThreshold: 0.8
  }
});
```

#### `detect_fraud_indicators`
Use ML models to detect fraud indicators.

**Parameters:**
```javascript
{
  "transactionToken": string,       // Optional (either transactionToken or cardToken required)
  "cardToken": string,             // Optional (either transactionToken or cardToken required)
  "analysisDepth": string,         // Optional, enum: ["standard", "comprehensive", "deep"], default: "standard"
  "riskThreshold": number,         // Optional, 0-1, default: 0.8
  "includeMLModels": boolean,      // Optional, default: true
  "historicalContext": string      // Optional, default: "30d"
}
```

### Real-time Intelligence Tools

#### `subscribe_to_alerts`
Set up real-time fraud alerts.

**Parameters:**
```javascript
{
  "cardTokens": string[],          // Optional, default: []
  "alertTypes": string[],          // Optional, default: ["fraud_detected", "high_risk_transaction"]
  "riskThreshold": number,         // Optional, 0-1, default: 0.7
  "subscriptionDuration": string,  // Optional, default: "4h", format: "1h", "4h", "24h"
  "maxAlertsPerMinute": number     // Optional, 1-100, default: 10
}
```

**Usage:**
```javascript
const subscription = await client.callTool({
  name: 'subscribe_to_alerts',
  arguments: {
    cardTokens: ['card_monitor_1', 'card_monitor_2'],
    alertTypes: ['fraud_detected', 'high_risk_transaction'],
    riskThreshold: 0.8,
    subscriptionDuration: '2h',
    maxAlertsPerMinute: 5
  }
});
```

#### `generate_verification_questions`
Generate questions to verify legitimate cardholders.

**Parameters:**
```javascript
{
  "cardToken": string,                    // Required
  "questionType": string,                 // Optional, enum: ["transaction", "merchant", "pattern", "mixed"], default: "mixed"
  "difficultyLevel": string,              // Optional, enum: ["easy", "medium", "hard"], default: "medium"
  "questionCount": number,                // Optional, 1-10, default: 5
  "timeframe": string,                    // Optional, default: "30d"
  "adaptToScammerTactics": boolean        // Optional, default: true
}
```

---

## Response Formats

### Standard Response Structure
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"result\": {\"data\": \"...\", \"metadata\": {\"timestamp\": \"2024-12-20T10:30:00Z\", \"requestId\": \"req_12345\"}}}"
    }
  ]
}
```

### Error Response Structure
```json
{
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "field": "cardToken",
      "reason": "Invalid token format",
      "requestId": "req_12345"
    }
  }
}
```

### Metadata Fields
All responses include metadata:
```json
{
  "metadata": {
    "timestamp": "2024-12-20T10:30:00Z",
    "requestId": "req_12345",
    "responseTime": 145,
    "version": "1.0.0"
  }
}
```

---

## Error Handling

### Error Codes
| Code | Description | Action |
|------|-------------|---------|
| -32700 | Parse error | Check JSON syntax |
| -32600 | Invalid Request | Verify request format |
| -32601 | Method Not Found | Check tool name |
| -32602 | Invalid Params | Validate parameters |
| -32603 | Internal Error | Retry or contact support |
| -32000 | Authentication Failed | Check credentials |
| -32001 | Authorization Failed | Verify permissions |
| -32002 | Validation Failed | Fix parameter values |
| -32003 | Business Logic Error | Check data and retry |

### Error Handling Best Practices
```javascript
try {
  const result = await client.callTool({
    name: 'get_card_details',
    arguments: { cardToken: 'card_12345' }
  });
  
  return JSON.parse(result.content[0].text);
} catch (error) {
  if (error.code === -32001) {
    // Handle authorization error
    console.log('Insufficient permissions for this operation');
  } else if (error.code === -32002) {
    // Handle validation error
    console.log('Invalid parameters:', error.data);
  } else {
    // Handle other errors
    console.log('Operation failed:', error.message);
  }
  
  throw error;
}
```

---

## Performance & Limits

### Response Time SLA
- System Health: < 50ms
- Card Management: < 150ms  
- Transaction Queries: < 200ms
- Pattern Analysis: < 200ms
- Real-time Intelligence: < 200ms

### Rate Limits
- Standard operations: 60 requests/minute
- Sensitive operations: 30 requests/minute
- Real-time subscriptions: Custom limits per subscription

### Pagination
For large datasets, use limit parameters:
```javascript
// Get transactions in batches
let allTransactions = [];
let offset = 0;
const batchSize = 50;

while (true) {
  const batch = await client.callTool({
    name: 'search_transactions',
    arguments: {
      limit: batchSize,
      offset: offset
    }
  });
  
  const data = JSON.parse(batch.content[0].text);
  allTransactions.push(...data.searchResults.transactions);
  
  if (data.searchResults.transactions.length < batchSize) {
    break; // No more data
  }
  
  offset += batchSize;
}
```

---

## Security Guidelines

### PCI DSS Compliance
- Never request `includePan: true` unless absolutely necessary
- Provide clear `reason` for sensitive operations
- All card tokens are automatically masked in logs
- Full audit trail maintained for compliance

### Data Handling
```javascript
// ✅ CORRECT: Safe card detail access
const safeCardDetails = await client.callTool({
  name: 'get_card_details',
  arguments: {
    cardToken: 'card_12345',
    includePan: false,  // Safe default
    reason: 'fraud_investigation'
  }
});

// ❌ WRONG: Requesting PAN without clear justification
const unsafeCardDetails = await client.callTool({
  name: 'get_card_details',
  arguments: {
    cardToken: 'card_12345',
    includePan: true  // Requires elevated permissions
  }
});
```

### Authentication Best Practices
- Rotate API keys regularly
- Use minimum required permissions
- Monitor access logs for anomalies
- Implement client-side rate limiting

---

## Code Examples

### Complete Fraud Investigation Workflow
```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class FraudInvestigator {
  constructor() {
    this.client = null;
  }

  async initialize() {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['src/mcp-server.js']
    });

    this.client = new Client({
      name: 'fraud-investigator',
      version: '1.0.0'
    }, {
      capabilities: { tools: {} }
    });

    await this.client.connect(transport);
  }

  async investigateSuspiciousCard(cardToken) {
    try {
      // 1. Check system health
      await this.checkSystemHealth();
      
      // 2. Get card details
      const cardDetails = await this.getCardDetails(cardToken);
      
      // 3. Analyze transaction patterns
      const patterns = await this.analyzePatterns(cardToken);
      
      // 4. Detect fraud indicators
      const fraudAnalysis = await this.detectFraud(cardToken);
      
      // 5. Generate verification questions
      const questions = await this.generateQuestions(cardToken);
      
      return {
        cardDetails,
        patterns,
        fraudAnalysis,
        questions,
        recommendation: this.generateRecommendation(fraudAnalysis, patterns)
      };
      
    } catch (error) {
      console.error('Investigation failed:', error);
      throw error;
    }
  }

  async checkSystemHealth() {
    const result = await this.client.callTool({
      name: 'health_check',
      arguments: { includeDetails: true }
    });
    
    const health = JSON.parse(result.content[0].text);
    if (health.systemHealth.status !== 'healthy') {
      throw new Error('System not healthy for investigation');
    }
    
    return health;
  }

  async getCardDetails(cardToken) {
    const result = await this.client.callTool({
      name: 'get_card_details',
      arguments: {
        cardToken,
        includePan: false,
        reason: 'fraud_investigation'
      }
    });
    
    return JSON.parse(result.content[0].text);
  }

  async analyzePatterns(cardToken) {
    const result = await this.client.callTool({
      name: 'analyze_transaction_patterns',
      arguments: {
        cardToken,
        analysisWindow: '7d',
        patternTypes: ['temporal', 'merchant', 'amount'],
        includeAnomalies: true,
        confidenceThreshold: 0.8
      }
    });
    
    return JSON.parse(result.content[0].text);
  }

  async detectFraud(cardToken) {
    const result = await this.client.callTool({
      name: 'detect_fraud_indicators',
      arguments: {
        cardToken,
        analysisDepth: 'comprehensive',
        riskThreshold: 0.7,
        includeMLModels: true
      }
    });
    
    return JSON.parse(result.content[0].text);
  }

  async generateQuestions(cardToken) {
    const result = await this.client.callTool({
      name: 'generate_verification_questions',
      arguments: {
        cardToken,
        questionType: 'mixed',
        difficultyLevel: 'hard',
        questionCount: 5,
        adaptToScammerTactics: true
      }
    });
    
    return JSON.parse(result.content[0].text);
  }

  generateRecommendation(fraudAnalysis, patterns) {
    const riskScore = fraudAnalysis.fraudAnalysis.riskScore;
    const anomalyCount = patterns.patternAnalysis.anomalies.length;
    
    if (riskScore > 0.8 || anomalyCount > 3) {
      return {
        action: 'BLOCK_CARD',
        confidence: 'HIGH',
        reason: 'High fraud risk detected'
      };
    } else if (riskScore > 0.6 || anomalyCount > 1) {
      return {
        action: 'MANUAL_REVIEW',
        confidence: 'MEDIUM', 
        reason: 'Moderate fraud indicators present'
      };
    } else {
      return {
        action: 'CONTINUE_MONITORING',
        confidence: 'LOW',
        reason: 'No significant fraud indicators'
      };
    }
  }
}

// Usage
const investigator = new FraudInvestigator();
await investigator.initialize();

const result = await investigator.investigateSuspiciousCard('card_suspicious_123');
console.log('Investigation result:', result);
```

### Real-time Monitoring Setup
```javascript
class RealTimeMonitor {
  constructor() {
    this.client = null;
    this.subscriptions = new Map();
  }

  async setupMonitoring(cardTokens, options = {}) {
    const {
      riskThreshold = 0.75,
      alertTypes = ['fraud_detected', 'high_risk_transaction'],
      duration = '4h'
    } = options;

    // 1. Subscribe to alerts
    const alertSubscription = await this.client.callTool({
      name: 'subscribe_to_alerts',
      arguments: {
        cardTokens,
        alertTypes,
        riskThreshold,
        subscriptionDuration: duration,
        maxAlertsPerMinute: 10
      }
    });

    // 2. Start live transaction feed
    const feedSubscription = await this.client.callTool({
      name: 'get_live_transaction_feed',
      arguments: {
        cardTokenFilter: cardTokens,
        includeRealTimeAnalysis: true,
        feedDuration: duration,
        maxTransactionsPerMinute: 20
      }
    });

    const alertData = JSON.parse(alertSubscription.content[0].text);
    const feedData = JSON.parse(feedSubscription.content[0].text);

    this.subscriptions.set(alertData.alertSubscription.subscriptionId, {
      type: 'alerts',
      cardTokens,
      expiresAt: alertData.alertSubscription.expiresAt
    });

    this.subscriptions.set(feedData.liveTransactionFeed.feedId, {
      type: 'feed',
      cardTokens,
      expiresAt: feedData.liveTransactionFeed.expiresAt
    });

    return {
      alertSubscriptionId: alertData.alertSubscription.subscriptionId,
      feedId: feedData.liveTransactionFeed.feedId,
      status: 'active'
    };
  }

  async analyzeSpendingPattern(cardToken, options = {}) {
    const {
      analysisType = 'realtime',
      timeWindow = '24h',
      realTimeMode = true
    } = options;

    const result = await this.client.callTool({
      name: 'analyze_spending_patterns',
      arguments: {
        cardToken,
        analysisType,
        timeWindow,
        realTimeMode,
        includePredictions: true,
        deviationThreshold: 0.6
      }
    });

    return JSON.parse(result.content[0].text);
  }
}
```

---

## Troubleshooting

### Common Issues

#### Connection Problems
```javascript
// Issue: Cannot connect to MCP server
// Solution: Check server status and configuration

// Check if server is running
const healthCheck = await client.callTool({
  name: 'health_check',
  arguments: {}
});

// Verify environment variables
console.log('Environment check:', {
  nodeEnv: process.env.NODE_ENV,
  logLevel: process.env.LOG_LEVEL,
  hasLithicKey: !!process.env.LITHIC_API_KEY
});
```

#### Performance Issues
```javascript
// Issue: Slow response times
// Solution: Check system load and optimize requests

const startTime = Date.now();
const result = await client.callTool({
  name: 'health_check',
  arguments: { includeDetails: true }
});
const responseTime = Date.now() - startTime;

if (responseTime > 200) {
  console.warn(`Slow response: ${responseTime}ms`);
  // Consider reducing request complexity or checking system resources
}
```

#### Authentication Errors
```javascript
// Issue: Authorization failed errors
// Solution: Verify permissions and API keys

try {
  await client.callTool({
    name: 'get_card_details',
    arguments: { cardToken: 'card_12345' }
  });
} catch (error) {
  if (error.code === -32001) {
    console.error('Authorization failed. Check:');
    console.error('1. API key validity');
    console.error('2. User permissions');
    console.error('3. Rate limiting status');
  }
}
```

### Debug Mode
Enable detailed logging:
```env
LOG_LEVEL=debug
MCP_DEBUG=true
```

### Health Monitoring
```javascript
// Continuous health monitoring
setInterval(async () => {
  try {
    const health = await client.callTool({
      name: 'health_check',
      arguments: { includeDetails: true }
    });
    
    const status = JSON.parse(health.content[0].text);
    console.log('System status:', status.systemHealth.status);
    
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
}, 60000); // Check every minute
```

---

## Support

### Getting Help
- **Documentation**: Review this API reference and tool documentation
- **Logs**: Check server logs for detailed error information  
- **Health Status**: Use `health_check` tool to verify system status
- **Performance**: Monitor response times and adjust usage patterns

### Reporting Issues
When reporting issues, include:
1. Tool name and parameters used
2. Full error message and code
3. Request ID from error response
4. Timestamp of the issue
5. System health status

---

**API Version**: 1.0.0  
**Last Updated**: 2024-12-20  
**MCP Protocol Version**: Latest 