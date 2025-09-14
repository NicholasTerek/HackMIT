import type { TranscriptionEntry } from '@/hooks/useNotes';

export interface SummaryOptions {
  maxLength?: number;
}

/**
 * Generate a rule-based summary of transcript entries
 */
export async function generateTranscriptSummary(
  entries: TranscriptionEntry[],
  options: SummaryOptions = {}
): Promise<string> {
  if (!entries || entries.length === 0) {
    return 'No transcript available to summarize.';
  }

  // Combine all transcript text
  const fullTranscript = entries
    .map(entry => entry.text)
    .join(' ')
    .trim();

  if (!fullTranscript) {
    return 'No transcript content available to summarize.';
  }

  // Rule-based summarization
  const sentences = fullTranscript
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10); // Filter out very short fragments

  const maxLength = options.maxLength || 200;
  
  if (sentences.length === 0) {
    return 'Unable to extract meaningful content from transcript.';
  }

  // Take first few sentences up to maxLength
  let summary = '';
  for (const sentence of sentences) {
    if (summary.length + sentence.length + 2 > maxLength) {
      break;
    }
    summary += (summary ? '. ' : '') + sentence;
  }

  // If we got something, add period if needed
  if (summary && !summary.match(/[.!?]$/)) {
    summary += '.';
  }

  return summary || sentences[0] + '.';
}

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
