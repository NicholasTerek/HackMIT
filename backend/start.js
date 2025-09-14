const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { callClaudeWithImage, callClaudeWithPrompt } = require('./llm');
const app = express();
const PORT = process.env.PORT || 3001;

// Transcript cleaning prompt for Claude
const TRANSCRIPT_CLEANING_PROMPT = `You are a professional transcript copyeditor. Clean the following raw speech-to-text transcript while preserving the original meaning, order, and speaker intent. Do not summarize, compress, or reorder content. Return ONLY the cleaned transcript—no preface, no bullets, no explanations.

SCOPE OF EDITS
1) Remove disfluencies:
   - Delete filler words/phrases when they are not semantically necessary: "um", "uh", "er", "ah", "like", "you know", "I mean", "sort of", "kind of", "basically", "actually", "literally" (when used as filler), "right?" (tag as filler), "so..." (filler), "well," (filler), "okay," (filler), "anyway," (filler), "kinda", "wanna", "gonna" (see normalization below).
   - Remove repeated words due to stutter: e.g., "the the", "I I I".
   - Remove false starts that are immediately abandoned: Keep the complete clause and drop the aborted fragment (e.g., "When we— when we started..." → "When we started...").
   - Remove elongated hesitations and interjections: "mm", "hmm", "uh-huh" (unless they function as clear standalone answers—see Rule 6).

2) Correct obvious misspeaks & ASR misrecognitions:
   - Fix slips of the tongue where intent is clear: "February 13th—sorry, 15th" → "February 15th".
   - Correct clearly misheard terms using nearby context (e.g., "sales force" vs. "Salesforce", "Open AI" → "OpenAI").
   - Preserve domain-specific jargon and proper nouns; capitalize brand, product, person, and place names appropriately.
   - If a word remains uncertain after best effort, mark it as [unclear] rather than guessing.

3) Light grammar & punctuation polish (no paraphrasing):
   - Insert commas, periods, and question marks as needed for readability.
   - Fix evident subject–verb agreement and tense slips when accidental (not stylistic).
   - Maintain original tone and register. Do NOT elevate style or rewrite for eloquence.
   - Normalize basic casing and spacing; remove stray punctuation and dangling ellipses unless indicating an interruption.

4) Normalizations (lossless to meaning):
   - Standardize contractions and colloquialisms per OPTIONS below (default: preserve natural speech: "gonna", "wanna", "kinda" → convert to "going to", "want to", "kind of" only if this improves clarity in context).
   - Numbers/dates: keep as spoken unless clarity benefits from numerals (e.g., "twenty-five" → "25" in measurements).
   - Keep profanity as-is; do not censor.
   - Maintain paragraph breaks at logical sentence boundaries.

5) Speaker labels & timestamps:
   - If speaker labels exist (e.g., "Speaker 1:"), keep and standardize them consistently (e.g., "Speaker 1", "Speaker 2", etc.). Do not invent new speakers.
   - If timestamps exist in brackets (e.g., [00:12:03]), keep them attached to the nearest line. Do not add or edit times.
   - If no labels/timestamps are present, do not create any.

6) Nonverbal & backchannel cues:
   - Keep meaningful events like [laughter], [applause], [crosstalk], [music] if already present.
   - Remove non-meaningful backchannels ("uh-huh", "mm-hmm", "yeah" as filler) *unless* they function as clear answers or confirmations in a Q&A exchange; in that case, retain them (e.g., "Yeah." as a direct answer).

7) Content preservation (critical):
   - Do NOT summarize, shorten, paraphrase, reorder, or add new information.
   - Do NOT drop technical details, numbers, examples, or lists—even if they sound rambling.
   - Keep quotations and code snippets verbatim aside from obvious transcription errors and punctuation fixes.

8) Ambiguity handling:
   - Prefer deletion only when clearly filler. If a word could be semantic ("like" meaning "such as"), keep it.
   - For overlaps or interrupts, use an em dash (—) to show interruptions if this clarifies readability without changing meaning.

OUTPUT FORMAT
- Return plain text only (UTF-8). No markdown, no commentary.
- Preserve existing speaker labels and timestamps if present.
- Use a single blank line between speaker turns or paragraphs.

OPTIONS (defaults shown; respect if provided by caller)
- spelling_variant: "auto" | "US" | "UK"  (default: "auto" → follow majority usage in input)
- contractions: "preserve" | "standardize"  (default: "preserve")
- colloquialisms_to_standard: true | false  (default: true → "gonna" → "going to" when clarity improves)
- numerals_threshold: integer  (default: 11 → numbers ≥11 as digits; dates/measures as digits when clearer)
- keep_backchannels_as_answers: true | false  (default: true)
- retain_filler_at_rhetorical_effect: true | false  (default: false)
- uncertainty_tag: "[unclear]"  (default)

PROCESS (internal; do not describe in output)
1) Pass 1: Remove fillers/stutter/false starts per Rules 1 & 6.
2) Pass 2: Correct misspeaks/misrecognitions; standardize proper nouns.
3) Pass 3: Light grammar/punctuation; apply OPTIONS.
4) Validation: Ensure no content removed beyond defined disfluencies; preserve order; keep labels/timestamps.

BEGIN TRANSCRIPT
{{TRANSCRIPT_TEXT}}
END TRANSCRIPT`;

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