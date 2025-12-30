const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Mock modules before requiring the app
jest.mock('@azure/storage-blob');
jest.mock('applicationinsights', () => ({
    setup: jest.fn().mockReturnThis(),
    setAutoDependencyCorrelation: jest.fn().mockReturnThis(),
    setAutoCollectRequests: jest.fn().mockReturnThis(),
    setAutoCollectPerformance: jest.fn().mockReturnThis(),
    setAutoCollectExceptions: jest.fn().mockReturnThis(),
    setAutoCollectDependencies: jest.fn().mockReturnThis(),
    setAutoCollectConsole: jest.fn().mockReturnThis(),
    setUseDiskRetryCaching: jest.fn().mockReturnThis(),
    start: jest.fn(),
    defaultClient: {
        config: {},
        context: { keys: {}, tags: {} }
    }
}));

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

let mockBlockBlobClient;
let mockContainerClient;

const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

// Set up persistent mocks before any tests
mockBlockBlobClient = {
    uploadFile: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({})
};

mockContainerClient = {
    getBlockBlobClient: jest.fn().mockReturnValue(mockBlockBlobClient)
};

BlobServiceClient.mockImplementation(() => ({
    getContainerClient: jest.fn().mockReturnValue(mockContainerClient)
}));

StorageSharedKeyCredential.mockImplementation(() => ({}));

describe('Azure Storage FileVault API', () => {
    let app;
    let filesDataPath;

    beforeAll(() => {
        // Set environment variables before any module loading
        process.env.AZURE_STORAGE_ACCOUNT_NAME = 'testaccount';
        process.env.AZURE_STORAGE_ACCOUNT_KEY = 'test-key';
        process.env.AZURE_CONTAINER_NAME = 'test-container';
        process.env.PORT = 3000;

        filesDataPath = path.join(__dirname, '../src/azure-sa/filesData.json');

        // Load the app once with mocks in place
        app = require('../src/azure-sa/index.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset filesData.json to empty array
        fs.writeFileSync(filesDataPath, '[]');

        // Reset mock implementations
        mockBlockBlobClient.uploadFile.mockResolvedValue({});
        mockBlockBlobClient.delete.mockResolvedValue({});
    });

    afterEach(() => {
        // Clean up test files and uploads directory
        if (fs.existsSync(filesDataPath)) {
            fs.writeFileSync(filesDataPath, '[]');
        }
        const uploadsDir = path.join(__dirname, '../uploads');
        if (fs.existsSync(uploadsDir)) {
            fs.readdirSync(uploadsDir).forEach(file => {
                fs.unlinkSync(path.join(uploadsDir, file));
            });
        }
    });

    afterAll(() => {
        // Final cleanup
        if (fs.existsSync(filesDataPath)) {
            fs.writeFileSync(filesDataPath, '[]');
        }
    });

    describe('GET /metrics', () => {
        it('should return Prometheus metrics', async () => {
            const response = await request(app)
                .get('/metrics')
                .expect(200);

            expect(response.text).toContain('# HELP');
        });
    });

    describe('GET /files', () => {
        it('should return empty array when no files exist', async () => {
            const response = await request(app)
                .get('/files')
                .expect(200);

            expect(response.body).toEqual([]);
        });

        it('should return list of files when files exist', async () => {
            const testFiles = [
                { name: 'test1.txt', key: 'key1' },
                { name: 'test2.txt', key: 'key2' }
            ];
            fs.writeFileSync(filesDataPath, JSON.stringify(testFiles));

            const response = await request(app)
                .get('/files')
                .expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body[0].name).toBe('test1.txt');
        });
    });

    describe('POST /upload', () => {
        it('should return 400 when file name is not provided', async () => {
            const response = await request(app)
                .post('/upload')
                .field('note', '')
                .expect(400);

            expect(response.text).toBe('File name is required.');
        });

        it('should return 400 when no file is uploaded', async () => {
            const response = await request(app)
                .post('/upload')
                .field('note', 'test.txt')
                .expect(400);

            expect(response.text).toBe('No file uploaded.');
        });

        it('should upload file successfully', async () => {
            const testFile = path.join(__dirname, 'test-file.txt');
            fs.writeFileSync(testFile, 'test content');

            const response = await request(app)
                .post('/upload')
                .field('note', 'test.txt')
                .attach('file', testFile)
                .expect(200);

            expect(response.text).toBe('File uploaded successfully.');
            expect(mockBlockBlobClient.uploadFile).toHaveBeenCalled();

            // Clean up
            fs.unlinkSync(testFile);
        });
    });

    describe('DELETE /files/:key', () => {
        it('should delete file successfully', async () => {
            const testFiles = [{ name: 'test.txt', key: 'test-key' }];
            fs.writeFileSync(filesDataPath, JSON.stringify(testFiles));

            const response = await request(app)
                .delete('/files/test-key')
                .expect(200);

            expect(response.text).toBe('File deleted successfully.');
            expect(mockBlockBlobClient.delete).toHaveBeenCalled();
        });

        it('should return error when Azure deletion fails', async () => {
            mockBlockBlobClient.delete.mockRejectedValue(new Error('Blob not found'));

            const response = await request(app)
                .delete('/files/nonexistent-key')
                .expect(500);

            expect(response.text).toBe('Failed to delete file.');
        });
    });
});
