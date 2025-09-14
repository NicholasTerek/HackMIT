const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { callClaudeWithImage } = require('./llm');
const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Helper: derive a stable capture timestamp from filename when available
// Supports:
// - photo-2025-09-13T19-45-23-941Z-<...>.jpg  → 2025-09-13T19:45:23.941Z
// - glass-photo-2025-09-13T19-45-23-941Z-<...>.jpg → 2025-09-13T19:45:23.941Z
// - photo-1757801999448-<...>.png → epoch ms
function parseUploadTimeFromFilename(filename, fallbackDate) {
    try {
        // Match ISO-like with hyphens in time component
        // e.g., photo-YYYY-MM-DDTHH-MM-SS-MMMZ-...
        const isoMatch = filename.match(/photo-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/i)
            || filename.match(/glass-photo-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/i);
        if (isoMatch) {
            const [, ymd, hh, mm, ss, mmm] = isoMatch;
            const iso = `${ymd}T${hh}:${mm}:${ss}.${mmm}Z`;
            const d = new Date(iso);
            if (!isNaN(d.getTime())) return d;
        }

        // Match epoch-based filename: photo-<epoch(ms|s)>-
        const epochMatch = filename.match(/photo-(\d{10,13})-/i);
        if (epochMatch) {
            const raw = epochMatch[1];
            const epochMs = raw.length === 13 ? Number(raw) : Number(raw) * 1000;
            const d = new Date(epochMs);
            if (!isNaN(d.getTime())) return d;
        }
    } catch (_) {
        // ignore and fall back
    }
    return fallbackDate;
}

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
app.post('/upload', async (req, res) => {
    console.log('📸 Upload request received');
    console.log('Headers:', req.headers);
    console.log('Content-Type:', req.get('Content-Type'));
    
    upload.single('photo')(req, res, async (err) => {
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
            
            const result = await callClaudeWithImage(req.file.path, 'Describe this image.');
            console.log(result);
            
            // Save Claude description to .txt file with same name as image
            const imageBaseName = path.parse(req.file.filename).name; // removes extension
            const descriptionFile = path.join(uploadsDir, imageBaseName + '.txt');
            fs.writeFileSync(descriptionFile, result);
            
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
            .map(file => {
                const full = path.join(uploadsDir, file);
                const mtime = fs.statSync(full).mtime;
                return {
                    filename: file,
                    path: `/uploads/${file}`,
                    uploadTime: parseUploadTimeFromFilename(file, mtime)
                };
            });
        
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
            .map(file => {
                const full = path.join(glassPhotosDir, file);
                const stat = fs.statSync(full);
                const mtime = stat.mtime;
                return {
                    filename: file,
                    path: `/glass-photos/${file}`,
                    uploadTime: parseUploadTimeFromFilename(file, mtime),
                    size: stat.size
                };
            });
        
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

// Transcription endpoint for teacher notes
app.post('/transcription', (req, res) => {
    console.log('🎤 Transcription received');
    
    try {
        const { text, userId, timestamp, type } = req.body;
        
        if (!text || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: text and userId'
            });
        }
        
        // Create transcriptions directory if it doesn't exist
        const transcriptionsDir = path.join(__dirname, 'transcriptions');
        if (!fs.existsSync(transcriptionsDir)) {
            fs.mkdirSync(transcriptionsDir, { recursive: true });
        }
        
        // Create daily log file entry
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const dailyLogFile = path.join(transcriptionsDir, `${dateStr}-${userId}.log`);
        const logEntry = `[${timestamp || now.toISOString()}] ${text}\n`;
        
        // Append to daily log file
        fs.appendFileSync(dailyLogFile, logEntry);
        
        console.log(`✅ Transcription saved: "${text.substring(0, 50)}..." to daily log`);
        
        res.json({
            success: true,
            message: 'Transcription saved to daily log',
            dailyLog: `${dateStr}-${userId}.log`
        });
        
    } catch (error) {
        console.error('💥 Transcription save error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save transcription',
            error: error.message
        });
    }
});

// Get transcriptions for a user (from .log files)
app.get('/transcriptions/:userId?', (req, res) => {
    try {
        const userId = req.params.userId;
        const transcriptionsDir = path.join(__dirname, 'transcriptions');
        
        if (!fs.existsSync(transcriptionsDir)) {
            return res.json({ success: true, transcriptions: [] });
        }
        
        const files = fs.readdirSync(transcriptionsDir);
        let logFiles = files.filter(file => file.endsWith('.log'));
        
        // Filter by userId if provided
        if (userId) {
            logFiles = logFiles.filter(file => file.includes(userId));
        }
        
        const transcriptions = logFiles.map(file => {
            const filepath = path.join(transcriptionsDir, file);
            const content = fs.readFileSync(filepath, 'utf8');
            return {
                filename: file,
                content: content,
                lines: content.split('\n').filter(line => line.trim())
            };
        });
        
        res.json({ success: true, transcriptions });
    } catch (error) {
        console.error('Error reading transcriptions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to read transcriptions'
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
            'glass-photos': 'GET /glass-photos',
            transcription: 'POST /transcription (Teacher notes)',
            transcriptions: 'GET /transcriptions/:userId (Get transcriptions)'
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