import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image, Clock, Eye } from "lucide-react";
import type { PhotoContextPair } from "@/utils/photoContext";

interface PhotoContextDisplayProps {
  photoContextPairs: PhotoContextPair[];
  className?: string;
}

export const PhotoContextDisplay = ({ photoContextPairs, className = "" }: PhotoContextDisplayProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const FilledPlayIcon = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <polygon points="8,5 19,12 8,19" />
    </svg>
  );
  const FilledStopIcon = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );

  // Text-to-speech functions
  const speakText = (text: string, index: number) => {
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
      setSpeakingIndex(index);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentUtterance(null);
      setSpeakingIndex(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentUtterance(null);
      setSpeakingIndex(null);
    };

    setCurrentUtterance(utterance);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentUtterance(null);
      setSpeakingIndex(null);
    }
  };

  if (photoContextPairs.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Image className="h-4 w-4" />
        <span>Visual Context ({photoContextPairs.length} photos)</span>
      </div>
      
      {photoContextPairs.map((pair, index) => (
        <div key={pair.photo.filename} className="relative">
          {/* Grey box content aligned with section header */}
          <Card className="p-4 bg-muted/30">
            <div className="flex items-start gap-3">
              {/* Photo thumbnail */}
              <div className="flex-shrink-0">
                <img
                  src={`http://localhost:3001${pair.photo.path}`}
                  alt={pair.photo.filename}
                  className="w-16 h-16 object-cover rounded-md"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              
              {/* Context and metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {pair.timestamp.toLocaleTimeString()}
                  </Badge>
                  {pair.relatedTranscriptions.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      {pair.relatedTranscriptions.length} related
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-start gap-2">
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {pair.context}
                  </p>
                </div>
                
                {/* Show related transcription snippets */}
                {pair.relatedTranscriptions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground/80">
                      Related: "{pair.relatedTranscriptions[0].text.substring(0, 80)}..."
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
          {/* Floating play button to the left, outside the grey box */}
          <button
            type="button"
            onClick={() => 
              speakingIndex === index && isSpeaking 
                ? stopSpeech() 
                : speakText(pair.context, index)
            }
            className="absolute -left-12 top-4 h-8 w-8 text-neutral-400 hover:text-neutral-600 flex items-center justify-center"
            aria-label={speakingIndex === index && isSpeaking ? "Stop reading" : "Read image description"}
          >
            {speakingIndex === index && isSpeaking ? (
              <FilledStopIcon className="h-[1.15rem] w-[1.15rem]" />
            ) : (
              <FilledPlayIcon className="h-[1.15rem] w-[1.15rem]" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
};
