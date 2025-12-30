const logger = require('../src/azure-sa/logger');

// Mock winston and applicationinsights
jest.mock('winston', () => {
    const mFormat = {
        combine: jest.fn(() => ({})),
        timestamp: jest.fn(() => ({})),
        errors: jest.fn(() => ({})),
        json: jest.fn(() => ({})),
        colorize: jest.fn(() => ({})),
        simple: jest.fn(() => ({})),
        printf: jest.fn(() => ({}))
    };
    const mTransports = {
        Console: jest.fn(),
        File: jest.fn()
    };
    return {
        format: mFormat,
        transports: mTransports,
        createLogger: jest.fn(() => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        }))
    };
});

jest.mock('winston-azure-application-insights', () => {
    const EventEmitter = require('events');
    return {
        AzureApplicationInsightsLogger: jest.fn().mockImplementation(() => {
            const transport = new EventEmitter();
            transport.log = jest.fn((info, cb) => {
                if (cb && typeof cb === 'function') cb();
            });
            return transport;
        })
    };
});

describe('Logger Module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should export a logger object', () => {
        expect(logger).toBeDefined();
        expect(typeof logger).toBe('object');
    });

    it('should have info method', () => {
        expect(logger.info).toBeDefined();
        expect(typeof logger.info).toBe('function');
    });

    it('should have warn method', () => {
        expect(logger.warn).toBeDefined();
        expect(typeof logger.warn).toBe('function');
    });

    it('should have error method', () => {
        expect(logger.error).toBeDefined();
        expect(typeof logger.error).toBe('function');
    });

    it('should have debug method', () => {
        expect(logger.debug).toBeDefined();
        expect(typeof logger.debug).toBe('function');
    });

    it('should call logger methods without errors', () => {
        expect(() => logger.info('Test info message')).not.toThrow();
        expect(() => logger.warn('Test warn message')).not.toThrow();
        expect(() => logger.error('Test error message')).not.toThrow();
        expect(() => logger.debug('Test debug message')).not.toThrow();
    });

    it('should log with metadata', () => {
        const metadata = { userId: '123', action: 'upload' };
        expect(() => logger.info('Test message', metadata)).not.toThrow();
    });
});
