import { useState, useEffect } from "react";
import { NoteCard } from "@/components/NoteCard";
import { EnhancedNoteCard } from "@/components/EnhancedNoteCard";
import { SearchBar } from "@/components/SearchBar";
import { PhotoGrid } from "@/components/PhotoGrid";
import { TranscriptionGrid } from "@/components/TranscriptionGrid";
import { Card } from "@/components/ui/card";
import { Plus, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNotes } from "@/hooks/useNotes";
import { usePhotos } from "@/hooks/usePhotos";
import { useTranscriptions } from "@/hooks/useTranscriptions";

const Index = () => {
  const { 
    notes, 
    manualNotes, 
    generatedNotes, 
    addNote, 
    updateNote, 
    deleteNote, 
    searchNotes, 
    isLoading: notesLoading, 
    error: notesError, 
    totalGeneratedNotes, 
    totalEntries, 
    totalPhotos 
  } = useNotes();
  const { photos, photosLoading, photosError } = usePhotos();
  const { transcriptions, isLoading: transcriptionsLoading, error: transcriptionsError } = useTranscriptions();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredNotes, setFilteredNotes] = useState(notes);
  const [isSearching, setIsSearching] = useState(false);
  const [searchVersion, setSearchVersion] = useState(0);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleQuickCreate = () => {
    const title = newTitle.trim();
    if (!title) return;
    addNote({ title, content: "" });
    setNewTitle("");
    setShowQuickCreate(false);
  };

  // Handle async search
  useEffect(() => {
    const performSearch = async () => {
      const currentVersion = searchVersion + 1;
      setSearchVersion(currentVersion);
      
      if (!searchTerm.trim()) {
        setFilteredNotes(notes);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      try {
        const results = await searchNotes(searchTerm);
        
        // Only update if this is still the latest search
        if (currentVersion === searchVersion + 1) {
          setFilteredNotes(results);
        }
      } catch (error) {
        console.error('Search error:', error);
        if (currentVersion === searchVersion + 1) {
          setFilteredNotes([]);
        }
      } finally {
        if (currentVersion === searchVersion + 1) {
          setIsSearching(false);
        }
      }
    };

    const debounceTimer = setTimeout(performSearch, 300); // Debounce search
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, notes]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Top Bar aligned to notes container width */}
      <header className="pt-4 px-4 md:px-6 lg:px-8">
        <div className="w-full flex items-center justify-between">
          {/* Logo: blue dot */}
          <div className="flex items-center gap-2">
            <div
              aria-label="App logo"
              className="rounded-full ml-[10px]"
              style={{ backgroundColor: '#1C2ED8', width: '35px', height: '35px' }}
            />
            <span
              className="font-bold text-neutral-900 select-none"
              style={{ fontSize: '32px', lineHeight: '32px', letterSpacing: '-0.05em' }}
            >
              blue
            </span>
          </div>

          {/* Profile button on the right */}
          <div className="flex items-center">
            <Button
              aria-label="Profile"
              className="h-9 w-9 rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
            >
              <span className="sr-only">Profile</span>
              {/* simple placeholder dot/avatar */}
              <div className="h-4 w-4 rounded-full bg-white/90" />
            </Button>
          </div>
        </div>
      </header>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-[196px] pb-12 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl md:text-6xl font-semibold tracking-tight leading-tight mb-6">
          Learning Made Auditory for Dyslexic Students
        </h1>
        
        <div className="max-w-xl mx-auto">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          {isSearching && (
            <div className="flex items-center justify-center mt-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              Searching...
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pb-12">

        {/* Smart Notes Section - Primary Content */}
        <section className="mt-4 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
            </h2>
            {totalGeneratedNotes > 0 && (
              <div className="text-sm text-muted-foreground">
                {totalGeneratedNotes} notes • {totalEntries} entries • {totalPhotos} photos
              </div>
            )}
          </div>
          
          {notesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2">Creating smart notes...</span>
            </div>
          ) : generatedNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No smart notes yet</p>
              <p className="text-sm">Start recording transcriptions to create your first note!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNotes.filter(note => (note as any).isGenerated).map((note) => (
                <EnhancedNoteCard
                  key={note.id}
                  note={note as any}
                  onUpdate={updateNote}
                  onDelete={deleteNote}
                />
              ))}
            </div>
          )}
        </section>

        {/* Raw Data Section - Collapsible */}
        <details className="mt-16">
          <summary className="cursor-pointer text-lg font-semibold mb-4 hover:text-primary">
            📊 Raw Data (Manual Notes, Photos & Transcriptions)
          </summary>
          <section className="space-y-8 pl-4">
            {/* Manual Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">✏️ Manual Notes</h3>
              {manualNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No manual notes yet</p>
                  <Card
                    className="group relative border-dashed hover:border-solid flex items-center justify-center min-h-[120px] cursor-pointer transition-all bg-muted mt-4 max-w-sm mx-auto"
                    onClick={() => setShowQuickCreate(true)}
                  >
                    <div className="flex flex-col items-center text-muted-foreground">
                      <div className="h-8 w-8 rounded-full border flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
                        <Plus className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">Add Manual Note</span>
                    </div>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card
                    className="group relative border-dashed hover:border-solid flex items-center justify-center min-h-[200px] cursor-pointer transition-all bg-muted"
                    onClick={() => setShowQuickCreate(true)}
                  >
                    <div className="flex flex-col items-center text-muted-foreground">
                      <div className="h-10 w-10 rounded-full border flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
                        <Plus className="h-5 w-5" />
                      </div>
                      <span className="font-medium">Add Note</span>
                    </div>
                  </Card>
                  {filteredNotes.filter(note => !(note as any).isGenerated).map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onUpdate={updateNote}
                      onDelete={deleteNote}
                    />
                  ))}
                </div>
              )}
            </div>

            <PhotoGrid
              photos={photos}
              title="📷 Uploaded Photos"
              isLoading={photosLoading}
              error={photosError}
            />
            
            
            <TranscriptionGrid
              transcriptions={transcriptions}
              title="🎤 Transcriptions"
              isLoading={transcriptionsLoading}
              error={transcriptionsError}
            />
          </section>
        </details>
      </main>
      <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
        <DialogContent className="sm:max-w-[520px] p-0 bg-transparent border-0 shadow-none">
          <Input
            autoFocus
            placeholder="Note Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleQuickCreate();
            }}
            className="h-12 text-lg placeholder:text-muted-foreground"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
