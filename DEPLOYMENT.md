# Deployment Guide - Honeypot MCP Server

## Overview

This guide covers deploying the Honeypot MCP Server to production environments. The server is a Node.js application that connects to Supabase (PostgreSQL) and the Lithic API for transaction monitoring and fraud detection.

## Prerequisites

- Node.js 18.0.0+
- Supabase account with database access
- Lithic API account and credentials
- Deployment platform account (Railway recommended)

## Environment Configuration

### Required Environment Variables

```env
# Core Application
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

## Railway Deployment (Recommended)

Railway provides the simplest deployment option with automatic builds and environment management.

### Step 1: Prepare Repository

```bash
# Ensure tests pass
npm ci
npm test
npm run test:security

# Run pre-deployment checks
npm run pre-deploy-check
```

### Step 2: Railway Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Authenticate
railway login

# Create/link project
railway init honeypot-mcp-server
railway link
```

### Step 3: Configuration

The project includes a `railway.json` configuration:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node src/mcp-server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 4: Set Environment Variables

```bash
# Core variables
railway variables set NODE_ENV=production
railway variables set LITHIC_API_KEY=$LITHIC_API_KEY
railway variables set LITHIC_ENV=production
railway variables set SUPABASE_URL=$SUPABASE_URL
railway variables set SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY

# Optional variables
railway variables set ENABLE_POLLING=true
railway variables set POLLING_INTERVAL_MS=5000
railway variables set MCP_TRANSPORT=http
```

### Step 5: Deploy

```bash
# Deploy to Railway
railway up --detach

# Monitor deployment
railway logs --follow

# Check health endpoint
curl https://your-app.railway.app/health
```

### Step 6: Custom Domain (Optional)

```bash
# Add custom domain
railway domain add your-domain.com

# Configure DNS as instructed by Railway
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ src/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs

# Change ownership
RUN chown -R mcp:nodejs /app
USER mcp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LITHIC_API_KEY=${LITHIC_API_KEY}
      - LITHIC_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - ENABLE_POLLING=true
      - POLLING_INTERVAL_MS=5000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

### Container Commands

```bash
# Build image
docker build -t honeypot-mcp-server:latest .

# Run container
docker run -d \
  --name mcp-server \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e LITHIC_API_KEY=$LITHIC_API_KEY \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY \
  honeypot-mcp-server:latest

# Check status
docker ps
docker logs mcp-server
```

## Health Monitoring

### Health Endpoint

The server includes a health check endpoint at `/health`:

```bash
curl https://your-domain.com/health
```

Response format:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": {
    "hasSupabaseUrl": true,
    "hasSupabaseKey": true,
    "hasLithicKey": true,
    "nodeEnv": "production"
  }
}
```

### Monitoring Script

```bash
#!/bin/bash
HEALTH_URL="https://your-domain.com/health"

while true; do
  if curl -f $HEALTH_URL > /dev/null 2>&1; then
    echo "✅ Health check passed"
    sleep 60
  else
    echo "❌ Health check failed at $(date)"
    sleep 60
  fi
done
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy MCP Server

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - run: npm ci
    - run: npm test
    - run: npm run test:security
    
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Railway
      uses: railway-app/railway-action@v1
      with:
        token: ${{ secrets.RAILWAY_TOKEN }}
        command: railway up --detach
        
    - name: Health Check
      run: |
        sleep 30
        curl -f ${{ secrets.PRODUCTION_URL }}/health
```

## Troubleshooting

### Common Issues

**Application Won't Start**
```bash
# Check environment variables
echo $NODE_ENV
echo $LITHIC_API_KEY | cut -c1-10  # First 10 chars for security

# Test database connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
client.from('transactions').select('count').then(console.log).catch(console.error);
"

# Test Lithic API
curl -H "Authorization: Bearer $LITHIC_API_KEY" \
     "https://api.lithic.com/v1/cards"
```

**High Response Times**
```bash
# Check system resources
top
free -h

# Monitor application logs
docker logs mcp-server --follow
# or
railway logs --follow
```

### Emergency Procedures

**Service Restart**
```bash
# Railway
railway up --detach

# Docker
docker restart mcp-server

# Check status
curl https://your-domain.com/health
```

**View Logs**
```bash
# Railway
railway logs --follow

# Docker
docker logs mcp-server --follow
```

## Security Considerations

- Store sensitive environment variables securely
- Use strong API keys and rotate them regularly
- Monitor logs for unusual activity
- Keep dependencies updated with `npm audit`
- Use HTTPS in production
- Restrict API access to necessary IP ranges when possible

## Support

For issues:
1. Check the health endpoint
2. Review application logs
3. Verify environment variables
4. Test external API connections (Supabase, Lithic)
5. Check deployment platform status 