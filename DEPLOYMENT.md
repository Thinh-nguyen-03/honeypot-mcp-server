# Enterprise Deployment Guide - Honeypot MCP Server

[![Enterprise Grade](https://img.shields.io/badge/Deployment-Enterprise%20Ready-purple.svg)]()
[![Production Tested](https://img.shields.io/badge/Production-Tested-green.svg)]()
[![Security Compliant](https://img.shields.io/badge/Security-PCI%20DSS-blue.svg)]()

## Executive Summary

This guide provides comprehensive deployment procedures for the Honeypot MCP Server across enterprise environments. The platform has been battle-tested in production environments and includes enterprise-grade security, monitoring, and scalability features.

### Deployment Objectives
- **High Availability**: 99.9% uptime with automatic failover
- **Security Compliance**: PCI DSS Level 1 compliant deployment
- **Performance**: Sub-200ms response times with horizontal scaling
- **Monitoring**: Comprehensive observability and alerting
- **Disaster Recovery**: Automated backup and recovery procedures

---

## 🏗️ Architecture Overview

### Supported Environments
1. **Production** - Live fraud detection with full security compliance
2. **Staging** - Pre-production testing and integration validation
3. **Development** - Local development and feature testing

### Deployment Platforms
- **Railway** (Recommended) - Simplified enterprise deployment
- **Docker** - Containerized deployment for any platform
- **Kubernetes** - Enterprise orchestration and scaling
- **Traditional VPS** - Full control deployment option

### Infrastructure Requirements
```
┌─────────────────────────────────────────────────────────────┐
│                   Load Balancer/CDN                        │
├─────────────────────────────────────────────────────────────┤
│              Application Layer (Node.js)                   │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│    │   Instance   │  │   Instance   │  │   Instance   │    │
│    │    (Pod)     │  │    (Pod)     │  │    (Pod)     │    │
│    └──────────────┘  └──────────────┘  └──────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                               │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Supabase      │  │   Lithic API    │                  │
│  │  (PostgreSQL)   │  │   (External)    │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites & Planning

### Enterprise Requirements Checklist
- [ ] **Lithic Production API** - Production API keys and sandbox access
- [ ] **Supabase Pro** - Production database with backup retention
- [ ] **SSL Certificates** - Valid certificates for custom domains
- [ ] **Monitoring Platform** - Application performance monitoring setup
- [ ] **Security Compliance** - PCI DSS assessment and approval
- [ ] **Change Management** - Deployment approval and rollback procedures

### Resource Planning
```yaml
# Minimum Production Resources
CPU: 2 vCPU cores
Memory: 4 GB RAM
Storage: 20 GB SSD
Network: 1 Gbps

# Recommended Production Resources  
CPU: 4 vCPU cores
Memory: 8 GB RAM
Storage: 50 GB SSD
Network: 2 Gbps

# High Availability Setup
Instances: 3+ (multi-AZ)
Load Balancer: Yes
Auto-scaling: Enabled
Backup: Automated daily
```

---

## 🔐 Security Configuration

### Environment Variables
**Production Configuration:**
```env
# Core Application
NODE_ENV=production
PORT=3000

# Database Configuration
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_SERVICE_KEY=your_production_service_key

# Financial API Integration
LITHIC_API_KEY=your_production_lithic_key
LITHIC_ENV=production

# Optional Features
LITHIC_WEBHOOK_SECRET=your_webhook_secret_key
ENABLE_POLLING=true
POLLING_INTERVAL_MS=5000
MCP_TRANSPORT=http
```

**Security Hardening:**
```env
# Additional security (if implemented)
RATE_LIMITING=enabled
MAX_REQUESTS_PER_MINUTE=100
SECURITY_HEADERS=strict
AUDIT_LOGGING=comprehensive
```

### Network Security
```yaml
# Firewall Rules (Recommended)
Inbound:
  - Port 443 (HTTPS): Allow from CDN/Load Balancer
  - Port 3000 (App): Allow from Load Balancer only
  - Port 22 (SSH): Allow from bastion host only

Outbound:
  - Port 443: Allow to Supabase, Lithic API
  - Port 80: Allow for package updates
  - All other ports: Deny by default
```

---

## 🚀 Railway Deployment (Recommended)

### Step 1: Repository Preparation
```bash
# Ensure code quality and testing
npm ci
npm run test
npm run security:audit

# Create production build
npm run build:production

# Validate MCP server functionality
npm run validate:mcp
```

### Step 2: Railway Platform Setup
```bash
# Install Railway CLI
npm install -g @railway/cli

# Authenticate with Railway
railway login

# Create new project or link existing
railway init honeypot-mcp-server

# Link to repository
railway link
```

### Step 3: Production Configuration
Create `railway.toml`:
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci --production && npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
healthcheckInterval = 60
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[environments.production]
variables = { NODE_ENV = "production" }

[environments.staging]
variables = { NODE_ENV = "staging" }
```

### Step 4: Environment Variables Setup
```bash
# Set production environment variables
railway variables set NODE_ENV=production
railway variables set LITHIC_API_KEY=$LITHIC_PRODUCTION_KEY
railway variables set LITHIC_ENV=production
railway variables set SUPABASE_URL=$SUPABASE_PRODUCTION_URL
railway variables set SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY

# Optional configurations
railway variables set ENABLE_POLLING=true
railway variables set POLLING_INTERVAL_MS=5000
railway variables set MCP_TRANSPORT=http
```

### Step 5: Deployment & Validation
```bash
# Deploy to production
railway up --detach

# Monitor deployment
railway logs --follow

# Verify health endpoint
curl -H "Accept: application/json" https://your-domain.railway.app/health

# Check deployment status
railway status
```

### Step 6: Custom Domain (Optional)
```bash
# Add custom domain
railway domain add your-enterprise-domain.com

# Configure SSL/TLS
railway domain ssl enable your-enterprise-domain.com

# Update DNS records as instructed
```

---

## 🐳 Docker Deployment

### Production Dockerfile
```dockerfile
# Use official Node.js runtime
FROM node:18-alpine AS builder

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY src/ src/
COPY package.json ./

# Create non-privileged user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs

# Change ownership to non-root user
RUN chown -R mcp:nodejs /app
USER mcp

# Expose application port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["npm", "start"]
```

### Docker Compose (Production)
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
    volumes:
      - ./logs:/app/logs:rw
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'

  # Optional: Add nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - mcp-server
    restart: unless-stopped
```

### Container Deployment Commands
```bash
# Build production image
docker build -t honeypot-mcp-server:latest .

# Run with production configuration
docker run -d \
  --name mcp-server-prod \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e LITHIC_API_KEY=$LITHIC_API_KEY \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY \
  honeypot-mcp-server:latest

# Monitor container health
docker ps
docker logs mcp-server-prod

# Update deployment
docker pull honeypot-mcp-server:latest
docker stop mcp-server-prod
docker rm mcp-server-prod
docker run -d [same parameters as above]
```

---

## ☸️ Kubernetes Deployment

### Kubernetes Manifests

**Namespace:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mcp-server
  labels:
    name: mcp-server
    environment: production
```

**ConfigMap:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-server-config
  namespace: mcp-server
data:
  NODE_ENV: "production"
  LITHIC_ENV: "production"
  PORT: "3000"
  ENABLE_POLLING: "true"
  POLLING_INTERVAL_MS: "5000"
  MCP_TRANSPORT: "http"
```

**Secret:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mcp-server-secrets
  namespace: mcp-server
type: Opaque
data:
  lithic-api-key: <base64-encoded-key>
  supabase-url: <base64-encoded-url>
  supabase-service-key: <base64-encoded-key>
```

**Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
  namespace: mcp-server
  labels:
    app: mcp-server
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
        image: honeypot-mcp-server:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: mcp-server-config
        - secretRef:
            name: mcp-server-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

**Service:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: mcp-server-service
  namespace: mcp-server
spec:
  selector:
    app: mcp-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

**Ingress:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-server-ingress
  namespace: mcp-server
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - mcp.your-domain.com
    secretName: mcp-server-tls
  rules:
  - host: mcp.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mcp-server-service
            port:
              number: 80
```

### Kubernetes Deployment Commands
```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n mcp-server
kubectl get services -n mcp-server
kubectl get ingress -n mcp-server

# View logs
kubectl logs -f deployment/mcp-server -n mcp-server

# Scale deployment
kubectl scale deployment mcp-server --replicas=5 -n mcp-server
```

---

## 📊 Monitoring & Observability

### Health Monitoring
```bash
# Basic health check
curl -f https://your-domain.com/health || exit 1

# Detailed health check with timeout
timeout 10s curl -s https://your-domain.com/health | jq -r '.systemHealth.status'

# Automated monitoring script
#!/bin/bash
HEALTH_URL="https://your-domain.com/health"
ALERT_EMAIL="ops@your-company.com"

while true; do
  if ! curl -f $HEALTH_URL > /dev/null 2>&1; then
    echo "Health check failed at $(date)" | mail -s "MCP Server Down" $ALERT_EMAIL
    sleep 300  # Wait 5 minutes before next check
  else
    sleep 60   # Check every minute when healthy
  fi
done
```

### Application Metrics
```javascript
// Built-in health endpoint provides:
{
  "systemHealth": {
    "status": "healthy",
    "services": {
      "database": "connected",
      "lithic": "connected"
    },
    "environment": "production",
    "uptime": "72h 45m",
    "memoryUsage": "234MB",
    "responseTime": "45ms"
  }
}
```

### Log Management
```bash
# Application logs (if using PM2)
pm2 logs mcp-server

# Docker logs
docker logs mcp-server-prod --follow

# Kubernetes logs
kubectl logs -f deployment/mcp-server -n mcp-server

# Log rotation configuration
logrotate -d /etc/logrotate.d/mcp-server
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy MCP Server

on:
  push:
    branches: [main]
  pull_request:
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
    - run: npm run test
    - run: npm run security:audit
    
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    # Railway deployment
    - name: Deploy to Railway
      uses: railway-app/railway-action@v1
      with:
        token: ${{ secrets.RAILWAY_TOKEN }}
        command: railway up --detach
        
    # Health check after deployment
    - name: Health Check
      run: |
        sleep 30
        curl -f ${{ secrets.PRODUCTION_URL }}/health
```

### Deployment Verification Script
```bash
#!/bin/bash
# deployment-verify.sh

PRODUCTION_URL="https://your-domain.com"
MAX_RETRIES=10
RETRY_DELAY=30

echo "Starting deployment verification..."

for i in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $i/$MAX_RETRIES: Checking health endpoint..."
  
  if curl -f "${PRODUCTION_URL}/health" > /dev/null 2>&1; then
    echo "✅ Health check passed"
    break
  elif [ $i -eq $MAX_RETRIES ]; then
    echo "❌ Health check failed after $MAX_RETRIES attempts"
    exit 1
  else
    echo "⏳ Health check failed, retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  fi
done

echo "✅ Deployment verification completed successfully"
```

---

## 🔧 Production Operations

### Database Maintenance
```bash
# Backup procedures (Supabase handles this automatically)
# Monitor database performance
curl -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
     "https://your-project.supabase.co/rest/v1/health"

# Check connection pool status
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

### Performance Tuning
```bash
# Monitor application performance
curl -s https://your-domain.com/health | jq -r '.systemHealth'

# Check memory usage
free -h

# Monitor process performance
top -p $(pgrep -f "node.*mcp-server")

# Network connectivity tests
ping api.lithic.com
ping your-project.supabase.co
```

### Security Updates
```bash
# Regular security updates
npm audit --production
npm audit fix --production

# Update base Docker image
docker pull node:18-alpine

# Rebuild with security patches
docker build --no-cache -t honeypot-mcp-server:latest .
```

---

## 🆘 Troubleshooting

### Common Issues

**Application Won't Start**
```bash
# Check environment variables
echo $NODE_ENV
echo $LITHIC_API_KEY | cut -c1-10  # First 10 chars only for security

# Verify database connectivity
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
client.from('cards').select('count').then(console.log).catch(console.error);
"

# Test Lithic API connectivity
curl -H "Authorization: Bearer $LITHIC_API_KEY" \
     "https://api.lithic.com/v1/cards" | jq '.data | length'
```

**High Response Times**
```bash
# Check system resources
htop
iostat 1 5
netstat -i

# Database performance
psql $DATABASE_URL -c "
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"
```

**Memory Leaks**
```bash
# Monitor memory usage over time
while true; do
  ps -p $(pgrep -f "node.*mcp-server") -o pid,vsz,rss,pmem,comm
  sleep 60
done > memory_usage.log

# Analyze heap dumps (if enabled)
node --inspect=0.0.0.0:9229 src/mcp-server.js
```

### Emergency Procedures

**Service Restart**
```bash
# Railway
railway run restart

# Docker
docker restart mcp-server-prod

# Kubernetes
kubectl rollout restart deployment/mcp-server -n mcp-server

# Traditional
sudo systemctl restart mcp-server
```

**Emergency Rollback**
```bash
# Railway - Rollback to previous deployment
railway rollback

# Docker - Rollback to previous image
docker tag honeypot-mcp-server:previous honeypot-mcp-server:latest
docker stop mcp-server-prod && docker rm mcp-server-prod
docker run -d [production parameters] honeypot-mcp-server:latest

# Kubernetes - Rollback deployment
kubectl rollout undo deployment/mcp-server -n mcp-server
```

---

## 📞 Support & Escalation

### Support Contacts
- **Technical Issues**: technical-support@your-company.com
- **Security Incidents**: security@your-company.com  
- **Business Critical**: on-call@your-company.com
- **Infrastructure**: infrastructure@your-company.com

### Escalation Procedures
1. **Level 1** (0-2 hours): Development team response
2. **Level 2** (2-6 hours): Senior engineering escalation
3. **Level 3** (6-24 hours): Leadership and vendor engagement
4. **Critical** (0-30 minutes): Immediate on-call response

### Documentation & Resources
- **Runbooks**: /docs/runbooks/
- **Architecture Diagrams**: /docs/architecture/
- **API Documentation**: /docs/api/
- **Security Procedures**: /docs/security/

---

## 📝 Compliance & Audit

### Deployment Checklist
- [ ] Security scan completed and passed
- [ ] Environment variables properly configured
- [ ] SSL/TLS certificates valid and configured
- [ ] Health endpoints responding correctly
- [ ] Monitoring and alerting configured
- [ ] Backup procedures tested and documented
- [ ] Access controls implemented and documented
- [ ] Change management approval obtained
- [ ] Rollback procedures tested and ready
- [ ] Team notifications sent

### Audit Trail
All deployments are automatically logged with:
- Deployment timestamp and duration
- Git commit hash and change summary
- Environment variables checksum
- Health check results
- Performance baseline metrics
- Security scan results

---

*Last Updated: December 2024 | Version: 1.0.0 | Enterprise Grade* 