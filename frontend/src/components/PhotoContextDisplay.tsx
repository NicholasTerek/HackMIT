import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image, Clock, Eye } from "lucide-react";
import type { PhotoContextPair } from "@/utils/photoContext";

interface PhotoContextDisplayProps {
  photoContextPairs: PhotoContextPair[];
  className?: string;
}

export const PhotoContextDisplay = ({ photoContextPairs, className = "" }: PhotoContextDisplayProps) => {
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
                  <Badge variant="secondary" className="text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    {pair.relatedTranscriptions.length} related
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed">
                {pair.context}
              </p>
              
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
      ))}
    </div>
  );
};
