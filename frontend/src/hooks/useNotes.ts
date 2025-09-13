import { useState, useEffect } from "react";
import { Note } from "@/components/NoteCard";

const STORAGE_KEY = "notes-app-data";

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);

  // Load notes from localStorage on mount
  useEffect(() => {
    const storedNotes = localStorage.getItem(STORAGE_KEY);
    if (storedNotes) {
      try {
        setNotes(JSON.parse(storedNotes));
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
          title: "Today’s Thoughts",
          content: "Write a few lines about your day...",
          createdAt: now,
          updatedAt: now,
        },
      ];
      setNotes(sampleNotes);
    }
  }, []);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = (noteData: Omit<Note, "id" | "createdAt" | "updatedAt">) => {
    const newNote: Note = {
      ...noteData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const updateNote = (updatedNote: Note) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === updatedNote.id ? updatedNote : note))
    );
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const searchNotes = (searchTerm: string) => {
    if (!searchTerm.trim()) return notes;
    
    const term = searchTerm.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(term) ||
        note.content.toLowerCase().includes(term)
    );
  };

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    searchNotes,
  };
};