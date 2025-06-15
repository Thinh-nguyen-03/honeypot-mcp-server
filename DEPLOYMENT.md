# Deployment Guide: Honeypot MCP Server

## 🚀 Deployment Overview

This guide covers deployment of the Honeypot MCP Server across different environments, from local development to production deployment on cloud platforms.

## 🏗️ Deployment Architecture

### Target Environments
1. **Local Development** - For development and testing
2. **Staging** - For integration testing with AI agents
3. **Production** - For live scammer verification scenarios

### Deployment Options
- **Railway** (Recommended) - Simple, git-based deployment
- **Heroku** - Platform-as-a-Service with easy scaling
- **Docker** - Containerized deployment for any platform
- **VPS/Dedicated Server** - Full control deployment

## 📋 Prerequisites

### Required Accounts & Access
- [ ] **Lithic Account** with API access (sandbox for staging, production for live)
- [ ] **Supabase Project** with database and API keys
- [ ] **Deployment Platform Account** (Railway, Heroku, etc.)
- [ ] **Domain Name** (optional, for custom domains)
- [ ] **Monitoring Service** (optional, for observability)

### Required Environment Variables
```bash
# Core Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Lithic Integration
LITHIC_API_KEY=your_production_lithic_key
LITHIC_ENVIRONMENT=production  # or 'sandbox' for staging

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security
MCP_AUTH_TOKEN=your_secure_bearer_token
JWT_SECRET=your_jwt_secret_key

# Performance & Limits
MAX_CONCURRENT_CONNECTIONS=50
REQUEST_TIMEOUT_MS=30000
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key
```

## 🚢 Railway Deployment (Recommended)

### Step 1: Prepare Repository
```bash
# Ensure your MCP server is ready
npm test
npm run validate-mcp

# Create production build
npm run build

# Test production configuration
npm run start:prod
```

### Step 2: Railway Setup
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to project (or create new)
railway link

# Add environment variables
railway variables set NODE_ENV=production
railway variables set LITHIC_API_KEY=your_key
railway variables set SUPABASE_URL=your_url
# ... add all other environment variables
```

### Step 3: Configure Railway
Create `railway.toml`:
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[environments.production]
variables = { NODE_ENV = "production" }

[environments.staging]
variables = { NODE_ENV = "staging" }
```

### Step 4: Deploy
```bash
# Deploy to production
railway up

# Check deployment status
railway status

# View logs
railway logs

# Set up custom domain (optional)
railway domain add your-domain.com
```

## 🐳 Docker Deployment

### Step 1: Create Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ src/
COPY package.json .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001

# Change ownership and switch to non-root user
RUN chown -R mcp:nodejs /app
USER mcp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node src/health-check.js

# Start the application
CMD ["npm", "start"]
```

### Step 2: Create Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LITHIC_API_KEY=${LITHIC_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "src/health-check.js"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      - redis
      
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### Step 3: Deploy with Docker
```bash
# Build image
docker build -t honeypot-mcp-server .

# Run container
docker run -d \
  --name mcp-server \
  --env-file .env.production \
  -p 3000:3000 \
  honeypot-mcp-server

# Or use docker-compose
docker-compose up -d

# Check status
docker ps
docker logs mcp-server
```

## ☁️ Heroku Deployment

### Step 1: Heroku Setup
```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-mcp-server-name

# Add buildpack
heroku buildpacks:set heroku/nodejs
```

### Step 2: Configure Heroku
Create `Procfile`:
```
web: npm start
```

Add environment variables:
```bash
heroku config:set NODE_ENV=production
heroku config:set LITHIC_API_KEY=your_key
heroku config:set SUPABASE_URL=your_url
# ... add all variables
```

### Step 3: Deploy
```bash
# Deploy
git push heroku main

# Scale dyno
heroku ps:scale web=1

# View logs
heroku logs --tail

# Open app
heroku open
```

## 🔧 Production Configuration

### Performance Optimizations
```javascript
// src/config/production.js
export const productionConfig = {
  // Connection pooling
  database: {
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  },

  // Caching
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxKeys: 1000
  },

  // Rate limiting
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false
  },

  // Logging
  logging: {
    level: 'info',
    format: 'json',
    enableRequestLogging: true
  }
};
```

### Health Check Endpoint
```javascript
// src/health-check.js
import { createServer } from 'http';
import { checkDatabaseConnection } from './services/supabase-service.js';
import { checkLithicConnection } from './services/lithic-service.js';

const healthCheck = async () => {
  try {
    // Check database
    await checkDatabaseConnection();
    
    // Check Lithic API
    await checkLithicConnection();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: 'ok',
        lithic: 'ok',
        memory: process.memoryUsage()
      }
    };
  } catch (error) {
    throw new Error(`Health check failed: ${error.message}`);
  }
};

// Health check server (for Docker)
if (process.argv[2] === '--check') {
  healthCheck()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
```

## 📊 Monitoring & Observability

### Application Monitoring
```javascript
// src/monitoring/setup.js
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

// Sentry setup
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new ProfilingIntegration(),
  ],
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});

// Custom metrics
export const metrics = {
  mcpToolCalls: new Map(),
  responseTime: new Map(),
  errorRate: 0,
  
  recordToolCall(toolName, duration, success) {
    const key = `${toolName}_${success ? 'success' : 'error'}`;
    this.mcpToolCalls.set(key, (this.mcpToolCalls.get(key) || 0) + 1);
    this.responseTime.set(toolName, duration);
  }
};
```

### Log Aggregation
```javascript
// src/utils/logger.js (Production configuration)
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ['pan', 'cvv', 'password', 'token'],
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export default logger;
```

### Alerting Configuration
```yaml
# alertmanager.yml (for Prometheus/Grafana setup)
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@yourcompany.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    email_configs:
      - to: 'team@yourcompany.com'
        subject: 'MCP Server Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
```

## 🔒 Security Hardening

### SSL/TLS Configuration
```bash
# Let's Encrypt SSL (for custom domains)
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration
```bash
# UFW setup (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Application-specific rules
sudo ufw allow from trusted.ip.address to any port 3000
```

### Environment Security
```bash
# Secure environment variables
chmod 600 .env.production

# Use secret management
# Railway Secrets, Heroku Config Vars, or external secret managers
```

## 🚨 Troubleshooting

### Common Deployment Issues

#### 1. Build Failures
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for missing dependencies
npm audit
```

#### 2. Runtime Errors
```bash
# Check logs
railway logs  # or heroku logs --tail

# Debug locally with production config
NODE_ENV=production npm start

# Test MCP connection
npm run test:mcp
```

#### 3. Database Connection Issues
```javascript
// Test database connectivity
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
};
```

#### 4. Lithic API Issues
```javascript
// Test Lithic API connectivity
const testLithicAPI = async () => {
  try {
    const response = await lithic.cards.list({ count: 1 });
    console.log('Lithic API connection successful');
  } catch (error) {
    console.error('Lithic API connection failed:', error);
  }
};
```

### Performance Issues
```bash
# Monitor resource usage
top
htop

# Check memory leaks
node --inspect src/mcp-server.js

# Profile performance
npm run profile
```

## 📈 Scaling & Load Balancing

### Horizontal Scaling
```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: your-registry/honeypot-mcp-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        # ... other env vars
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Load Balancer Configuration
```nginx
# nginx.conf
upstream mcp_servers {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://mcp_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy MCP Server

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:mcp

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        uses: railway/deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
          service: mcp-server
```

This deployment guide provides comprehensive coverage for deploying the Honeypot MCP Server across different environments with proper monitoring, security, and scaling considerations. 