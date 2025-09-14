import type { TranscriptionEntry } from '@/hooks/useNotes';

export interface SummaryOptions {
  maxLength?: number;
}

/**
 * Generate a rule-based summary of transcript entries
 */
export const generateTranscriptSummary = async (
  entries: TranscriptionEntry[],
  options: SummaryOptions = {}
): Promise<string> => {
  if (!entries || entries.length === 0) {
    return 'No transcription content available.';
  }

  const { maxLength = 200 } = options;
  
  // Combine all transcript text
  const fullText = entries.map(entry => entry.text).join(' ');
  
  try {
    // Call the backend AI chat endpoint for summarization
    const response = await fetch('http://localhost:3001/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: `Please provide a concise summary of this transcription in ${maxLength} characters or less. Focus on the main topics and key points discussed: ${fullText}`,
        noteContext: fullText
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.answer) {
      return data.answer.trim();
    } else {
      throw new Error('AI summary generation failed');
    }
  } catch (error) {
    console.warn('AI summarization failed, falling back to extractive summary:', error);
    
    // Fallback to simple extractive summarization
    const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 2) {
      return fullText.substring(0, maxLength) + (fullText.length > maxLength ? '...' : '');
    }
    
    // Score sentences by length and position (first and last sentences get higher scores)
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence: sentence.trim(),
      score: sentence.trim().length + (index === 0 || index === sentences.length - 1 ? 20 : 0)
    }));
    
    // Sort by score and take top sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(3, sentences.length))
      .map(item => item.sentence);
    
    let summary = topSentences.join('. ');
    
    // Truncate if too long
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength) + '...';
    }
    
    return summary || 'Unable to generate summary from transcription.';
  }
};

/**
 * Extracts key topics/keywords from transcription entries
 */
export const extractKeyTopics = (entries: TranscriptionEntry[]): string[] => {
  if (!entries || entries.length === 0) return [];

  const fullText = entries.map(entry => entry.text).join(' ').toLowerCase();
  
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
  ]);

  // Extract words and count frequency
  const words = fullText
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  const wordCount = new Map<string, number>();
  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  });

  // Return top words by frequency
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
};

/**
 * Formats duration from minutes to human readable string
 */
export const formatTranscriptDuration = (minutes: number): string => {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return `${hours}h ${remainingMinutes}m`;
};
