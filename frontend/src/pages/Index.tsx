import { useState } from "react";
import { NoteCard } from "@/components/NoteCard";
import { SearchBar } from "@/components/SearchBar";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNotes } from "@/hooks/useNotes";

const Index = () => {
  const { notes, addNote, updateNote, deleteNote, searchNotes } = useNotes();
  const [searchTerm, setSearchTerm] = useState("");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleQuickCreate = () => {
    const title = newTitle.trim();
    if (!title) return;
    addNote({ title, content: "" });
    setNewTitle("");
    setShowQuickCreate(false);
  };

  const filteredNotes = searchNotes(searchTerm);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-32 pb-12 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl md:text-6xl font-semibold tracking-tight leading-tight mb-6">
          Learning Made Auditory for Dyslexic Students
        </h1>
        
        <div className="max-w-xl mx-auto">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pb-12">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-16">
            {notes.length === 0 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">No notes yet</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Create your first note to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">No notes found</h2>
                <p className="text-muted-foreground">
                  Try adjusting your search term or create a new note.
                </p>
              </div>
            )}
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
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onUpdate={updateNote}
                onDelete={deleteNote}
              />
            ))}
          </div>
        )}
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
