import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotes } from "@/hooks/useNotes";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ToggleLeft, ToggleRight, FileText, Clock, Loader2, Mic, MicOff, Square, Play, Pause } from "lucide-react";
import { formatTranscriptDuration } from "@/utils/transcriptSummary";
import { useAsyncSummary } from "@/hooks/useAsyncSummary";
import { PhotoContextDisplay } from "@/components/PhotoContextDisplay";
import { createPhotoContextPairs, type PhotoContextPair } from "@/utils/photoContext";
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
  const [showSummary, setShowSummary] = useState(true);
  const [photoContextPairs, setPhotoContextPairs] = useState<PhotoContextPair[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [speakingType, setSpeakingType] = useState<'summary' | 'transcript' | null>(null);
  const legacyStart = "This is a placeholder summary of the audio note.";
  const isLegacyPlaceholder = (content ?? "").trim().startsWith(legacyStart);
  
  // Check if this note has transcriptions
  const hasTranscriptions = enhancedNote?.transcriptionEntries && enhancedNote.transcriptionEntries.length > 0;
  
  // Use async summary hook for Claude API integration
  const { summary: transcriptSummary, isLoading: summaryLoading, regenerateSummary } = useAsyncSummary(
    hasTranscriptions ? enhancedNote.transcriptionEntries : undefined,
    { maxLength: 200 },
    enhancedNote
  );

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
        let allFinalTranscript = '';
        let allInterimTranscript = '';
        
        // Process all results from the beginning
        for (let i = 0; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            allFinalTranscript += transcriptPart + ' ';
          } else {
            allInterimTranscript += transcriptPart;
          }
        }
        
        // Update states
        setFinalTranscript(allFinalTranscript);
        setTranscript(allFinalTranscript + allInterimTranscript);
        
        console.log('Speech result - Final:', allFinalTranscript, 'Interim:', allInterimTranscript);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  // Load photo context pairs when note changes
  useEffect(() => {
    const loadPhotoContext = async () => {
      if (enhancedNote?.photos && enhancedNote.transcriptionEntries) {
        const pairs = await createPhotoContextPairs(
          enhancedNote.photos,
          enhancedNote.transcriptionEntries
        );
        setPhotoContextPairs(pairs);
      }
    };
    
    loadPhotoContext();
  }, [enhancedNote]);

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
    navigate("/");
  };

  const handleDelete = () => {
    deleteNote(note.id);
    navigate("/");
  };

  const handleChatClose = () => {
    setIsChatOpen(false);
  };

  // Text-to-speech functions
  const speakText = (text: string, type: 'summary' | 'transcript') => {
    if (!window.speechSynthesis) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    // Stop any current speech
    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingType(type);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentUtterance(null);
      setSpeakingType(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentUtterance(null);
      setSpeakingType(null);
    };

    setCurrentUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentUtterance(null);
      setSpeakingType(null);
    }
  };

  const speakFullTranscript = () => {
    if (!enhancedNote?.transcriptionEntries) return;
    
    const fullText = enhancedNote.transcriptionEntries
      .map((entry: any) => entry.text)
      .join(' ');
    
    speakText(fullText, 'transcript');
  };

  const handleVoiceInput = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      // Second press: stop listening and send transcript
      recognition.stop();
      // Wait a moment for final results, then send
      setTimeout(() => {
        const fullTranscript = transcript.trim();
        console.log('Final transcript to send:', fullTranscript);
        if (fullTranscript) {
          setIsChatOpen(true);
        } else {
          console.log('No transcript to send');
          // Reset states if no transcript
          setTranscript("");
          setFinalTranscript("");
        }
      }, 100);
    } else {
      // First press: start listening
      setTranscript("");
      setFinalTranscript("");
      setIsListening(true);
      recognition.start();
    }
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
            <Button
              className="rounded-full px-6 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors active:scale-[0.98] transition-transform"
              onClick={handleSave}
            >
              Save
            </Button>
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

          {/* Audio player for transcription */}
          {hasTranscriptions && (
            <div className="p-0">
              <audio 
                className="w-[calc(100%+22px)] -ml-[22px]" 
                controls 
                style={{ 
                  filter: 'none',
                  background: 'transparent'
                }}
                onPlay={() => speakFullTranscript()}
                onPause={() => stopSpeech()}
              >
                <source src="" type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              {/* Hidden overlay to intercept clicks */}
              <div 
                className="w-[calc(100%+22px)] -ml-[22px] h-12 -mt-12 relative z-10 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  if (speakingType === 'transcript' && isSpeaking) {
                    stopSpeech();
                  } else {
                    speakFullTranscript();
                  }
                }}
              />
            </div>
          )}

          {/* Transcript header and content combined */}
          {hasTranscriptions ? (
            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{enhancedNote.transcriptionEntries?.length} transcript entries</span>
                  {enhancedNote.duration && (
                    <>
                      <span>•</span>
                      <Clock className="h-4 w-4" />
                      <span>{formatTranscriptDuration(enhancedNote.duration)}</span>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSummary(!showSummary)}
                  className="px-0 h-auto bg-transparent hover:bg-transparent border-0 rounded-none shadow-none text-foreground hover:text-muted-foreground transition-colors"
                  disabled={summaryLoading}
                >
                  {summaryLoading
                    ? 'Loading...'
                    : showSummary
                      ? 'Show Full Transcript'
                      : 'Show Summary'}
                </Button>
              </div>

              {showSummary ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground">Summary</h3>
                    {summaryLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {!summaryLoading && transcriptSummary && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => 
                            speakingType === 'summary' && isSpeaking 
                              ? stopSpeech() 
                              : speakText(transcriptSummary, 'summary')
                          }
                          className="p-1 h-6 w-6 hover:bg-muted-foreground/10"
                          aria-label={speakingType === 'summary' && isSpeaking ? "Stop reading summary" : "Read summary"}
                        >
                          {speakingType === 'summary' && isSpeaking ? (
                            <Square className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={regenerateSummary}
                          className="p-1 h-6 w-6 hover:bg-muted-foreground/10"
                          aria-label="Regenerate summary"
                          title="Regenerate summary"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-muted-foreground leading-6">{transcriptSummary}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground mb-3">Full Transcript</h3>
                  {enhancedNote.transcriptionEntries?.map((entry: any, index: number) => (
                    <div key={index} className="py-2">
                      <div className="text-xs text-muted-foreground mb-1">
                        {entry.timestamp.toLocaleString()}
                      </div>
                      <div className="text-sm">
                        {entry.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-0 leading-7">
              {content && content.trim().length > 0 && !isLegacyPlaceholder ? (
                <p className="whitespace-pre-wrap">{content}</p>
              ) : (
                <PlaceholderDoc />
              )}
            </div>
          )}

          {/* Photo Context Display (below transcript/summary) */}
          {photoContextPairs.length > 0 && (
            <PhotoContextDisplay 
              photoContextPairs={photoContextPairs}
              className="mt-6"
            />
          )}
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

      {/* Bottom fade backdrop */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-40 z-40 bg-gradient-to-b from-transparent via-neutral-200/60 to-neutral-300/80 dark:via-neutral-900/50 dark:to-neutral-950/80" />

      {/* Transcript display when listening */}
      {isListening && (
        <div className="fixed inset-x-0 bottom-24 z-50">
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-white rounded-lg shadow-lg p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Listening...</span>
              </div>
              <p className="text-gray-900 min-h-[1.5rem]">
                {transcript || "Start speaking..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fixed footer microphone button */}
      <div className="fixed inset-x-0 bottom-6 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="w-full flex justify-center">
            <button
              type="button"
              aria-label={isListening ? "Stop listening and send" : "Start voice input"}
              title={isListening ? "Stop listening and send" : "Start voice input"}
              className={`h-14 w-14 md:h-16 md:w-16 rounded-full shadow-md focus-visible:ring-2 focus-visible:ring-neutral-300 flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' 
                  : 'bg-neutral-900 text-white hover:bg-black'
              }`}
              onClick={handleVoiceInput}
            >
              {isListening ? (
                <Square className="h-6 w-6" strokeWidth={2.25} />
              ) : (
                <Mic className="h-6 w-6" strokeWidth={2.25} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Chat Dialog */}
      <ChatDialog 
        isOpen={isChatOpen} 
        onClose={handleChatClose} 
        initialQuestion={transcript}
        noteContext={getNoteContext()}
      />
    </div>
  );
};

export default NoteDetail;


