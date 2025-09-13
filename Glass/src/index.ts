import { AppServer, AppSession, ViewType, AuthenticatedRequest, PhotoData } from '@mentra/sdk';
import { Request, Response } from 'express';
import * as ejs from 'ejs';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Interface representing a stored photo with metadata
 */
interface StoredPhoto {
  requestId: string;
  buffer: Buffer;
  timestamp: Date;
  userId: string;
  mimeType: string;
  filename: string;
  size: number;
}

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set in .env file'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set in .env file'); })();
const PORT = parseInt(process.env.PORT || '3000');

/**
 * Photo Taker App with webview functionality for displaying photos
 * Extends AppServer to provide photo taking and webview display capabilities
 */
class ExampleMentraOSApp extends AppServer {
  private photos: Map<string, StoredPhoto> = new Map(); // Store photos by userId
  private latestPhotoTimestamp: Map<string, number> = new Map(); // Track latest photo timestamp per user
  private isStreamingPhotos: Map<string, boolean> = new Map(); // Track if we are streaming photos for a user
  private nextPhotoTime: Map<string, number> = new Map(); // Track next photo time for a user

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
    });
    this.setupWebviewRoutes();
  }


  /**
   * Handle new session creation and button press events
   */
  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    // this gets called whenever a user launches the app
    this.logger.info(`Session started for user ${userId}`);

    // set the initial state of the user
    this.isStreamingPhotos.set(userId, false);
    this.nextPhotoTime.set(userId, Date.now());

    // this gets called whenever a user presses a button
    session.events.onButtonPress(async (button) => {
      this.logger.info(`Button pressed: ${button.buttonId}, type: ${button.pressType}`);

      if (button.pressType === 'long') {
        // the user held the button, so we toggle the streaming mode
        this.isStreamingPhotos.set(userId, !this.isStreamingPhotos.get(userId));
        this.logger.info(`Streaming photos for user ${userId} is now ${this.isStreamingPhotos.get(userId)}`);
        return;
      } else {
        session.layouts.showTextWall("Button pressed, about to take photo", {durationMs: 4000});
        // the user pressed the button, so we take a single photo
        try {
          // first, get the photo
          const photo = await session.camera.requestPhoto();
          // if there was an error, log it
          this.logger.info(`Photo taken for user ${userId}, timestamp: ${photo.timestamp}`);
          this.cachePhoto(photo, userId);
        } catch (error) {
          this.logger.error(`Error taking photo: ${error}`);
        }
      }
    });

    // repeatedly check if we are in streaming mode and if we are ready to take another photo
    setInterval(async () => {
      if (this.isStreamingPhotos.get(userId) && Date.now() > (this.nextPhotoTime.get(userId) ?? 0)) {
        try {
          // set the next photos for 30 seconds from now, as a fallback if this fails
          this.nextPhotoTime.set(userId, Date.now() + 30000);

          // actually take the photo
          const photo = await session.camera.requestPhoto();

          // set the next photo time to now, since we are ready to take another photo
          this.nextPhotoTime.set(userId, Date.now());

          // cache the photo for display
          this.cachePhoto(photo, userId);
        } catch (error) {
          this.logger.error(`Error auto-taking photo: ${error}`);
        }
      }
    }, 1000);
  }

  protected async onStop(sessionId: string, userId: string, reason: string): Promise<void> {
    // clean up the user's state
    this.isStreamingPhotos.set(userId, false);
    this.nextPhotoTime.delete(userId);
    this.logger.info(`Session stopped for user ${userId}, reason: ${reason}`);
  }

  /**
   * Cache a photo for display and send to backend server
   */
  private async cachePhoto(photo: PhotoData, userId: string) {
    this.logger.info(`Starting cachePhoto for user ${userId}, photo size: ${photo.size} bytes, mimeType: ${photo.mimeType}`);
    
    // create a new stored photo object which includes the photo data and the user id
    const cachedPhoto: StoredPhoto = {
      requestId: photo.requestId,
      buffer: photo.buffer,
      timestamp: photo.timestamp,
      userId: userId,
      mimeType: photo.mimeType,
      filename: photo.filename,
      size: photo.size
    };

    // Save photo locally first as backup
    await this.savePhotoLocally(cachedPhoto);

    // Send photo via API upload
    await this.sendPhotoToBackend(cachedPhoto);

    // cache the photo for display
    this.photos.set(userId, cachedPhoto);
    // update the latest photo timestamp
    this.latestPhotoTimestamp.set(userId, cachedPhoto.timestamp.getTime());
    this.logger.info(`Photo cached for user ${userId}, timestamp: ${cachedPhoto.timestamp}`);
  }

  /**
   * Save photo locally in Glass folder
   */
  private async savePhotoLocally(photo: StoredPhoto): Promise<void> {
    try {
      this.logger.info(`Attempting to save photo locally: ${photo.filename}`);
      
      // Create photos directory if it doesn't exist
      const photosDir = path.join(process.cwd(), 'photos');
      if (!fs.existsSync(photosDir)) {
        fs.mkdirSync(photosDir, { recursive: true });
        this.logger.info(`Created photos directory: ${photosDir}`);
      }

      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = path.extname(photo.filename) || '.jpg';
      const localFilename = `photo-${timestamp}-${photo.userId}${extension}`;
      const localPath = path.join(photosDir, localFilename);

      // Write the buffer to file
      fs.writeFileSync(localPath, photo.buffer);
      
      this.logger.info(`Photo saved locally: ${localPath} (${photo.buffer.length} bytes)`);
    } catch (error) {
      this.logger.error(`Error saving photo locally: ${error}`);
    }
  }

  /**
   * Save photo directly to backend uploads folder (file system approach)
   */
  private async savePhotoToBackendFolder(photo: StoredPhoto): Promise<void> {
    try {
      this.logger.info(`Attempting to save photo directly to backend uploads folder`);
      
      // Path to backend uploads folder
      const backendUploadsDir = path.join(process.cwd(), '../backend/uploads');
      
      // Create backend uploads directory if it doesn't exist
      if (!fs.existsSync(backendUploadsDir)) {
        fs.mkdirSync(backendUploadsDir, { recursive: true });
        this.logger.info(`Created backend uploads directory: ${backendUploadsDir}`);
      }

      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = path.extname(photo.filename) || '.jpg';
      const backendFilename = `glass-photo-${timestamp}-${photo.userId}${extension}`;
      const backendPath = path.join(backendUploadsDir, backendFilename);

      // Write the buffer to backend uploads folder
      fs.writeFileSync(backendPath, photo.buffer);
      
      this.logger.info(`✅ Photo saved directly to backend: ${backendPath} (${photo.buffer.length} bytes)`);
    } catch (error) {
      this.logger.error(`❌ Error saving photo to backend folder: ${error}`);
    }
  }

  /**
   * Send photo to backend server (HTTP approach - using axios for better FormData support)
   */
  private async sendPhotoToBackend(photo: StoredPhoto): Promise<void> {
    this.logger.info(`Starting sendPhotoToBackend for photo: ${photo.filename}, size: ${photo.buffer.length} bytes`);
    
    try {
      const axios = require('axios');
      const FormData = require('form-data');
      
      this.logger.info(`Creating FormData with axios approach...`);
      const formData = new FormData();
      
      // Create a readable stream from buffer for form-data
      const { Readable } = require('stream');
      const bufferStream = new Readable({
        read() {}
      });
      bufferStream.push(photo.buffer);
      bufferStream.push(null);
      
      formData.append('photo', bufferStream, {
        filename: photo.filename,
        contentType: photo.mimeType,
        knownLength: photo.buffer.length
      });

      this.logger.info(`Sending POST request with axios to http://localhost:3001/upload`);
      
      const response = await axios.post('http://localhost:3001/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          'Content-Length': formData.getLengthSync()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      this.logger.info(`Received response with status: ${response.status}`);
      
      if (response.data.success) {
        this.logger.info(`✅ Photo successfully sent to backend: ${response.data.filename}`);
      } else {
        this.logger.error(`❌ Backend rejected photo: ${response.data.message}`);
      }
    } catch (error) {
      this.logger.error(`💥 Error sending photo to backend: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
    }
  }


  /**
 * Set up webview routes for photo display functionality
 */
  private setupWebviewRoutes(): void {
    const app = this.getExpressApp();

    // API endpoint to get the latest photo for the authenticated user
    app.get('/api/latest-photo', (req: any, res: any) => {
      const userId = (req as AuthenticatedRequest).authUserId;

      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const photo = this.photos.get(userId);
      if (!photo) {
        res.status(404).json({ error: 'No photo available' });
        return;
      }

      res.json({
        requestId: photo.requestId,
        timestamp: photo.timestamp.getTime(),
        hasPhoto: true
      });
    });

    // API endpoint to get photo data
    app.get('/api/photo/:requestId', (req: any, res: any) => {
      const userId = (req as AuthenticatedRequest).authUserId;
      const requestId = req.params.requestId;

      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const photo = this.photos.get(userId);
      if (!photo || photo.requestId !== requestId) {
        res.status(404).json({ error: 'Photo not found' });
        return;
      }

      res.set({
        'Content-Type': photo.mimeType,
        'Cache-Control': 'no-cache'
      });
      res.send(photo.buffer);
    });

    // Main webview route - displays the photo viewer interface
    app.get('/webview', async (req: any, res: any) => {
      const userId = (req as AuthenticatedRequest).authUserId;

      if (!userId) {
        res.status(401).send(`
          <html>
            <head><title>Photo Viewer - Not Authenticated</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Please open this page from the MentraOS app</h1>
            </body>
          </html>
        `);
        return;
      }

      const templatePath = path.join(process.cwd(), 'views', 'photo-viewer.ejs');
      const html = await ejs.renderFile(templatePath, {});
      res.send(html);
    });
  }
}



// Start the server
// DEV CONSOLE URL: https://console.mentra.glass/
// Get your webhook URL from ngrok (or whatever public URL you have)
const app = new ExampleMentraOSApp();

app.start().catch(console.error);