import { useQuery } from '@tanstack/react-query';

export interface Photo {
  filename: string;
  path: string;
  uploadTime: string;
  size?: number;
}

export interface PhotosResponse {
  success: boolean;
  photos: Photo[];
  message?: string;
}

// Backend server URL (configurable via Vite env)
const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';

const fetchPhotos = async (): Promise<Photo[]> => {
  const response = await fetch(`${BACKEND_URL}/photos`);
  if (!response.ok) {
    throw new Error('Failed to fetch photos');
  }
  const data: PhotosResponse = await response.json();
  return data.success ? data.photos : [];
};


export const usePhotos = () => {
  const {
    data: photos = [],
    isLoading: photosLoading,
    error: photosError,
    refetch: refetchPhotos
  } = useQuery({
    queryKey: ['photos'],
    queryFn: fetchPhotos,
    refetchInterval: 5000, // Refetch every 5 seconds like the HTML version
    retry: 3,
    retryDelay: 1000
  });

  return {
    photos,
    isLoading: photosLoading,
    photosLoading,
    error: photosError,
    photosError,
    refetchPhotos,
    refetchAll: () => {
      refetchPhotos();
    }
  };
};
