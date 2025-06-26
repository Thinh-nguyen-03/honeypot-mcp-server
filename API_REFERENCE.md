# API Reference - Honeypot MCP Server

[![Enterprise Grade](https://img.shields.io/badge/Documentation-Enterprise%20Grade-purple.svg)]()
[![MCP Protocol](https://img.shields.io/badge/Protocol-MCP%202.0-blue.svg)]()
[![Version](https://img.shields.io/badge/Version-1.0.0-green.svg)]()

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Authentication & Security](#authentication--security)
4. [MCP Protocol Overview](#mcp-protocol-overview)
5. [Tool Reference](#tool-reference)
6. [Response Formats](#response-formats)
7. [Error Handling](#error-handling)
8. [Performance Guidelines](#performance-guidelines)
9. [Integration Examples](#integration-examples)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

The Honeypot MCP Server API provides AI agents with sophisticated fraud detection capabilities through 13 specialized tools. Built on the Model Context Protocol (MCP), this enterprise-grade platform enables real-time transaction monitoring, card management, and fraud investigation workflows.

### Core Capabilities
- **13 Specialized Tools**: Comprehensive transaction monitoring and card management
- **Real-Time Processing**: Sub-200ms response times for critical operations
- **Enterprise Security**: PCI DSS compliant data handling with comprehensive audit trails
- **AI-Native Design**: Purpose-built for conversational AI and agent interactions
- **Production Ready**: Battle-tested architecture handling high-volume transaction flows

### Business Applications
- **Fraud Investigation**: Deep-dive analysis of suspicious transactions
- **Risk Assessment**: Real-time evaluation of transaction patterns and merchant behavior
- **Compliance Monitoring**: Automated detection of policy violations and regulatory issues
- **Operational Intelligence**: Business insights for fraud prevention strategy optimization

---

## Getting Started

### Prerequisites
- **MCP Client**: Compatible with any MCP-compliant AI framework
- **Node.js Environment**: 18.0.0+ for local development
- **Database Access**: Configured Supabase connection
- **API Credentials**: Valid Lithic API key for card operations

### Quick Connection
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
console.log(`Connected! ${tools.tools.length} tools available.`); // Should be 13
```

### Health Verification
```javascript
const health = await client.callTool({
  name: 'health_check',
  arguments: { includeDetails: true }
});
console.log('System Status:', health.content[0].text);
```

---

## Authentication & Security

### MCP Session Management
Authentication is handled automatically through the MCP protocol. Each client session maintains its own security context with proper isolation and audit logging.

### Security Features
- **Request Tracking**: Every API call is logged with unique request IDs
- **PAN Access Logging**: All sensitive card data access is monitored and audited
- **Rate Limiting**: Built-in protection against abuse and excessive usage
- **Input Validation**: Comprehensive validation of all parameters and data types
- **Error Sanitization**: Sensitive information is never exposed in error messages

### Environment Configuration
```env
# Required for production
NODE_ENV=production
LITHIC_API_KEY=your_production_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# Optional configuration
LITHIC_ENV=production
PORT=3000
MCP_TRANSPORT=http
```

---

## MCP Protocol Overview

### Protocol Structure
All communication follows JSON-RPC 2.0 over the Model Context Protocol:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "parameter": "value"
    }
  }
}
```

### Tool Discovery
```javascript
// Discover available tools
const toolList = await client.listTools();

// Example response structure
{
  "tools": [
    {
      "name": "health_check",
      "description": "Verify system health and connectivity",
      "inputSchema": {
        "type": "object",
        "properties": {
          "includeDetails": {
            "type": "boolean",
            "description": "Include detailed system information"
          }
        }
      }
    }
    // ... 12 additional tools
  ]
}
```

### Standard Response Format
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"data\":{...}}"
    }
  ]
}
```

---

## Tool Reference

### System Health Tools

#### `health_check`
**Purpose**: Verify system connectivity and service health  
**Business Use**: Operational monitoring and troubleshooting

**Parameters:**
```typescript
{
  includeDetails?: boolean  // Default: false
}
```

**Example:**
```javascript
const health = await client.callTool({
  name: 'health_check',
  arguments: { includeDetails: true }
});
```

**Response:**
```json
{
  "systemHealth": {
    "status": "healthy",
    "services": {
      "database": "connected",
      "lithic": "connected"
    },
    "environment": "production"
  }
}
```

### Card Management Tools

#### `list_available_cards`
**Purpose**: Retrieve inventory of available honeypot cards  
**Business Use**: Card portfolio management and availability tracking

**Parameters:**
```typescript
{
  includeDetails?: boolean  // Default: false
  activeOnly?: boolean      // Default: true
  limit?: number           // Default: 20, max: 100
}
```

**Example:**
```javascript
const cards = await client.callTool({
  name: 'list_available_cards',
  arguments: { 
    includeDetails: true, 
    activeOnly: true,
    limit: 50
  }
});
```

#### `get_card_details`
**Purpose**: Retrieve comprehensive card information including PAN access  
**Business Use**: Fraud investigation requiring full card details  
**Security**: PAN access is logged and audited

**Parameters:**
```typescript
{
  cardToken: string  // Required: Lithic card token
}
```

**Example:**
```javascript
const cardDetails = await client.callTool({
  name: 'get_card_details',
  arguments: { cardToken: 'card_abc12345' }
});
```

#### `create_honeypot_card`
**Purpose**: Deploy new honeypot cards for fraud detection  
**Business Use**: Dynamic honeypot creation for specific investigation scenarios

**Parameters:**
```typescript
{
  cardType?: string       // Default: 'VIRTUAL'
  spendLimit?: number     // Default: 1000 (USD cents)
  metadata?: object       // Optional card metadata
}
```

#### `update_card_limits`
**Purpose**: Modify spending limits on existing cards  
**Business Use**: Risk management and exposure control

**Parameters:**
```typescript
{
  cardToken: string       // Required: Card to update
  spendLimit: number      // Required: New limit in USD cents
}
```

#### `toggle_card_state`
**Purpose**: Activate or deactivate cards  
**Business Use**: Operational control and incident response

**Parameters:**
```typescript
{
  cardToken: string       // Required: Card to modify
  state: 'ACTIVE' | 'PAUSED'  // Required: Target state
}
```

### Transaction Intelligence Tools

#### `get_transaction`
**Purpose**: Retrieve detailed information for a specific transaction  
**Business Use**: Individual transaction investigation and analysis

**Parameters:**
```typescript
{
  transactionToken: string  // Required: Lithic transaction token
}
```

**Example:**
```javascript
const transaction = await client.callTool({
  name: 'get_transaction',
  arguments: { transactionToken: 'txn_abc12345' }
});
```

#### `search_transactions`
**Purpose**: Advanced multi-criteria transaction search  
**Business Use**: Pattern investigation and bulk transaction analysis

**Parameters:**
```typescript
{
  cardToken?: string      // Optional: Filter by specific card
  startDate?: string      // Optional: ISO date string
  endDate?: string        // Optional: ISO date string
  merchant?: string       // Optional: Merchant name filter
  status?: string         // Optional: Transaction status
  minAmount?: number      // Optional: Minimum amount filter
  maxAmount?: number      // Optional: Maximum amount filter
  limit?: number          // Default: 25, max: 100
}
```

**Example:**
```javascript
const transactions = await client.callTool({
  name: 'search_transactions',
  arguments: {
    cardToken: 'card_12345',
    startDate: '2024-01-01T00:00:00Z',
    merchant: 'SUSPICIOUS_STORE',
    minAmount: 10000,  // $100.00
    limit: 50
  }
});
```

#### `get_recent_transactions`
**Purpose**: Retrieve latest transactions for a specific card  
**Business Use**: Real-time monitoring and recent activity analysis

**Parameters:**
```typescript
{
  cardToken: string       // Required: Card to query
  limit?: number          // Default: 10, max: 50
  hours?: number          // Default: 24
}
```

#### `get_transactions_by_merchant`
**Purpose**: Analyze all transactions with a specific merchant  
**Business Use**: Merchant behavior analysis and fraud pattern detection

**Parameters:**
```typescript
{
  cardToken: string       // Required: Card to query
  merchantName: string    // Required: Merchant identifier
  limit?: number          // Default: 25, max: 100
}
```

#### `get_transaction_details`
**Purpose**: Comprehensive transaction analysis with enriched data  
**Business Use**: Deep forensic analysis of suspicious transactions

**Parameters:**
```typescript
{
  transactionToken: string  // Required: Transaction to analyze
  includeEnriched?: boolean // Default: true
}
```



### Real-Time Intelligence Tools

#### `subscribe_to_alerts`
**Purpose**: Real-time fraud alerting and monitoring  
**Business Use**: Proactive fraud detection and immediate response

**Parameters:**
```typescript
{
  cardToken?: string      // Optional: Card-specific alerts
  alertTypes?: string[]   // Optional: Specific alert categories
  severity?: string       // Default: 'medium' (low, medium, high, critical)
}
```

#### `get_live_transaction_feed`
**Purpose**: Real-time transaction stream monitoring  
**Business Use**: Live operational monitoring and immediate investigation

**Parameters:**
```typescript
{
  cardToken?: string      // Optional: Card-specific feed
  duration?: number       // Default: 60 (seconds)
  includeDetails?: boolean // Default: true
}
```



---

## Response Formats

### Success Response
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"success\",\"data\":{...},\"metadata\":{\"requestId\":\"req_123\",\"timestamp\":\"2024-12-06T10:00:00Z\"}}"
    }
  ]
}
```

### Error Response
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"status\":\"error\",\"error\":\"Invalid card token\",\"code\":\"INVALID_CARD_TOKEN\",\"requestId\":\"req_123\"}"
    }
  ]
}
```

### Data Types
- **Monetary Values**: All amounts in USD cents (integer)
- **Timestamps**: ISO 8601 format with timezone
- **Card Tokens**: Lithic format (card_xxxxxxxx)
- **Transaction Tokens**: Lithic format (txn_xxxxxxxx)

---

## Error Handling

### Standard Error Codes
- `INVALID_PARAMETERS`: Missing or invalid input parameters
- `CARD_NOT_FOUND`: Specified card token does not exist
- `TRANSACTION_NOT_FOUND`: Specified transaction token does not exist
- `DATABASE_ERROR`: Temporary database connectivity issue
- `LITHIC_API_ERROR`: External API failure or timeout
- `RATE_LIMIT_EXCEEDED`: Too many requests in time window
- `INSUFFICIENT_PERMISSIONS`: Operation not allowed for current context

### Error Response Structure
```typescript
{
  status: "error",
  error: string,        // Human-readable error message
  code: string,         // Machine-readable error code
  requestId: string,    // Unique request identifier for support
  timestamp: string,    // Error occurrence timestamp
  details?: object      // Additional context (development only)
}
```

### Recovery Guidelines
- **Transient Errors**: Implement exponential backoff retry
- **Invalid Parameters**: Validate inputs before submission
- **Rate Limits**: Implement client-side rate limiting
- **API Failures**: Check system health and retry after delay

---

## Performance Guidelines

### Response Time Expectations
- **Health Check**: < 50ms
- **Card Operations**: < 150ms
- **Transaction Queries**: < 200ms
- **Real-time Operations**: < 100ms

### Rate Limits
- **Standard Operations**: 60 requests/minute per client
- **Sensitive Operations**: 30 requests/minute per client
- **Real-time Feeds**: 10 concurrent streams per client

### Optimization Tips
- Use appropriate `limit` parameters to minimize data transfer
- Cache non-critical data on the client side
- Batch related operations when possible
- Monitor response times and adjust request patterns

---

## Integration Examples

### Transaction Investigation Workflow
```javascript
// Step 1: Get card details
const card = await client.callTool({
  name: 'get_card_details',
  arguments: { cardToken: 'card_suspect_123' }
});

// Step 2: Analyze recent activity
const recent = await client.callTool({
  name: 'get_recent_transactions',
  arguments: { cardToken: 'card_suspect_123', limit: 20 }
});

// Step 3: Search for suspicious patterns
const searchResults = await client.callTool({
  name: 'search_transactions',
  arguments: { 
    cardToken: 'card_suspect_123',
    minAmount: 10000,  // $100+
    startDate: '2024-01-01T00:00:00Z'
  }
});

// Step 4: Get detailed transaction information
const details = await client.callTool({
  name: 'get_transaction_details',
  arguments: { 
    transactionToken: 'txn_suspect_456'
  }
});
```

### Real-time Monitoring Setup
```javascript
// Subscribe to transaction alerts
const alertSub = await client.callTool({
  name: 'subscribe_to_alerts',
  arguments: { 
    cardTokens: ['card_123', 'card_456'],
    alertTypes: ['fraud_detected', 'unusual_pattern'],
    riskThreshold: 0.8
  }
});

// Monitor live transaction feed
const liveFeed = await client.callTool({
  name: 'get_live_transaction_feed',
  arguments: { 
    feedDuration: '15m',
    includeRealTimeAnalysis: true,
    maxTransactionsPerMinute: 20
  }
});
```

---

## Troubleshooting

### Common Issues

**Connection Problems**
```javascript
// Verify MCP transport configuration
const health = await client.callTool({
  name: 'health_check',
  arguments: { includeDetails: true }
});

// Check environment variables
console.log('Environment:', process.env.NODE_ENV);
console.log('Has Lithic Key:', !!process.env.LITHIC_API_KEY);
```

**Slow Response Times**
- Check network connectivity to Supabase and Lithic
- Review query complexity and limit parameters
- Monitor system resources and scaling needs

**Data Inconsistencies**
- Verify database connection health
- Check for recent Lithic API updates
- Review transaction synchronization status

### Support Resources
- **System Health**: Use `health_check` tool for diagnostics
- **Request Tracking**: All operations include unique request IDs
- **Error Logging**: Comprehensive logging for troubleshooting
- **Performance Monitoring**: Built-in response time tracking

---

## Changelog

### Version 1.0.0
- Initial enterprise release
- 13 specialized transaction monitoring tools
- Full MCP protocol implementation
- Production-ready security and monitoring

---

*Last Updated: December 2024 | API Version: 1.0.0 | Enterprise Grade* 