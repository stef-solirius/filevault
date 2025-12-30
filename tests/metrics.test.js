const { register, metricsMiddleware, metrics } = require('../src/azure-sa/metrics');

describe('Metrics Module', () => {
    beforeEach(() => {
        register.clear();
    });

    describe('Register', () => {
        it('should export a register object', () => {
            expect(register).toBeDefined();
            expect(typeof register).toBe('object');
        });

        it('should have metrics method', async () => {
            expect(register.metrics).toBeDefined();
            expect(typeof register.metrics).toBe('function');
        });

        it('should return metrics in Prometheus format', async () => {
            const metricsOutput = await register.metrics();
            expect(typeof metricsOutput).toBe('string');
        });

        it('should have contentType', () => {
            expect(register.contentType).toBeDefined();
            expect(typeof register.contentType).toBe('string');
        });
    });

    describe('Custom Metrics', () => {
        it('should export fileOperations counter', () => {
            expect(metrics.fileOperations).toBeDefined();
            expect(typeof metrics.fileOperations.inc).toBe('function');
        });

        it('should export azureBlobOperationDuration histogram', () => {
            expect(metrics.azureBlobOperationDuration).toBeDefined();
            expect(typeof metrics.azureBlobOperationDuration.observe).toBe('function');
        });

        it('should export errorTotal counter', () => {
            expect(metrics.errorTotal).toBeDefined();
            expect(typeof metrics.errorTotal.inc).toBe('function');
        });

        it('should increment fileOperations counter', () => {
            expect(() => {
                metrics.fileOperations.inc({ operation: 'upload', status: 'success' });
            }).not.toThrow();
        });

        it('should observe azureBlobOperationDuration', () => {
            expect(() => {
                metrics.azureBlobOperationDuration.observe({ operation: 'upload' }, 1.5);
            }).not.toThrow();
        });

        it('should increment errorTotal counter', () => {
            expect(() => {
                metrics.errorTotal.inc({ type: 'azure_blob', operation: 'upload' });
            }).not.toThrow();
        });
    });

    describe('Metrics Middleware', () => {
        it('should export metricsMiddleware function', () => {
            expect(metricsMiddleware).toBeDefined();
            expect(typeof metricsMiddleware).toBe('function');
        });

        it('should call next function', () => {
            const mockReq = {
                method: 'GET',
                path: '/test',
                route: { path: '/test' }
            };
            const mockRes = {
                on: jest.fn(),
                statusCode: 200
            };
            const mockNext = jest.fn();

            metricsMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
        });

        it('should track request metrics on response finish', (done) => {
            const mockReq = {
                method: 'POST',
                path: '/upload',
                route: { path: '/upload' }
            };
            let finishCallback;
            const mockRes = {
                on: jest.fn((event, callback) => {
                    if (event === 'finish') {
                        finishCallback = callback;
                    }
                }),
                statusCode: 200
            };
            const mockNext = jest.fn();

            metricsMiddleware(mockReq, mockRes, mockNext);

            // Simulate response finish
            setTimeout(() => {
                finishCallback();
                done();
            }, 10);
        });
    });
});
