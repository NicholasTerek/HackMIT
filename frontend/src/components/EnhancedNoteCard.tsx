import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Edit2, Trash2, Save, X, Clock, FileText, Camera, Calendar, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import type { EnhancedNote } from "@/hooks/useNotes";
import { formatTranscriptDuration } from "@/utils/transcriptSummary";
import { useAsyncSummary } from "@/hooks/useAsyncSummary";

interface EnhancedNoteCardProps {
  note: EnhancedNote;
  onUpdate: (note: EnhancedNote) => void;
  onDelete: (id: string) => void;
  backendUrl?: string;
}

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';

export const EnhancedNoteCard = ({ note, onUpdate, onDelete, backendUrl = BACKEND_URL }: EnhancedNoteCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);
  const [showSummary, setShowSummary] = useState(true);

  const handleSave = () => {
    onUpdate({
      ...note,
      title: editTitle,
      content: editContent,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const isGenerated = note.isGenerated;
  const hasPhotos = note.photos && note.photos.length > 0;
  const hasTranscriptions = note.transcriptionEntries && note.transcriptionEntries.length > 0;
  
  // Use async summary hook for Claude API integration
  const { summary: transcriptSummary, isLoading: summaryLoading } = useAsyncSummary(
    hasTranscriptions ? note.transcriptionEntries : undefined,
    { maxLength: 100 },
    note
  );
  
  // Get display content based on summary toggle
  const displayContent = hasTranscriptions && showSummary 
    ? transcriptSummary 
    : note.content;

  return (
    <Card className="group relative bg-card note-card-colors shadow-soft hover:shadow-elevation transition-all duration-300 hover:bg-note-hover animate-fade-in overflow-hidden">
      <div className="p-6 cursor-pointer" onClick={() => !isEditing && (window.location.href = `/notes/${note.id}`)}>
        {isEditing ? (
          <div className="space-y-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="font-semibold text-lg border-0 p-0 focus-visible:ring-0 bg-transparent"
              placeholder="Note title..."
              disabled={isGenerated}
            />
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[120px] border-0 p-0 focus-visible:ring-0 bg-transparent resize-none"
              placeholder="Write your note..."
              disabled={isGenerated}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="bg-gradient-primary" disabled={isGenerated}>
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-lg text-card-foreground line-clamp-2">
                {note.title || "Untitled Note"}
              </h3>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(note.id);
                  }}
                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              {hasTranscriptions && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>{note.transcriptionEntries?.length} entries</span>
                    {note.duration && (
                      <>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{formatTranscriptDuration(note.duration)}</span>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSummary(!showSummary);
                    }}
                    className="h-6 px-2 text-xs hover:bg-primary/10"
                    disabled={summaryLoading}
                  >
                    {summaryLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Loading...
                      </>
                    ) : showSummary ? (
                      <>
                        <ToggleRight className="h-3 w-3 mr-1" />
                        Summary
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-3 w-3 mr-1" />
                        Full
                      </>
                    )}
                  </Button>
                </div>
              )}
              <p className="text-muted-foreground line-clamp-4 leading-relaxed">
                {displayContent || "No content..."}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {note.updatedAt !== note.createdAt
                ? `Updated ${formatDate(note.updatedAt)}`
                : `Created ${formatDate(note.createdAt)}`}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
