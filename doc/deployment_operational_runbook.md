# Deployment and Operational Runbook

## Enterprise Inventory & POS Management System

**Version:** 1.0.0
**Last Updated:** 2025-10-10
**Prepared By:** AI Assistant

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Guide](#deployment-guide)
4. [Configuration](#configuration)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Backup & Recovery](#backup--recovery)
7. [Maintenance Procedures](#maintenance-procedures)
8. [Troubleshooting](#troubleshooting)
9. [Security Procedures](#security-procedures)
10. [Performance Optimization](#performance-optimization)
11. [Scaling Guide](#scaling-guide)
12. [Disaster Recovery](#disaster-recovery)

---

## System Overview

### Architecture Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend API** | PocketBase (Go + SQLite) | Data storage, business logic, real-time sync |
| **Frontend Web** | React + TypeScript + Vite | Admin dashboard, inventory management |
| **Frontend Mobile** | React Native + Expo | POS terminal interface |
| **Database** | SQLite (embedded) | Primary data persistence |
| **Reverse Proxy** | Nginx | Load balancing, SSL termination |
| **Monitoring** | Prometheus + Grafana | System monitoring and alerting |
| **Backup Storage** | AWS S3 / MinIO | Automated backups |

### Infrastructure Requirements

#### Minimum Production Setup
- **Server:** 2 vCPU, 4GB RAM, 50GB SSD
- **Network:** 100Mbps internet connection
- **OS:** Ubuntu 22.04 LTS or CentOS 8+
- **Domain:** SSL certificate (Let's Encrypt)

#### Recommended Production Setup
- **Server:** 4 vCPU, 8GB RAM, 100GB SSD
- **Network:** 200Mbps internet connection
- **Load Balancer:** Nginx for multiple instances
- **Database:** PostgreSQL for high-traffic scenarios

---

## Prerequisites

### System Requirements

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y curl wget git unzip

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Go (v1.19+)
wget https://go.dev/dl/go1.19.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.19.5.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Network Requirements

- **Inbound Ports:** 80 (HTTP), 443 (HTTPS), 8090 (PocketBase admin)
- **Outbound:** Allow all for package updates and API calls
- **Firewall:** Configure UFW or firewalld

```bash
# UFW Configuration
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8090
sudo ufw --force enable
```

### SSL Certificate Setup

```bash
# Install Certbot
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com
```

---

## Deployment Guide

### Automated Deployment Script

```bash
#!/bin/bash
# deploy.sh - Complete deployment script

set -e

# Configuration
APP_NAME="inventory-pos"
DOMAIN="yourdomain.com"
PB_PORT=8090
WEB_PORT=3000

echo "🚀 Starting deployment of $APP_NAME"

# Create application directory
sudo mkdir -p /opt/$APP_NAME
sudo chown $USER:$USER /opt/$APP_NAME

# Download and setup PocketBase
cd /opt/$APP_NAME
wget https://github.com/pocketbase/pocketbase/releases/download/v0.30.2/pocketbase_0.30.2_linux_amd64.zip
unzip pocketbase_0.30.2_linux_amd64.zip

# Create systemd service for PocketBase
cat > /etc/systemd/system/pocketbase.service << EOF
[Unit]
Description=PocketBase Backend
After=network.target

[Service]
User=$USER
WorkingDirectory=/opt/$APP_NAME
ExecStart=/opt/$APP_NAME/pocketbase serve --http=0.0.0.0:$PB_PORT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Setup frontend
mkdir frontend
cd frontend
npm install
npm run build

# Configure Nginx
cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # PocketBase API
    location /api/ {
        proxy_pass http://127.0.0.1:$PB_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # PocketBase admin (restrict to internal IPs)
    location /_ {
        allow 127.0.0.1;
        deny all;
        proxy_pass http://127.0.0.1:$PB_PORT;
        proxy_set_header Host \$host;
    }

    # Frontend application
    location / {
        root /opt/$APP_NAME/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Start services
sudo systemctl enable pocketbase
sudo systemctl start pocketbase

echo "✅ Deployment completed successfully!"
echo "🌐 Frontend: https://$DOMAIN"
echo "🔧 Admin Panel: https://$DOMAIN/_/"
echo "📊 API: https://$DOMAIN/api/"
```

### Docker Deployment (Alternative)

```yaml
# docker-compose.yml
version: '3.8'

services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    container_name: inventory-pos-backend
    restart: unless-stopped
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb_data
      - ./pb_hooks:/pb_hooks
      - ./pb_migrations:/pb_migrations
    environment:
      - POCKETBASE_ENCRYPTION_KEY=your-encryption-key-here

  nginx:
    image: nginx:alpine
    container_name: inventory-pos-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - pocketbase

  prometheus:
    image: prom/prometheus
    container_name: inventory-pos-prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana
    container_name: inventory-pos-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

---

## Configuration

### Environment Variables

```bash
# .env file
# PocketBase Configuration
POCKETBASE_ENCRYPTION_KEY=your-256-bit-secret-key-here

# Database Configuration
PB_DB_MAX_OPEN_CONNS=100
PB_DB_MAX_IDLE_CONNS=20

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Frontend Configuration
VITE_PB_URL=https://yourdomain.com
VITE_APP_NAME=Inventory POS System
VITE_SUPPORT_EMAIL=support@yourdomain.com

# Monitoring Configuration
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3001
```

### PocketBase Configuration

```json
// pb_data/config.json
{
  "logs": {
    "maxAge": 7,
    "maxSize": 100,
    "logLevel": "info"
  },
  "backups": {
    "cron": "0 2 * * *",
    "maxKeep": 7
  },
  "email": {
    "enabled": true,
    "host": "smtp.gmail.com",
    "port": 587,
    "username": "your-email@gmail.com",
    "password": "your-app-password",
    "from": "noreply@yourdomain.com"
  }
}
```

---

## Monitoring & Alerting

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'pocketbase'
    static_configs:
      - targets: ['localhost:8090']
    metrics_path: '/api/health/metrics'
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
```

### Alert Rules

```yaml
# monitoring/alert_rules.yml
groups:
  - name: inventory-pos-alerts
    rules:
      - alert: HighResponseTime
        expr: http_request_duration_seconds{quantile="0.95"} > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}"

      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space"
          description: "Disk space is below 10%"
```

### Grafana Dashboards

Create dashboards for:
- System Performance (CPU, Memory, Disk)
- Application Metrics (Response Times, Error Rates)
- Business Metrics (Sales, Inventory Levels)
- Database Performance (Query Times, Connection Pool)

---

## Backup & Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/opt/inventory-pos/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
echo "Backing up database..."
sqlite3 /opt/inventory-pos/pb_data/data.db ".backup '${BACKUP_DIR}/db_${TIMESTAMP}.db'"

# Configuration backup
echo "Backing up configuration..."
tar -czf "${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz" \
  /opt/inventory-pos/pb_data/config.json \
  /etc/nginx/sites-available/inventory-pos

# Upload to cloud storage
echo "Uploading to cloud storage..."
aws s3 cp "${BACKUP_DIR}/db_${TIMESTAMP}.db" "s3://backups/database/"
aws s3 cp "${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz" "s3://backups/config/"

# Cleanup old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "db_*.db" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "config_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully"
```

### Recovery Procedure

```bash
#!/bin/bash
# restore.sh

BACKUP_TIMESTAMP="20231010_020000"
BACKUP_BUCKET="your-backup-bucket"

# Stop services
sudo systemctl stop pocketbase
sudo systemctl stop nginx

# Download backups
aws s3 cp "s3://${BACKUP_BUCKET}/database/db_${BACKUP_TIMESTAMP}.db" /tmp/db_restore.db
aws s3 cp "s3://${BACKUP_BUCKET}/config/config_${BACKUP_TIMESTAMP}.tar.gz" /tmp/

# Restore database
cp /tmp/db_restore.db /opt/inventory-pos/pb_data/data.db

# Restore configuration
cd /tmp
tar -xzf config_${BACKUP_TIMESTAMP}.tar.gz
cp -r etc/nginx/sites-available/inventory-pos /etc/nginx/sites-available/

# Restart services
sudo systemctl start pocketbase
sudo systemctl reload nginx

echo "Restore completed successfully"
```

---

## Maintenance Procedures

### Daily Maintenance

```bash
# Log rotation
sudo logrotate /etc/logrotate.d/pocketbase

# Update package lists
sudo apt update

# Check disk usage
df -h

# Monitor log files
tail -f /opt/inventory-pos/logs/app.log
```

### Weekly Maintenance

```bash
# Database optimization
sqlite3 /opt/inventory-pos/pb_data/data.db "VACUUM;"

# Check for security updates
sudo apt list --upgradable

# Review error logs
grep "ERROR" /opt/inventory-pos/logs/*.log | tail -20

# Monitor backup integrity
ls -la /opt/inventory-pos/backups/
```

### Monthly Maintenance

```bash
# Full system backup verification
./backup.sh

# Security audit
sudo lynis audit system

# Performance review
# Check slow queries, optimize indexes

# Update dependencies
npm audit fix
go mod tidy
```

---

## Troubleshooting

### Common Issues

#### PocketBase Not Starting

```bash
# Check logs
journalctl -u pocketbase -f

# Check port availability
sudo netstat -tlnp | grep 8090

# Validate configuration
/opt/inventory-pos/pocketbase check
```

#### Database Connection Issues

```bash
# Check SQLite file permissions
ls -la /opt/inventory-pos/pb_data/data.db

# Test database integrity
sqlite3 /opt/inventory-pos/pb_data/data.db "PRAGMA integrity_check;"

# Check disk space
df -h /opt/inventory-pos
```

#### Frontend Build Issues

```bash
# Clear cache and rebuild
cd /opt/inventory-pos/frontend
rm -rf node_modules dist
npm install
npm run build
```

#### High Memory Usage

```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Restart services if needed
sudo systemctl restart pocketbase
sudo systemctl restart nginx
```

### Performance Issues

#### Slow API Responses

```bash
# Enable query logging
# Check database indexes
sqlite3 /opt/inventory-pos/pb_data/data.db ".schema"

# Monitor slow queries
# Add database indexes as needed
```

#### High CPU Usage

```bash
# Check system load
uptime
top -c

# Review application logs for errors
tail -f /opt/inventory-pos/logs/app.log
```

---

## Security Procedures

### Access Control

```bash
# SSH hardening
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl reload sshd

# Fail2Ban setup
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### Security Updates

```bash
# Regular updates
sudo apt update && sudo apt upgrade -y

# Kernel updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades

# Dependency updates
cd /opt/inventory-pos/frontend && npm audit fix
```

### Incident Response

1. **Detection**: Monitor alerts and logs
2. **Assessment**: Evaluate impact and scope
3. **Containment**: Isolate affected systems
4. **Recovery**: Restore from backups
5. **Lessons Learned**: Update procedures

---

## Performance Optimization

### Database Optimization

```sql
-- Analyze query performance
EXPLAIN QUERY PLAN SELECT * FROM products WHERE category = ?;

-- Add indexes for common queries
CREATE INDEX idx_products_category_stock ON products(category, stock);
CREATE INDEX idx_sales_created_user ON sales(created DESC, user);
CREATE INDEX idx_inventory_entries_product_type ON inventory_entries(product, type);
```

### Application Optimization

```typescript
// Implement caching
const productCache = new Map<string, Product>();

export const getCachedProduct = async (id: string): Promise<Product> => {
  if (productCache.has(id)) {
    return productCache.get(id)!;
  }

  const product = await productService.findOne(id);
  productCache.set(id, product);
  return product;
};
```

### CDN and Static Assets

```nginx
# Nginx configuration for CDN
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Content-Type-Options nosniff;

    # Optional: Serve from CDN
    # proxy_pass https://cdn.yourdomain.com;
}
```

---

## Scaling Guide

### Vertical Scaling

```bash
# Increase server resources
# AWS EC2 instance type upgrade
aws ec2 modify-instance-attribute \
  --instance-id i-1234567890abcdef0 \
  --instance-type t3.large

# Database optimization
sqlite3 /opt/inventory-pos/pb_data/data.db "PRAGMA cache_size = -2000000;"  # 2GB cache
sqlite3 /opt/inventory-pos/pb_data/data.db "PRAGMA temp_store = memory;"
```

### Horizontal Scaling

```yaml
# Load balancer configuration
upstream pocketbase_backend {
    ip_hash;  # Session persistence
    server 10.0.1.10:8090;
    server 10.0.1.11:8090;
    server 10.0.1.12:8090;
}

# Database read replicas (future PostgreSQL migration)
# pocketbase-replica:
#   image: pocketbase:latest
#   command: serve --read-only
```

### Database Migration (SQLite to PostgreSQL)

```sql
-- Export data
sqlite3 /opt/inventory-pos/pb_data/data.db .dump > database_dump.sql

-- Convert and import to PostgreSQL
createdb inventory_pos
psql inventory_pos < converted_dump.sql

-- Update connection string
POCKETBASE_DATABASE_URL=postgres://user:password@localhost/inventory_pos
```

---

## Disaster Recovery

### Business Continuity Plan

#### RTO (Recovery Time Objective): 4 hours
#### RPO (Recovery Point Objective): 1 hour

### Emergency Procedures

```bash
# Emergency shutdown
sudo systemctl stop pocketbase nginx

# Data recovery
./restore.sh latest

# Service restoration
sudo systemctl start nginx
sudo systemctl start pocketbase

# Verification
curl -f https://yourdomain.com/api/health
```

### Communication Plan

- **Internal Team**: Slack channel #incidents
- **Stakeholders**: Email distribution list
- **Customers**: Status page and email notifications
- **Emergency Contacts**: On-call rotation system

---

## Support and Documentation

### Documentation Structure

```
/docs/
├── user-guides/
│   ├── getting-started.md
│   ├── pos-terminal.md
│   └── inventory-management.md
├── api-docs/
│   ├── authentication.md
│   ├── products-api.md
│   └── sales-api.md
├── troubleshooting/
│   ├── common-issues.md
│   └── error-codes.md
└── deployment/
    ├── installation.md
    └── maintenance.md
```

### Support Procedures

1. **Level 1 Support**: Basic troubleshooting, documentation lookup
2. **Level 2 Support**: Code fixes, configuration changes
3. **Level 3 Support**: Architecture changes, custom development

### Training Requirements

- **Administrators**: Full system training (2 days)
- **Cashiers**: POS terminal training (4 hours)
- **Managers**: Reporting and analytics training (1 day)

---

## Compliance and Auditing

### Data Retention Policy

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Sales Transactions | 7 years | Tax compliance |
| Audit Logs | 3 years | Security compliance |
| User Activity | 2 years | GDPR compliance |
| System Logs | 1 year | Operational needs |

### Audit Procedures

```bash
# Generate audit reports
./scripts/audit-report.sh --start-date 2023-01-01 --end-date 2023-12-31

# Compliance checks
./scripts/compliance-check.sh --gdpr --pci-dss

# Data export for regulators
./scripts/data-export.sh --user-id 123 --format json
```

---

**This runbook serves as the comprehensive guide for deploying, operating, and maintaining the Inventory & POS Management System. Regular updates and reviews are recommended to ensure continued effectiveness and security.**