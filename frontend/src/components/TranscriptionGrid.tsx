import { Transcription } from '@/hooks/useTranscriptions';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle, FileText } from 'lucide-react';

interface TranscriptionGridProps {
  transcriptions: Transcription[];
  title: string;
  isLoading: boolean;
  error: Error | null;
}

export const TranscriptionGrid = ({ transcriptions, title, isLoading, error }: TranscriptionGridProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading transcriptions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <AlertCircle className="h-6 w-6 mr-2" />
          <span>Failed to load transcriptions: {error.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {transcriptions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No transcriptions yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transcriptions.map((transcription) => (
            <Card key={transcription.filename} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <h3 className="font-medium text-sm truncate">{transcription.filename}</h3>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transcription.lines.length > 0 ? (
                    transcription.lines.map((line, index) => {
                      // Parse timestamp and text from log format: [timestamp] text
                      const match = line.match(/^\[(.*?)\]\s*(.*)$/);
                      const timestamp = match ? match[1] : '';
                      const text = match ? match[2] : line;
                      
                      return (
                        <div key={index} className="border-l-2 border-blue-200 pl-3 py-1">
                          {timestamp && (
                            <div className="text-xs text-muted-foreground mb-1">
                              {new Date(timestamp).toLocaleString()}
                            </div>
                          )}
                          <div className="text-sm">{text}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-muted-foreground">No content</div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    {transcription.lines.length} entries
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
