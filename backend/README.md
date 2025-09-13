# Photo Upload Backend

A simple Node.js backend for uploading and managing photos.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

3. **Access the Application**
   - Open your browser and go to: `http://localhost:3001`
   - You'll see a simple photo upload interface

## API Endpoints

- `POST /upload` - Upload a photo (form-data with 'photo' field)
- `GET /photos` - Get list of all uploaded photos
- `GET /uploads/:filename` - Access uploaded photo files
- `GET /` - API status and endpoint information

## Features

- ✅ Drag & drop photo upload
- ✅ File type validation (images only)
- ✅ File size limit (10MB)
- ✅ Automatic uploads folder creation
- ✅ Unique filename generation
- ✅ Photo gallery view
- ✅ CORS enabled for frontend integration

## File Structure

```
backend/
├── start.js          # Main server file
├── package.json      # Dependencies
├── uploads/          # Uploaded photos (auto-created)
└── public/
    └── index.html    # Simple upload interface
```

## Usage Example

### Upload via Frontend
1. Visit `http://localhost:3001`
2. Drag and drop a photo or click "Choose Photo"
3. Click "Upload Photo"
4. View uploaded photos in the gallery below

### Upload via API (curl)
```bash
curl -X POST -F "photo=@your-photo.jpg" http://localhost:3001/upload
```

### Get Photos List
```bash
curl http://localhost:3001/photos
```

## Notes

- Photos are stored in the `uploads/` directory
- Each photo gets a unique filename with timestamp
- Only image files are accepted (jpg, png, gif, webp, etc.)
- Maximum file size is 10MB
