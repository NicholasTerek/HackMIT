import { useQuery } from '@tanstack/react-query';

export interface Transcription {
  filename: string;
  content: string;
  lines: string[];
}

export interface TranscriptionsResponse {
  success: boolean;
  transcriptions: Transcription[];
  message?: string;
}

// Backend server URL (configurable via Vite env)
const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';

const fetchTranscriptions = async (userId?: string): Promise<Transcription[]> => {
  const url = userId ? `${BACKEND_URL}/transcriptions/${userId}` : `${BACKEND_URL}/transcriptions`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch transcriptions');
  }
  const data: TranscriptionsResponse = await response.json();
  return data.success ? data.transcriptions : [];
};

export const useTranscriptions = (userId?: string) => {
  const {
    data: transcriptions = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['transcriptions', userId],
    queryFn: () => fetchTranscriptions(userId),
    refetchInterval: 5000, // Refetch every 5 seconds to get new transcriptions
    retry: 3,
    retryDelay: 1000
  });

  return {
    transcriptions,
    isLoading,
    error,
    refetch
  };
};
