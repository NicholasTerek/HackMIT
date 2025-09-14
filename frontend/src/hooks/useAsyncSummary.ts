import { useState, useEffect } from 'react';
import { generateTranscriptSummary } from '@/utils/transcriptSummary';
import type { SummaryOptions } from '@/utils/transcriptSummary';
import type { EnhancedNote, TranscriptionEntry } from '@/hooks/useNotes';

export const useAsyncSummary = (
  entries: TranscriptionEntry[] | undefined,
  options: SummaryOptions = {},
  note?: EnhancedNote
) => {
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entries || entries.length === 0) {
      setSummary('No transcription content available.');
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!note?.id) {
      setSummary('Note ID not available.');
      setIsLoading(false);
      return;
    }

    // Generate rule-based summary immediately
    let isCancelled = false;
    
    const generateSummary = async () => {
      setIsLoading(true);
      setError(null);
      setSummary('');
      
      try {
        const newSummary = await generateTranscriptSummary(entries, options);
        
        if (!isCancelled) {
          setSummary(newSummary);
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to generate summary';
          console.error('❌ Summary generation failed:', errorMessage);
          setError(errorMessage);
          setSummary('Failed to generate summary.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    generateSummary();

    return () => {
      isCancelled = true;
    };
  }, [entries, options.maxLength, note?.id]);

  return { summary, isLoading, error };
};
