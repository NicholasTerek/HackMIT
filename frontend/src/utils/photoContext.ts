import type { Photo } from '@/hooks/usePhotos';
import type { TranscriptionEntry } from '@/hooks/useNotes';

export interface PhotoContextPair {
  photo: Photo;
  context: string;
  timestamp: Date;
  relatedTranscriptions: TranscriptionEntry[];
}

/**
 * Load photo description from the corresponding .txt file
 */
export const loadPhotoDescription = async (photo: Photo): Promise<string> => {
  try {
    // Convert photo path to description file path
    // e.g., /uploads/photo-123.jpg -> /uploads/photo-123.txt
    const descriptionPath = photo.path.replace(/\.[^.]+$/, '.txt');
    
    const response = await fetch(`http://localhost:3001${descriptionPath}`);
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    console.warn('Failed to load photo description:', error);
  }
  return 'No description available';
};

/**
 * Create photo-context pairs by matching photos with nearby transcriptions
 */
export const createPhotoContextPairs = async (
  photos: Photo[], 
  transcriptions: TranscriptionEntry[]
): Promise<PhotoContextPair[]> => {
  const pairs: PhotoContextPair[] = [];
  
  for (const photo of photos) {
    const photoTime = new Date(photo.uploadTime);
    
    // Find transcriptions within 5 minutes before/after photo
    const timeWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
    const relatedTranscriptions = transcriptions.filter(entry => {
      const timeDiff = Math.abs(entry.timestamp.getTime() - photoTime.getTime());
      return timeDiff <= timeWindow;
    });
    
    // Load Claude's image description
    const description = await loadPhotoDescription(photo);
    
    // Create context from nearby transcriptions
    const context = relatedTranscriptions.length > 0
      ? relatedTranscriptions.map(entry => entry.text).join(' ')
      : 'No related transcription found';
    
    pairs.push({
      photo,
      context: description,
      timestamp: photoTime,
      relatedTranscriptions
    });
  }
  
  return pairs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

/**
 * Generate enhanced summary prompt that includes photo context
 */
export const createEnhancedSummaryPrompt = (
  transcriptionText: string,
  photoContextPairs: PhotoContextPair[]
): string => {
  let prompt = `Please summarize the following transcript:\n\n${transcriptionText}`;
  
  if (photoContextPairs.length > 0) {
    prompt += '\n\nAdditional visual context from photos taken during this session:\n';
    photoContextPairs.forEach((pair, index) => {
      prompt += `\nPhoto ${index + 1} (${pair.timestamp.toLocaleTimeString()}): ${pair.context}`;
    });
    prompt += '\n\nPlease incorporate this visual context into your summary when relevant.';
  }
  
  return prompt;
};
