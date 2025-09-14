import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotes } from "@/hooks/useNotes";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import FooterSearchBar from "@/components/FooterSearchBar";
import ChatDialog from "@/components/ChatDialog";

const NoteDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { notes, updateNote, deleteNote } = useNotes();

  const note = useMemo(() => notes.find((n) => n.id === id), [notes, id]);
  
  // Check if this is an enhanced note with photos
  const enhancedNote = note as any; // Cast to access enhanced properties
  
  // Deduplicate photos by filename to prevent duplicates
  const uniquePhotos = enhancedNote?.photos ? 
    enhancedNote.photos.filter((photo: any, index: number, array: any[]) => 
      array.findIndex((p: any) => p.filename === photo.filename) === index
    ) : [];
  
  const hasPhotos = uniquePhotos.length > 0;
  const PlaceholderDoc = () => (
    <div className="space-y-6 leading-7">
      <h2 className="text-2xl font-semibold">Lecture Overview</h2>
      <p>
        Today’s session introduced the core concept of
        <span className="ml-1 rounded bg-[#FEF3C7] px-1.5 py-0.5">derivatives</span>
        and how they model rates of change in real systems. We examined graphical intuition, formal
        definitions, and practical interpretations.
      </p>

      <h3 className="text-xl font-semibold">Key Ideas</h3>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          The derivative at a point is the slope of the tangent line — estimated by
          <span className="ml-1 rounded bg-[#E0F2FE] px-1.5 py-0.5">difference quotients</span> that
          approach zero separation.
        </li>
        <li>
          Common rules include the
          <span className="ml-1 rounded bg-[#E9D5FF] px-1.5 py-0.5">product</span>,
          <span className="ml-1 rounded bg-[#FDE68A] px-1.5 py-0.5">quotient</span>, and
          <span className="ml-1 rounded bg-[#BBF7D0] px-1.5 py-0.5">chain</span> rules.
        </li>
        <li>
          Units matter: if position is in meters and time in seconds, then the derivative is
          <span className="ml-1 rounded bg-[#E0E7FF] px-1.5 py-0.5">meters/second</span> (velocity).
        </li>
      </ul>

      <h3 className="text-xl font-semibold">Worked Example</h3>
      <p>
        For <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5">s(t) = t³ − 4t</span>, the derivative is
        <span className="ml-1 rounded bg-[#DCFCE7] px-1.5 py-0.5">s′(t) = 3t² − 4</span>. At
        <span className="ml-1 rounded bg-[#FFE4E6] px-1.5 py-0.5">t = 2</span>, the instantaneous velocity is
        <span className="ml-1 rounded bg-[#D1FAE5] px-1.5 py-0.5">8</span> m/s.
      </p>

      <h3 className="text-xl font-semibold">Action Items</h3>
      <ul className="list-disc pl-6 space-y-2">
        <li>Review derivative rules and practice with 5–7 exercises.</li>
        <li>Sketch two functions and estimate slopes visually at several points.</li>
        <li>Prepare one real‑life example where rate of change is meaningful.</li>
      </ul>

      <blockquote className="border-l-4 pl-4 text-muted-foreground">
        Tip: highlight formulas or results with subtle colors to improve scanning without adding
        visual noise.
      </blockquote>
    </div>
  );

  const [title, setTitle] = useState(note?.title ?? "Untitled Audio Note");
  const [content, setContent] = useState(note?.content ?? "");
  const [searchInput, setSearchInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const legacyStart = "This is a placeholder summary of the audio note.";
  const isLegacyPlaceholder = (content ?? "").trim().startsWith(legacyStart);

  // Keep local state in sync when navigating from the list before notes load
  useEffect(() => {
    if (note) {
      setTitle(note.title || "Untitled Audio Note");
      setContent(note.content ?? "");
    }
  }, [note]);

  if (!note) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-muted-foreground mb-4">Note not found.</p>
        <Button onClick={() => navigate("/")}>Back</Button>
      </div>
    );
  }

  const handleSave = () => {
    updateNote({ ...note, title, content, updatedAt: new Date().toISOString() });
  };

  const handleDelete = () => {
    deleteNote(note.id);
    navigate("/");
  };

  const handleChatSubmit = (question: string) => {
    if (question.trim()) {
      setChatQuestion(question.trim());
      setIsChatOpen(true);
      setSearchInput(""); // Clear the search input
    }
  };

  const handleChatClose = () => {
    setIsChatOpen(false);
    setChatQuestion("");
  };

  // Extract note context for AI
  const getNoteContext = () => {
    if (!note) return "";
    
    // For enhanced notes with transcription entries, use the raw transcript
    const enhancedNote = note as any;
    if (enhancedNote.transcriptionEntries && enhancedNote.transcriptionEntries.length > 0) {
      return enhancedNote.transcriptionEntries
        .map((entry: any) => entry.text)
        .join(' ');
    }
    
    // For regular notes, use the content
    return note.content || "";
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 items-center">
          <div className="lg:col-span-1">
            <Button variant="outline" className="rounded-full px-5" onClick={() => navigate("/")}>Back</Button>
          </div>
          <div className="hidden lg:block" />
          <div className="lg:col-span-1 flex justify-end gap-2 lg:pr-4">
            <Button variant="outline" className="rounded-full px-5" onClick={handleDelete}>Delete</Button>
            <Button className="bg-gradient-primary rounded-full px-6" onClick={handleSave}>Save</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 pb-40 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-transparent border-0 shadow-none outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 p-0 text-3xl md:text-4xl font-semibold"
          />

          {/* Audio player placeholder */}
          <div className="p-0">
            <audio className="w-[calc(100%+22px)] -ml-[22px]" controls src="">
              Your browser does not support the audio element.
            </audio>
          </div>

          {/* Summary paragraph */}
          <div className="p-0 leading-7">
            {content && content.trim().length > 0 && !isLegacyPlaceholder ? (
              <p className="whitespace-pre-wrap">{content}</p>
            ) : (
              <PlaceholderDoc />
            )}
          </div>
        </div>

        {/* Sidebar with actual photos */}
        <aside className="lg:col-span-1">
          <div className="rounded-md p-4 space-y-3">
            {hasPhotos ? (
              uniquePhotos.map((photo: any, i: number) => {
                const src = `http://localhost:3001${photo.path}`;
                return (
                  <Dialog key={photo.filename}>
                    <DialogTrigger asChild>
                      <button className="aspect-[4/3] w-full overflow-hidden rounded-md bg-secondary cursor-zoom-in focus:outline-none">
                        <img
                          src={src}
                          alt={photo.filename}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // Hide broken images
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl p-0 border-0 bg-transparent shadow-none">
                      <img src={src} alt={photo.filename} className="w-full h-auto rounded-lg" />
                    </DialogContent>
                  </Dialog>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No photos for this note</p>
              </div>
            )}
          </div>
        </aside>

      </main>

      {/* Bottom fade backdrop to make the search bar pop */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-40 z-40 bg-gradient-to-b from-transparent via-neutral-200/60 to-neutral-300/80 dark:via-neutral-900/50 dark:to-neutral-950/80" />

      {/* Fixed footer search bar aligned to page container */}
      <div className="fixed inset-x-0 bottom-6 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <FooterSearchBar 
              value={searchInput} 
              onChange={setSearchInput} 
              onSubmit={handleChatSubmit}
              placeholder="Ask anything" 
            />
          </div>
        </div>
      </div>

      {/* Chat Dialog */}
      <ChatDialog 
        isOpen={isChatOpen} 
        onClose={handleChatClose} 
        initialQuestion={chatQuestion}
        noteContext={getNoteContext()}
      />
    </div>
  );
};

export default NoteDetail;


