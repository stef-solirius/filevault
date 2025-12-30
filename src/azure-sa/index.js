const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Application Insights if connection string is provided
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    const appInsights = require('applicationinsights');
    appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true)
        .setUseDiskRetryCaching(true)
        .start();
}

const logger = require('./logger');
const { register, metrics } = require('./metrics');
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

const sharedKeyCredential = new StorageSharedKeyCredential(
    process.env.AZURE_STORAGE_ACCOUNT_NAME,
    process.env.AZURE_STORAGE_ACCOUNT_KEY
);

const blobServiceClient = new BlobServiceClient(
    `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    sharedKeyCredential
);

const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);

const filesDataPath = './filesData.json';

const loadFilesData = () => {
    if (fs.existsSync(filesDataPath)) {
        const data = fs.readFileSync(filesDataPath);
        return JSON.parse(data);
    }
    return [];
};

const saveFilesData = (files) => {
    fs.writeFileSync(filesDataPath, JSON.stringify(files, null, 2));
};

let files = loadFilesData();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        logger.error('Error generating metrics', { error: err.message });
        res.status(500).end(err);
    }
});

app.post('/upload', upload.single('file'), async (req, res) => {
    const fileName = req.body.note;
    if (!fileName) {
        return res.status(400).send('File name is required.');
    }

    if (req.file) {
        const uploadStart = Date.now();
        try {
            const blobName = req.file.filename;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            await blockBlobClient.uploadFile(req.file.path);
            const uploadDuration = (Date.now() - uploadStart) / 1000;
            metrics.azureBlobOperationDuration.observe({ operation: 'upload' }, uploadDuration);

            fs.unlinkSync(req.file.path); // remove the file locally after upload

            files.push({ name: fileName, key: blobName });
            saveFilesData(files);

            metrics.fileOperations.inc({ operation: 'upload', status: 'success' });
            logger.info('File uploaded successfully', { fileName, blobName, duration: uploadDuration });
            res.status(200).send('File uploaded successfully.');
        } catch (err) {
            metrics.fileOperations.inc({ operation: 'upload', status: 'failure' });
            metrics.errorTotal.inc({ type: 'azure_blob', operation: 'upload' });
            logger.error('Error uploading file', { error: err.message, fileName });
            res.status(500).send('Failed to upload file.');
        }
    } else {
        res.status(400).send('No file uploaded.');
    }
});

app.get('/files', (req, res) => {
    // Reload files from disk to ensure fresh data
    files = loadFilesData();
    res.json(files);
});

app.delete('/files/:key', async (req, res) => {
    const fileKey = req.params.key;
    const deleteStart = Date.now();

    try {
        const blockBlobClient = containerClient.getBlockBlobClient(fileKey);
        await blockBlobClient.delete();
        const deleteDuration = (Date.now() - deleteStart) / 1000;
        metrics.azureBlobOperationDuration.observe({ operation: 'delete' }, deleteDuration);

        files = files.filter(file => file.key !== fileKey);
        saveFilesData(files);

        metrics.fileOperations.inc({ operation: 'delete', status: 'success' });
        logger.info('File deleted successfully', { fileKey, duration: deleteDuration });
        res.status(200).send('File deleted successfully.');
    } catch (err) {
        metrics.fileOperations.inc({ operation: 'delete', status: 'failure' });
        metrics.errorTotal.inc({ type: 'azure_blob', operation: 'delete' });
        logger.error('Error deleting file', { error: err.message, fileKey });
        res.status(500).send('Failed to delete file.');
    }
});

// Only start server if this file is run directly (not required in tests)
if (require.main === module) {
    app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
