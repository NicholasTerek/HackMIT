const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to only accept images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Photo upload endpoint with detailed logging
app.post('/upload', (req, res) => {
    console.log('📸 Upload request received');
    console.log('Headers:', req.headers);
    console.log('Content-Type:', req.get('Content-Type'));
    
    upload.single('photo')(req, res, (err) => {
        if (err) {
            console.error('❌ Multer error:', err);
            console.error('Error code:', err.code);
            console.error('Error message:', err.message);
            return res.status(500).json({ 
                success: false, 
                message: err.message || 'Upload failed',
                error: err.code || 'MULTER_ERROR'
            });
        }

        try {
            console.log('📋 Request body keys:', Object.keys(req.body || {}));
            console.log('📁 Request file:', req.file ? 'Present' : 'Missing');
            
            if (!req.file) {
                console.log('❌ No file in request');
                return res.status(400).json({ 
                    success: false, 
                    message: 'No photo uploaded' 
                });
            }

            console.log('✅ Photo uploaded successfully:', req.file.filename);
            console.log('📊 File details:', {
                originalname: req.file.originalname,
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype
            });
            
            res.json({
                success: true,
                message: 'Photo uploaded successfully',
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                path: req.file.path
            });
        } catch (error) {
            console.error('💥 Upload processing error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Upload processing failed', 
                error: error.message 
            });
        }
    });
});

// Get list of uploaded photos
app.get('/photos', (req, res) => {
    try {
        const files = fs.readdirSync(uploadsDir);
        const photos = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => ({
                filename: file,
                path: `/uploads/${file}`,
                uploadTime: fs.statSync(path.join(uploadsDir, file)).mtime
            }));
        
        res.json({ success: true, photos });
    } catch (error) {
        console.error('Error reading photos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to read photos' 
        });
    }
});

// Get photos from Glass folder
app.get('/glass-photos', (req, res) => {
    try {
        const glassPhotosDir = path.join(__dirname, '../Glass/photos');
        console.log(`Looking for Glass photos in: ${glassPhotosDir}`);
        
        if (!fs.existsSync(glassPhotosDir)) {
            return res.json({ success: true, photos: [], message: 'Glass photos directory does not exist yet' });
        }

        const files = fs.readdirSync(glassPhotosDir);
        const photos = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => ({
                filename: file,
                path: `/glass-photos/${file}`,
                uploadTime: fs.statSync(path.join(glassPhotosDir, file)).mtime,
                size: fs.statSync(path.join(glassPhotosDir, file)).size
            }));
        
        console.log(`Found ${photos.length} photos in Glass folder`);
        res.json({ success: true, photos });
    } catch (error) {
        console.error('Error reading Glass photos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to read Glass photos' 
        });
    }
});

// Serve Glass photos
app.use('/glass-photos', express.static(path.join(__dirname, '../Glass/photos')));

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Direct save upload endpoint (simulates file system save)
app.post('/upload-direct', upload.single('photo'), (req, res) => {
    console.log('💾 Direct save request received');
    
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No photo uploaded for direct save' 
            });
        }

        // Add "direct-" prefix to filename to distinguish from API uploads
        const originalPath = req.file.path;
        const directPath = path.join(uploadsDir, 'direct-' + req.file.filename);
        
        // Move file to have direct prefix
        fs.renameSync(originalPath, directPath);

        console.log('✅ Photo saved directly:', 'direct-' + req.file.filename);
        
        res.json({
            success: true,
            message: 'Photo saved directly to file system',
            filename: 'direct-' + req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            method: 'direct'
        });
    } catch (error) {
        console.error('💥 Direct save error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Direct save failed', 
            error: error.message 
        });
    }
});

// Basic route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Photo Upload API is running!',
        endpoints: {
            upload: 'POST /upload (API method)',
            'upload-direct': 'POST /upload-direct (Direct save method)',
            photos: 'GET /photos',
            'glass-photos': 'GET /glass-photos'
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 10MB.'
            });
        }
    }
    
    res.status(500).json({
        success: false,
        message: error.message || 'Something went wrong!'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Uploads directory: ${uploadsDir}`);
});