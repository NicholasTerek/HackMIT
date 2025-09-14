import { useState, useEffect, useMemo } from "react";
import { Note } from "@/components/NoteCard";
import { usePhotos } from "./usePhotos";
import { useTranscriptions } from "./useTranscriptions";
import type { Photo } from "./usePhotos";
import type { Transcription } from "./useTranscriptions";

const STORAGE_KEY = "notes-app-data";
const SEVEN_MINUTES_MS = 7 * 60 * 1000; // 7 minutes in milliseconds

export interface TranscriptionEntry {
  timestamp: Date;
  text: string;
  originalLine: string;
}

export interface EnhancedNote extends Note {
  transcriptionEntries?: TranscriptionEntry[];
  photos?: Photo[];
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in minutes
  isGenerated?: boolean; // true for auto-generated notes from transcriptions
  transcriptSummary?: string; // cached summary of transcription
}

export const useNotes = () => {
  const [manualNotes, setManualNotes] = useState<Note[]>([]);
  const { photos, isLoading: photosLoading, error: photosError } = usePhotos();
  const { transcriptions, isLoading: transcriptionsLoading, error: transcriptionsError } = useTranscriptions();

  // Load manual notes from localStorage on mount
  useEffect(() => {
    const storedNotes = localStorage.getItem(STORAGE_KEY);
    if (storedNotes) {
      try {
        setManualNotes(JSON.parse(storedNotes));
      } catch (error) {
        console.error("Error loading notes from localStorage:", error);
      }
    } else {
      // Seed three starter notes on first run
      const now = new Date().toISOString();
      const sampleNotes: Note[] = [
        {
          id: crypto.randomUUID(),
          title: "Welcome to Pocket Pen Pal",
          content: "This is your first note. Click New Note to add more, or edit/delete any note.",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: crypto.randomUUID(),
          title: "Tips",
          content: "Use the search bar to quickly find notes by title or content.",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: crypto.randomUUID(),
          title: "Today's Thoughts",
          content: "Write a few lines about your day...",
          createdAt: now,
          updatedAt: now,
        },
      ];
      setManualNotes(sampleNotes);
    }
  }, []);

  // Save manual notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manualNotes));
  }, [manualNotes]);

  // Parse transcription lines to extract timestamp and text
  const parseTranscriptionEntry = (line: string): TranscriptionEntry | null => {
    // Normalize line endings and trim whitespace for cross-platform compatibility
    const normalizedLine = line.replace(/\r\n|\r|\n/g, '').trim();
    
    // More flexible regex that handles various line ending formats
    const match = normalizedLine.match(/^\[(.*?)\]\s*(.*)$/);
    if (!match) return null;
    
    const timestampStr = match[1];
    const text = match[2];
    
    try {
      // More robust date parsing for different locales and WSL environments
      let timestamp: Date;
      
      // Try parsing as ISO string first (most common format)
      if (timestampStr.includes('T') && (timestampStr.includes('Z') || timestampStr.includes('+'))) {
        timestamp = new Date(timestampStr);
      } else {
        // Fallback: try parsing with explicit UTC handling
        timestamp = new Date(timestampStr + (timestampStr.includes('Z') ? '' : 'Z'));
      }
      
      // Additional fallback for different date formats
      if (isNaN(timestamp.getTime())) {
        // Try parsing without timezone info and assume UTC
        const cleanTimestamp = timestampStr.replace(/[^\d\-T:\.]/g, '');
        timestamp = new Date(cleanTimestamp + 'Z');
      }
      
      // Final validation
      if (isNaN(timestamp.getTime())) {
        console.warn(`Failed to parse timestamp: "${timestampStr}" in line: "${line}"`);
        return null;
      }
      
      return {
        timestamp,
        text: text.trim(),
        originalLine: line
      };
    } catch (error) {
      console.warn(`Error parsing timestamp: "${timestampStr}"`, error);
      return null;
    }
  };

  // Get all transcription entries from all transcription files
  const getAllTranscriptionEntries = (transcriptions: Transcription[]): TranscriptionEntry[] => {
    const entries: TranscriptionEntry[] = [];
    let totalLines = 0;
    let parsedLines = 0;
    
    transcriptions.forEach(transcription => {
      transcription.lines.forEach(line => {
        totalLines++;
        const entry = parseTranscriptionEntry(line);
        if (entry) {
          entries.push(entry);
          parsedLines++;
        }
      });
    });
    
    console.log(`📊 Transcription parsing: ${parsedLines}/${totalLines} lines parsed successfully`);
    if (parsedLines === 0 && totalLines > 0) {
      console.error('🚨 No transcription lines were parsed! Check date format compatibility.');
      // Debug: Show first few lines to help identify the format
      const firstFewLines = transcriptions.flatMap(t => t.lines).slice(0, 3);
      console.log('🔍 First few lines for debugging:', firstFewLines.map(line => 
        `"${line}" (length: ${line.length}, chars: ${line.split('').map(c => c.charCodeAt(0)).join(',')})`
      ));
    }
    
    // Sort by timestamp
    return entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  };

  // Group transcription entries based on 7-minute rule
  const groupTranscriptionEntries = (entries: TranscriptionEntry[]): TranscriptionEntry[][] => {
    if (entries.length === 0) return [];
    
    const groups: TranscriptionEntry[][] = [];
    let currentGroup: TranscriptionEntry[] = [entries[0]];
    
    for (let i = 1; i < entries.length; i++) {
      const currentEntry = entries[i];
      const lastEntryInGroup = currentGroup[currentGroup.length - 1];
      
      const timeDiff = currentEntry.timestamp.getTime() - lastEntryInGroup.timestamp.getTime();
      
      if (timeDiff <= SEVEN_MINUTES_MS) {
        // Within 7 minutes, add to current group
        currentGroup.push(currentEntry);
      } else {
        // More than 7 minutes, start new group
        groups.push(currentGroup);
        currentGroup = [currentEntry];
      }
    }
    
    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  };

  // Find photos that fall within the time bounds of a note
  const getPhotosForTimeRange = (photos: Photo[], startTime: Date, endTime: Date): Photo[] => {
    return photos.filter(photo => {
      const photoTime = new Date(photo.uploadTime);
      return photoTime >= startTime && photoTime <= endTime;
    });
  };

  // Generate a title for a note based on its content
  const generateNoteTitle = (entries: TranscriptionEntry[]): string => {
    if (entries.length === 0) return 'Empty Note';
    
    const firstEntry = entries[0];
    const words = firstEntry.text.split(' ').slice(0, 6); // First 6 words
    let title = words.join(' ');
    
    if (firstEntry.text.split(' ').length > 6) {
      title += '...';
    }
    
    return title || `Note from ${firstEntry.timestamp.toLocaleTimeString()}`;
  };

  // Generate enhanced notes from transcriptions and photos
  const generatedNotes = useMemo(() => {
    if (transcriptionsLoading || photosLoading) return [];
    
    // Use only uploaded photos, not glass photos
    const allPhotos = [...photos];
    
    // Get all transcription entries
    const allEntries = getAllTranscriptionEntries(transcriptions);
    
    if (allEntries.length === 0) return [];
    
    // Group entries by 7-minute rule
    const entryGroups = groupTranscriptionEntries(allEntries);
    
    // Create enhanced notes
    const notes: EnhancedNote[] = entryGroups.map((group, index) => {
      const startTime = group[0].timestamp;
      const endTime = group[group.length - 1].timestamp;
      
      // Find all photos within this time range (no limits)
      const notesPhotos = getPhotosForTimeRange(allPhotos, startTime, endTime);
      
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
      const title = generateNoteTitle(group);
      
      // Create content from transcription entries
      const content = group.map(entry => 
        `[${entry.timestamp.toLocaleTimeString()}] ${entry.text}`
      ).join('\n\n');
      
      return {
        id: `generated-${index}-${startTime.getTime()}`,
        title,
        content,
        createdAt: startTime.toISOString(),
        updatedAt: endTime.toISOString(),
        transcriptionEntries: group,
        photos: notesPhotos,
        startTime,
        endTime,
        duration,
        isGenerated: true
      };
    });
    
    return notes.reverse(); // Most recent first
  }, [photos, transcriptions, photosLoading, transcriptionsLoading]);

  // Combine manual and generated notes
  const allNotes = useMemo(() => {
    return [...generatedNotes, ...manualNotes].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [generatedNotes, manualNotes]);

  const addNote = (noteData: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    const newNote: Note = {
      ...noteData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setManualNotes((prev) => [newNote, ...prev]);
  };

  const updateNote = (updatedNote: Note) => {
    // Only allow updating manual notes, not generated ones
    if (updatedNote.id.startsWith('generated-')) return;
    
    setManualNotes((prev) =>
      prev.map((note) => (note.id === updatedNote.id ? updatedNote : note))
    );
  };

  const deleteNote = (id: string) => {
    // Only allow deleting manual notes, not generated ones
    if (id.startsWith('generated-')) return;
    
    setManualNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const searchNotes = async (searchTerm: string): Promise<EnhancedNote[]> => {
    if (!searchTerm.trim()) return allNotes;
    
    const term = searchTerm.toLowerCase();
    
    // Check if search term starts with "image:" prefix
    if (term.startsWith('image:')) {
      const imageSearchTerm = term.substring(6).trim(); // Remove "image:" prefix
      if (!imageSearchTerm) return allNotes;
      
      // Filter notes that have photos with descriptions matching the search term
      const matchingNotes: EnhancedNote[] = [];
      
      for (const note of allNotes) {
        const enhancedNote = note as EnhancedNote;
        if (!enhancedNote.photos || enhancedNote.photos.length === 0) {
          continue;
        }
        
        // Check if any photo description contains the search term
        let hasMatch = false;
        for (const photo of enhancedNote.photos) {
          try {
            // Load photo description from the corresponding .txt file
            const descriptionPath = photo.path.replace(/\.[^.]+$/, '.txt');
            const response = await fetch(`http://localhost:3001${descriptionPath}`);
            if (response.ok) {
              const description = await response.text();
              if (description.toLowerCase().includes(imageSearchTerm)) {
                hasMatch = true;
                break;
              }
            }
          } catch (error) {
            console.warn('Failed to load photo description for search:', error);
          }
        }
        
        if (hasMatch) {
          matchingNotes.push(enhancedNote);
        }
      }
      
      return matchingNotes;
    }
    
    // Regular search through title and content
    return allNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(term) ||
        note.content.toLowerCase().includes(term)
    );
  };

  return {
    notes: allNotes,
    manualNotes,
    generatedNotes,
    addNote,
    updateNote,
    deleteNote,
    searchNotes,
    isLoading: photosLoading || transcriptionsLoading,
    error: photosError || transcriptionsError,
    totalGeneratedNotes: generatedNotes.length,
    totalEntries: generatedNotes.reduce((sum, note) => sum + (note.transcriptionEntries?.length || 0), 0),
    totalPhotos: generatedNotes.reduce((sum, note) => sum + (note.photos?.length || 0), 0)
  };
};