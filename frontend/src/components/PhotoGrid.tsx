import { Photo } from '@/hooks/usePhotos';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';

interface PhotoGridProps {
  photos: Photo[];
  title: string;
  isLoading: boolean;
  error: Error | null;
  backendUrl?: string;
}

const BACKEND_URL = 'http://localhost:3001';

export const PhotoGrid = ({ photos, title, isLoading, error, backendUrl = BACKEND_URL }: PhotoGridProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading photos...</span>
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
          <span>Failed to load photos: {error.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {photos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No photos yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.filename} className="overflow-hidden">
              <div className="aspect-square relative">
                <img
                  src={`${backendUrl}${photo.path}`}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkZhaWxlZCB0byBsb2FkPC90ZXh0Pjwvc3ZnPg==';
                  }}
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{photo.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(photo.uploadTime).toLocaleString()}
                </p>
                {photo.size && (
                  <p className="text-xs text-muted-foreground">
                    {(photo.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
