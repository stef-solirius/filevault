const winston = require('winston');
const { AzureApplicationInsightsLogger } = require('winston-azure-application-insights');

const logLevel = process.env.LOG_LEVEL || 'info';

// Create base transports
const transports = [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
        )
    })
];

// Add Azure Application Insights transport if connection string is provided
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    transports.push(
        new AzureApplicationInsightsLogger({
            insights: require('applicationinsights')
        })
    );
}

const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'filevault' },
    transports
});

module.exports = logger;
