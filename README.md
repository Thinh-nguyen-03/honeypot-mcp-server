# Honeypot MCP Server

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

The Honeypot MCP Server is a transaction monitoring system built on the Model Context Protocol (MCP). It provides AI agents with tools to monitor and analyze transactions from Lithic honeypot cards for fraud detection and investigation purposes.

## Features

- **18 MCP Tools**: Comprehensive set of tools for transaction monitoring and fraud investigation
- **Transaction Analysis**: Rule-based pattern detection and fraud indicators
- **Card Management**: Create and manage honeypot cards via Lithic API
- **Real-time Monitoring**: Health checks and transaction monitoring capabilities
- **MCP Protocol**: Native support for Model Context Protocol with HTTP and Stdio transports

## Quick Start

### Prerequisites

- Node.js 18.0.0+
- Supabase account and database
- Lithic API access

### Installation

```bash
git clone <repository-url>
cd honeypot-mcp-server
npm ci
```

### Configuration

Create a `.env` file with the following variables:

```env
# Core Configuration
NODE_ENV=production
PORT=3000

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# Financial API
LITHIC_API_KEY=your_lithic_api_key
LITHIC_ENV=production

# Optional Features
LITHIC_WEBHOOK_SECRET=your_webhook_secret
ENABLE_POLLING=true
POLLING_INTERVAL_MS=5000
MCP_TRANSPORT=http
```

### Testing

```bash
# Run test suite
npm test

# Run security tests
npm run test:security

# Run performance tests
npm run test:performance
```

### Running

```bash
# Start the server
npm start

# Check health
curl http://localhost:3000/health
```

## MCP Tools

The server provides 18 tools organized by category:

### System Operations (1 tool)
- `health_check` - System health monitoring

### Card Management (5 tools)
- `list_available_cards` - List available honeypot cards
- `get_card_details` - Get detailed card information
- `create_honeypot_card` - Create new honeypot cards
- `update_card_limits` - Update card spending limits
- `toggle_card_state` - Activate/deactivate cards

### Transaction Intelligence (5 tools)
- `get_transaction` - Get single transaction details
- `search_transactions` - Search transactions with filters
- `get_recent_transactions` - Get recent transactions for a card
- `get_transactions_by_merchant` - Get transactions by merchant
- `get_transaction_details` - Get comprehensive transaction information

### Pattern Analysis (4 tools)
- `analyze_transaction_patterns` - Analyze spending patterns
- `detect_fraud_indicators` - Rule-based fraud detection
- `generate_merchant_intelligence` - Analyze merchant patterns
- `perform_risk_assessment` - Calculate risk scores

### Real-Time Intelligence (3 tools)
- `subscribe_to_alerts` - Set up transaction alerts
- `get_live_transaction_feed` - Monitor real-time transactions
- `analyze_spending_patterns` - Analyze behavioral patterns

## Fraud Detection

The fraud detection system uses rule-based analysis including:

- Transaction frequency monitoring
- Declined transaction tracking  
- Merchant pattern analysis
- Amount pattern detection
- Basic risk scoring

**Note**: The system includes placeholder ML prediction responses for development purposes, but the actual fraud detection is rule-based.

## Technology Stack

- **Runtime**: Node.js with ES Modules
- **Database**: Supabase (PostgreSQL)
- **Financial API**: Lithic Virtual Card Platform
- **Protocol**: Model Context Protocol (MCP)
- **Testing**: Vitest framework

## API Integration

### MCP Client Example

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
```

### Health Check

```javascript
const health = await client.callTool({
  name: 'health_check',
  arguments: { includeDetails: true }
});
```

## Development

### Project Structure

```
src/
├── config/           # Configuration and client setup
├── handlers/         # MCP tool implementations
├── schemas/          # Tool input/output schemas
├── services/         # Business logic services
└── utils/           # Utilities and helpers

tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
├── security/        # Security tests
└── performance/     # Performance tests
```

### Testing

The project includes comprehensive test coverage:

- Unit tests for all handlers and services
- Integration tests for MCP protocol compliance
- Security tests for authentication and data handling
- Performance tests for response times

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

The application can be deployed on:
- Railway (recommended, with included `railway.json`)
- Docker containers
- Traditional servers

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.