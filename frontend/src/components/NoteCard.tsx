import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Edit2, Trash2, Save, X } from "lucide-react";

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NoteCardProps {
  note: Note;
  onUpdate: (note: Note) => void;
  onDelete: (id: string) => void;
}

export const NoteCard = ({ note, onUpdate, onDelete }: NoteCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);

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

  return (
    <Card className="group relative bg-card note-card-colors shadow-soft hover:shadow-elevation transition-all duration-300 hover:bg-note-hover animate-fade-in">
      <div className="p-6 cursor-pointer" onClick={() => !isEditing && (window.location.href = `/notes/${note.id}`)}>
        {isEditing ? (
          <div className="space-y-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="font-semibold text-lg border-0 p-0 focus-visible:ring-0 bg-transparent"
              placeholder="Note title..."
            />
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[120px] border-0 p-0 focus-visible:ring-0 bg-transparent resize-none"
              placeholder="Write your note..."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="bg-gradient-primary">
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
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(note.id)}
                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground line-clamp-4 mb-4 leading-relaxed">
              {note.content || "No content..."}
            </p>
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