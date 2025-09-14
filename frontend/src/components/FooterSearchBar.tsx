import { useId } from "react";
import { Plus, ArrowUpRight } from "lucide-react";

interface FooterSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
}

export const FooterSearchBar = ({ value, onChange, onSubmit, placeholder = "Ask anything" }: FooterSearchBarProps) => {
  const id = useId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value.trim());
      }
    }
  };

  return (
    <div className="w-full flex justify-center">
      <form onSubmit={handleSubmit} className="relative w-full">
        <label htmlFor={id} className="sr-only">Search</label>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="w-full h-14 md:h-16 rounded-full bg-white text-neutral-900 placeholder:text-neutral-400 border border-neutral-200 shadow-[0_6px_24px_rgba(0,0,0,0.08)] pl-14 pr-24 outline-none focus:ring-2 focus:ring-neutral-300"
        />

        {/* Left plus icon */}
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shadow-sm">
          <Plus className="h-5 w-5 text-neutral-600" />
        </div>

        {/* Right send button */}
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-md hover:bg-black focus:outline-none"
          aria-label="Send"
        >
          <ArrowUpRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};

export default FooterSearchBar;


