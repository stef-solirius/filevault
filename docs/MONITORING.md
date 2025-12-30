# FileVault Monitoring and Alerting

This document provides comprehensive information about the monitoring and alerting infrastructure for the FileVault application.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Metrics Catalog](#metrics-catalog)
- [Logging](#logging)
- [Dashboard Access](#dashboard-access)
- [Alert Descriptions](#alert-descriptions)
- [Setup Instructions](#setup-instructions)
- [Troubleshooting Guide](#troubleshooting-guide)

## Architecture Overview

FileVault uses a multi-layered monitoring approach combining:

1. **Prometheus** - Metrics collection and alerting
2. **Grafana** - Metrics visualization and dashboards
3. **Azure Application Insights** - Centralized logging and Azure-native monitoring
4. **Alertmanager** - Alert routing and notification management

```
┌─────────────────┐
│  FileVault App  │
│   (Node.js)     │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
    ┌────▼─────┐       ┌────▼────────────────┐
    │Prometheus│       │Application Insights │
    │ Metrics  │       │  (Azure Monitor)    │
    └────┬─────┘       └─────────────────────┘
         │
    ┌────▼─────┐
    │ Grafana  │
    │Dashboard │
    └──────────┘
         │
    ┌────▼──────────┐
    │ Alertmanager  │
    └───────────────┘
```

## Metrics Catalog

### HTTP Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|--------|
| `http_requests_total` | Counter | Total number of HTTP requests | method, route, status_code |
| `http_request_duration_seconds` | Histogram | HTTP request duration in seconds | method, route, status_code |
| `http_active_connections` | Gauge | Number of active HTTP connections | - |

### File Operation Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|--------|
| `file_operations_total` | Counter | Total number of file operations | operation, status |
| `azure_blob_operation_duration_seconds` | Histogram | Duration of Azure Blob operations | operation |

### Error Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|--------|
| `errors_total` | Counter | Total number of errors | type, operation |

### System Metrics

| Metric Name | Type | Description |
|------------|------|-------------|
| `process_resident_memory_bytes` | Gauge | Process memory usage in bytes |
| `process_cpu_user_seconds_total` | Counter | Total user CPU time |
| `process_cpu_system_seconds_total` | Counter | Total system CPU time |
| `nodejs_heap_size_used_bytes` | Gauge | Node.js heap memory used |
| `nodejs_heap_size_total_bytes` | Gauge | Node.js total heap size |

## Logging

### Log Levels

FileVault uses Winston for structured logging with the following levels:

- **error**: Application errors and exceptions
- **warn**: Warning messages for potential issues
- **info**: General informational messages
- **debug**: Detailed debugging information

### Log Configuration

Set the log level using the `LOG_LEVEL` environment variable (default: `info`).

### Log Structure

All logs are structured in JSON format with the following fields:

```json
{
  "timestamp": "2025-12-30T12:00:00.000Z",
  "level": "info",
  "message": "File uploaded successfully",
  "service": "filevault",
  "fileName": "example.txt",
  "blobName": "abc123",
  "duration": 0.534
}
```

### Azure Application Insights

When `APPLICATIONINSIGHTS_CONNECTION_STRING` is configured, logs are automatically sent to Azure Application Insights for centralized monitoring. This includes:

- Automatic request tracking
- Dependency tracking (Azure Blob Storage calls)
- Exception tracking
- Performance counters
- Custom events for file operations

## Dashboard Access

### Grafana

**Local Development (Docker Compose):**
- URL: http://localhost:3001
- Default Username: `admin`
- Default Password: `changeme`

**Kubernetes:**
- URL: Determined by LoadBalancer service
- Get the external IP: `kubectl get svc grafana`

**Pre-configured Dashboards:**
- **FileVault Application Metrics** - Main application monitoring dashboard

### Prometheus

**Local Development (Docker Compose):**
- URL: http://localhost:9090

**Kubernetes:**
- URL: Accessible via port-forward: `kubectl port-forward svc/prometheus 9090:9090`

### Alertmanager

**Local Development (Docker Compose):**
- URL: http://localhost:9093

**Kubernetes:**
- URL: Accessible via port-forward: `kubectl port-forward svc/alertmanager 9093:9093`

## Alert Descriptions

### Prometheus Alerts

#### HighErrorRate
- **Severity**: Warning
- **Threshold**: >10 errors per minute
- **Duration**: 2 minutes
- **Description**: Triggers when the application error rate exceeds 10 errors per minute
- **Action**: Check application logs and Azure Application Insights for error details

#### SlowResponseTime
- **Severity**: Warning
- **Threshold**: P95 latency >2 seconds
- **Duration**: 5 minutes
- **Description**: Triggers when 95th percentile response time exceeds 2 seconds
- **Action**: Investigate slow endpoints, check Azure Blob Storage performance

#### VerySlowResponseTime
- **Severity**: Critical
- **Threshold**: P95 latency >5 seconds
- **Duration**: 3 minutes
- **Description**: Triggers when response time is critically slow
- **Action**: Immediate investigation required, check system resources

#### HighMemoryUsage
- **Severity**: Warning
- **Threshold**: >400MB
- **Duration**: 5 minutes
- **Description**: Memory usage exceeds threshold
- **Action**: Check for memory leaks, consider scaling

#### ContainerDown
- **Severity**: Critical
- **Threshold**: Application unreachable
- **Duration**: 1 minute
- **Description**: Application container is down or unreachable
- **Action**: Check container status, review logs for crash information

#### HighUploadFailureRate
- **Severity**: Warning
- **Threshold**: >10% failure rate
- **Duration**: 3 minutes
- **Description**: File upload operations are failing
- **Action**: Check Azure Blob Storage connectivity and credentials

#### HighDeleteFailureRate
- **Severity**: Warning
- **Threshold**: >10% failure rate
- **Duration**: 3 minutes
- **Description**: File delete operations are failing
- **Action**: Check Azure Blob Storage permissions

#### SlowAzureBlobOperations
- **Severity**: Warning
- **Threshold**: P95 duration >5 seconds
- **Duration**: 5 minutes
- **Description**: Azure Blob Storage operations are slow
- **Action**: Check Azure Storage Account performance metrics

#### High5xxErrorRate
- **Severity**: Critical
- **Threshold**: >5% of requests
- **Duration**: 3 minutes
- **Description**: High rate of server errors
- **Action**: Investigate application errors, check dependencies

#### NoRequestsReceived
- **Severity**: Warning
- **Threshold**: 0 requests in 10 minutes
- **Duration**: 10 minutes
- **Description**: No traffic is reaching the application
- **Action**: Verify network connectivity, check load balancer/ingress

### Azure Monitor Alerts

#### High Exception Rate
- **Severity**: Warning (2)
- **Threshold**: >10 exceptions in 5 minutes
- **Description**: Application is throwing excessive exceptions

#### High Failed Requests
- **Severity**: Critical (1)
- **Threshold**: >5 failed requests in 10 minutes
- **Description**: High rate of failed HTTP requests

#### Slow Response Time
- **Severity**: Warning (2)
- **Threshold**: Average >3 seconds
- **Description**: Application response time is degraded

#### Low Availability
- **Severity**: Critical (1)
- **Threshold**: <95% availability
- **Description**: Application availability has dropped

#### File Upload Failures
- **Severity**: Warning (2)
- **Threshold**: >5 upload errors in 5 minutes
- **Description**: Multiple file upload operations failing

#### Azure Blob Errors
- **Severity**: Warning (2)
- **Threshold**: >3 blob operation failures in 5 minutes
- **Description**: Azure Blob Storage operations failing

## Setup Instructions

### Local Development with Docker Compose

1. **Configure Environment Variables**

   Copy `.env.example` to `.env` and configure:
   ```bash
   cp src/azure-sa/.env.example src/azure-sa/.env
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Start the Monitoring Stack**

   ```bash
   docker-compose -f config/docker-compose.yml up -d
   ```

4. **Access Dashboards**
   - Application: http://localhost:3000
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001
   - Alertmanager: http://localhost:9093

### Kubernetes Deployment

1. **Create Namespace (Optional)**

   ```bash
   kubectl create namespace monitoring
   ```

2. **Deploy Prometheus**

   ```bash
   kubectl apply -f config/k8s-prometheus-deployment.yaml
   ```

3. **Deploy Alertmanager**

   ```bash
   kubectl apply -f config/k8s-alertmanager-deployment.yaml
   ```

4. **Deploy Grafana**

   ```bash
   kubectl apply -f config/k8s-grafana-deployment.yaml
   ```

5. **Update Application Secrets**

   Edit `config/k8s-secrets.yaml` and add your Application Insights connection string:
   ```bash
   kubectl apply -f config/k8s-secrets.yaml
   ```

6. **Deploy Application**

   ```bash
   kubectl apply -f config/k8s-deployment.yaml
   kubectl apply -f config/k8s-service.yaml
   ```

### Azure Application Insights Setup

1. **Create Application Insights Resource**

   ```bash
   az monitor app-insights component create \
     --app filevault-insights \
     --location uksouth \
     --resource-group <your-resource-group> \
     --application-type web
   ```

2. **Get Connection String**

   ```bash
   az monitor app-insights component show \
     --app filevault-insights \
     --resource-group <your-resource-group> \
     --query connectionString -o tsv
   ```

3. **Configure Application**

   Add the connection string to your environment variables or secrets.

### Azure Monitor Alerts Deployment

1. **Create Action Group**

   First, create an action group for alert notifications via the Azure Portal or CLI.

2. **Deploy Alert Rules**

   ```bash
   az deployment group create \
     --resource-group <your-resource-group> \
     --template-file config/azure-monitor/alerts.json \
     --parameters appInsightsName=<your-app-insights-name> \
                  actionGroupId=<your-action-group-id>
   ```

## Troubleshooting Guide

### No Metrics in Grafana

**Problem**: Grafana dashboard shows no data

**Solutions**:
1. Verify Prometheus is scraping metrics:
   - Open Prometheus UI (http://localhost:9090)
   - Go to Status → Targets
   - Check if FileVault target is UP
   
2. Check application metrics endpoint:
   ```bash
   curl http://localhost:3000/metrics
   ```

3. Verify Grafana datasource:
   - Grafana → Configuration → Data Sources
   - Test Prometheus connection

### Prometheus Not Scraping Application

**Problem**: Prometheus shows target as DOWN

**Solutions**:
1. Verify application is running:
   ```bash
   docker ps  # or kubectl get pods
   ```

2. Check application logs:
   ```bash
   docker logs filevault-app  # or kubectl logs <pod-name>
   ```

3. Verify network connectivity:
   ```bash
   curl http://filevault:3000/metrics  # from Prometheus container
   ```

4. Check Prometheus configuration:
   - Verify targets in `config/prometheus/prometheus.yml`

### Application Insights Not Receiving Data

**Problem**: No telemetry in Azure Application Insights

**Solutions**:
1. Verify connection string is configured:
   ```bash
   echo $APPLICATIONINSIGHTS_CONNECTION_STRING
   ```

2. Check application logs for Application Insights errors

3. Verify network egress to Azure:
   - Ensure firewall allows HTTPS to `*.in.applicationinsights.azure.com`

4. Test connection:
   ```bash
   curl https://<region>.in.applicationinsights.azure.com
   ```

### Alerts Not Triggering

**Problem**: Expected alerts are not firing

**Solutions**:
1. Check Alertmanager status:
   - Open Alertmanager UI
   - Verify routing configuration

2. Verify alert rules in Prometheus:
   - Prometheus UI → Alerts
   - Check if alerts are pending/firing

3. Check Alertmanager logs:
   ```bash
   docker logs alertmanager  # or kubectl logs <alertmanager-pod>
   ```

4. Test webhook endpoints if configured

### High Memory Usage

**Problem**: Application consuming excessive memory

**Solutions**:
1. Check metrics in Grafana dashboard
2. Review Application Insights performance data
3. Inspect for memory leaks in logs
4. Consider increasing resource limits
5. Check for large file uploads causing memory spikes

### Slow Response Times

**Problem**: Application response time is degraded

**Solutions**:
1. Check Azure Blob Storage latency in Grafana
2. Review Application Insights dependency tracking
3. Inspect network connectivity to Azure Storage
4. Check Azure Storage Account metrics in Azure Portal
5. Consider using CDN for file downloads
6. Review application logs for slow operations

## Best Practices

1. **Regular Review**: Review dashboards and alerts weekly
2. **Tune Thresholds**: Adjust alert thresholds based on actual usage patterns
3. **Log Retention**: Configure appropriate retention periods for logs and metrics
4. **Documentation**: Keep runbooks updated for alert responses
5. **Testing**: Regularly test alert notifications
6. **Security**: Rotate Grafana admin password and secure dashboards
7. **Backup**: Backup Prometheus data and Grafana configurations

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Azure Application Insights Documentation](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [Node.js Monitoring Best Practices](https://nodejs.org/en/docs/guides/diagnostics/)
