const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

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

app.post('/upload', upload.single('file'), async (req, res) => {
    const fileName = req.body.note;
    if (!fileName) {
        return res.status(400).send('File name is required.');
    }

    if (req.file) {
        try {
            const fileStream = fs.createReadStream(req.file.path);
            const uploadParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: req.file.filename,
                Body: fileStream
            };

            const upload = new Upload({
                client: s3,
                params: uploadParams
            });

            await upload.done();
            fs.unlinkSync(req.file.path); // remove the file locally after upload

            files.push({ name: fileName, key: req.file.filename });
            saveFilesData(files);

            res.status(200).send('File uploaded successfully.');
        } catch (err) {
            console.error('Error uploading file:', err);
            res.status(500).send('Failed to upload file.');
        }
    } else {
        res.status(400).send('No file uploaded.');
    }
});

app.get('/files', (req, res) => {
    res.json(files);
});

app.delete('/files/:key', async (req, res) => {
    const fileKey = req.params.key;

    try {
        const deleteParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileKey
        };

        await s3.send(new DeleteObjectCommand(deleteParams));

        files = files.filter(file => file.key !== fileKey);
        saveFilesData(files);

        res.status(200).send('File deleted successfully.');
    } catch (err) {
        console.error('Error deleting file:', err);
        res.status(500).send('Failed to delete file.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
