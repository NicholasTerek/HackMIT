import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { Note } from "./NoteCard";

interface NewNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (note: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
}

export const NewNoteDialog = ({ open, onOpenChange, onSave }: NewNoteDialogProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSave = () => {
    if (title.trim() || content.trim()) {
      onSave({
        title: title.trim(),
        content: content.trim(),
      });
      setTitle("");
      setContent("");
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setTitle("");
    setContent("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] animate-scale-in">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Input
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-medium"
          />
          <Textarea
            placeholder="Write your note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px] resize-none"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() && !content.trim()}
              className="bg-gradient-primary"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};