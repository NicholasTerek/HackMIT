import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image, Clock, Eye, Play, Square } from "lucide-react";
import type { PhotoContextPair } from "@/utils/photoContext";

interface PhotoContextDisplayProps {
  photoContextPairs: PhotoContextPair[];
  className?: string;
}

export const PhotoContextDisplay = ({ photoContextPairs, className = "" }: PhotoContextDisplayProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

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
        <Card key={pair.photo.filename} className="p-4 bg-muted/30">
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
                  <Badge variant="secondary" className="text-xs sr-only">
                    <Eye className="h-3 w-3 mr-1" />
                    {pair.relatedTranscriptions.length} related
                  </Badge>
                )}
              </div>
              
              <div className="flex items-start gap-2">
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  {pair.context}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => 
                    speakingIndex === index && isSpeaking 
                      ? stopSpeech() 
                      : speakText(pair.context, index)
                  }
                  className="flex-shrink-0 p-1 h-6 w-6 hover:bg-muted-foreground/10"
                  aria-label={speakingIndex === index && isSpeaking ? "Stop reading" : "Read image description"}
                >
                  {speakingIndex === index && isSpeaking ? (
                    <Square className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              </div>
              
              {/* Hidden related transcription snippets for search functionality */}
              {pair.relatedTranscriptions.length > 0 && (
                <div className="sr-only">
                  <p>
                    Related: "{pair.relatedTranscriptions[0].text.substring(0, 80)}..."
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
