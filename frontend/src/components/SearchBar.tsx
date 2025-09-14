import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const SearchBar = ({ searchTerm, onSearchChange }: SearchBarProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search notes... (use 'image: text' to search photo descriptions)"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-12 pr-12 h-12 rounded-full bg-muted/60 border border-muted/60 hover:bg-muted focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 transition-colors"
      />
      {searchTerm && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSearchChange("")}
          className="absolute right-1.5 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 rounded-full hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};