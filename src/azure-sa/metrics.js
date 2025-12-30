const promClient = require('prom-client');

// Create a Registry to register metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
    name: 'http_active_connections',
    help: 'Number of active HTTP connections'
});

const fileOperations = new promClient.Counter({
    name: 'file_operations_total',
    help: 'Total number of file operations',
    labelNames: ['operation', 'status']
});

const azureBlobOperationDuration = new promClient.Histogram({
    name: 'azure_blob_operation_duration_seconds',
    help: 'Duration of Azure Blob Storage operations in seconds',
    labelNames: ['operation'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const errorTotal = new promClient.Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'operation']
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(fileOperations);
register.registerMetric(azureBlobOperationDuration);
register.registerMetric(errorTotal);

// Middleware to track HTTP metrics
const metricsMiddleware = (req, res, next) => {
    const start = Date.now();
    activeConnections.inc();

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;

        httpRequestDuration.observe(
            { method: req.method, route, status_code: res.statusCode },
            duration
        );

        httpRequestTotal.inc({
            method: req.method,
            route,
            status_code: res.statusCode
        });

        activeConnections.dec();
    });

    next();
};

module.exports = {
    register,
    metricsMiddleware,
    metrics: {
        fileOperations,
        azureBlobOperationDuration,
        errorTotal
    }
};
