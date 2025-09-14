import { useState, useEffect, useRef } from 'react';
import { generateTranscriptSummary } from '@/utils/transcriptSummary';
import type { SummaryOptions } from '@/utils/transcriptSummary';
import type { EnhancedNote, TranscriptionEntry } from '@/hooks/useNotes';

// Cache to store summaries by note ID
const summaryCache = new Map<string, string>();

export const useAsyncSummary = (
  entries: TranscriptionEntry[] | undefined,
  options: SummaryOptions = {},
  note?: EnhancedNote
) => {
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasGeneratedRef = useRef<Record<string, boolean>>({});

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

    // Check if we already have a cached summary
    const cachedSummary = summaryCache.get(note.id);
    if (cachedSummary) {
      setSummary(cachedSummary);
      setIsLoading(false);
      setError(null);
      hasGeneratedRef.current[note.id] = true; // Mark as generated since we have cache
      return;
    }

    // Don't regenerate if we've already generated for this note
    if (hasGeneratedRef.current[note.id]) {
      return;
    }

    // Generate summary only once
    let isCancelled = false;
    
    const generateSummary = async () => {
      setIsLoading(true);
      setError(null);
      setSummary('');
      
      try {
        const newSummary = await generateTranscriptSummary(entries, options);
        
        if (!isCancelled) {
          setSummary(newSummary);
          // Cache the summary
          summaryCache.set(note.id, newSummary);
          hasGeneratedRef.current[note.id] = true; // Mark as generated after successful generation
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to generate summary';
          console.error('❌ Summary generation failed:', errorMessage);
          setError(errorMessage);
          setSummary('Failed to generate summary.');
          hasGeneratedRef.current[note.id] = true; // Mark as generated even on error to prevent retries
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
  }, [note?.id]); // Only depend on note ID, not entries or options

  // Function to manually regenerate summary
  const regenerateSummary = async () => {
    if (!entries || !note?.id) return;
    
    hasGeneratedRef.current[note.id] = false;
    summaryCache.delete(note.id);
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newSummary = await generateTranscriptSummary(entries, options);
      setSummary(newSummary);
      summaryCache.set(note.id, newSummary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate summary';
      setError(errorMessage);
      setSummary('Failed to generate summary.');
    } finally {
      setIsLoading(false);
      hasGeneratedRef.current[note.id] = true;
    }
  };

  return { summary, isLoading, error, regenerateSummary };
};
