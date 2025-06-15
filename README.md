# 🍯 Honeypot MCP Server

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Enterprise-grade fraud detection platform with real-time AI integration for transaction monitoring and scammer verification.**

## Overview

The Honeypot MCP Server is a production-ready fraud detection platform that leverages Lithic virtual cards as honeypots to detect and analyze fraudulent activities in real-time. It provides AI agents with 18 specialized tools for comprehensive transaction intelligence and fraud prevention.

### Key Features

- **Real-Time Fraud Detection**: Sub-200ms transaction monitoring and alerts
- **Comprehensive Transaction Intelligence**: 18 specialized MCP tools for fraud detection
- **Secure Card Access**: PCI DSS compliant card management with full audit trails
- **AI Integration**: Native support for AI agents via Model Context Protocol (MCP)
- **Enterprise Security**: Bank-grade security with comprehensive monitoring

---

## Technology Stack

- **Runtime**: Node.js 18+ with ES Modules
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **External APIs**: Lithic Financial API for virtual cards
- **AI Integration**: Model Context Protocol (MCP) with 18 fraud detection tools
- **Security**: Enterprise-grade validation and audit logging

---

## Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Supabase** account and project
- **Lithic** API account and credentials

---

## Quick Start

### 1. Installation

```bash
git clone <repository-url>
cd honeypot-mcp-server
npm install
```

### 2. Configuration

Create a `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Lithic API Configuration
LITHIC_API_KEY=your_lithic_api_key

# Server Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
```

### 3. Database Setup

Ensure your Supabase database has the required tables:
- `transactions` - Transaction records
- `merchants` - Merchant information
- `cards` - Virtual card management

### 4. Start the Server

```bash
# Production mode
npm start

# Development mode
npm run dev
```

### 5. Health Check

```bash
curl http://localhost:3000/health
```

---

## MCP Tools

The server provides 18 specialized tools for AI agents:

### System Health
- `health_check` - System health monitoring

### Card Management (5 tools)
- `list_available_cards` - List available honeypot cards
- `get_card_details` - Retrieve detailed card information
- `create_honeypot_card` - Create new honeypot cards
- `update_card_limits` - Modify card spending limits
- `toggle_card_state` - Activate/deactivate cards

### Transaction Query (5 tools)
- `get_transaction` - Retrieve specific transaction
- `search_transactions` - Advanced transaction search
- `get_recent_transactions` - Latest transactions for a card
- `get_transactions_by_merchant` - Merchant-specific transactions
- `get_transaction_details` - Comprehensive transaction analysis

### Pattern Analysis (4 tools)
- `analyze_transaction_patterns` - Behavioral pattern analysis
- `detect_fraud_indicators` - ML-powered fraud detection
- `generate_merchant_intelligence` - Merchant insights
- `perform_risk_assessment` - Risk scoring

### Real-time Intelligence (4 tools)
- `subscribe_to_alerts` - Real-time fraud alerts
- `get_live_transaction_feed` - Live transaction stream
- `analyze_spending_patterns` - Real-time pattern analysis
- `generate_verification_questions` - Cardholder verification

---

## Usage Example

### Connecting AI Agent

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

### Health Check

```javascript
const health = await client.callTool({
  name: 'health_check',
  arguments: { includeDetails: true }
});
```

### Card Management

```javascript
// List available cards
const cards = await client.callTool({
  name: 'list_available_cards',
  arguments: { includeDetails: true, activeOnly: true }
});

// Get card details
const cardDetails = await client.callTool({
  name: 'get_card_details',
  arguments: { cardToken: 'card_abc123' }
});
```

### Transaction Analysis

```javascript
// Search transactions
const transactions = await client.callTool({
  name: 'search_transactions',
  arguments: {
    cardToken: 'card_12345',
    startDate: '2024-01-01T00:00:00Z',
    limit: 25
  }
});

// Analyze patterns
const patterns = await client.callTool({
  name: 'analyze_transaction_patterns',
  arguments: {
    cardToken: 'card_12345',
    analysisWindow: '30d'
  }
});
```

---

## Security

### Data Protection
- All sensitive data is encrypted and logged securely
- PCI DSS compliant data handling
- Comprehensive audit trails for all operations
- Token-based authentication with rate limiting

### Access Control
- All card PAN access is logged and monitored
- Request ID tracking for complete audit trails
- Suspicious pattern detection and alerting

---

## Performance

### Response Times
- System Health: < 50ms
- Card Management: < 150ms  
- Transaction Queries: < 200ms
- Pattern Analysis: < 200ms

### Rate Limits
- Standard operations: 60 requests/minute
- Sensitive operations: 30 requests/minute

---

## API Documentation

For comprehensive API documentation, see [API_REFERENCE.md](./API_REFERENCE.md).

---

## Deployment

For production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Support

### Health Monitoring
Use the `health_check` tool to verify system status and connectivity.

### Logging
All operations are logged with structured JSON logs for monitoring and debugging.

### Error Handling
Comprehensive error responses with specific error codes and recovery suggestions.

---

**Version**: 1.0.0  
**License**: MIT 