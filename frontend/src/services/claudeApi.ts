// This file is deprecated - use backendApi.ts instead
// All Claude API calls now go through the backend to avoid CORS issues

export const claudeApi = {
  summarizeTranscript: () => {
    throw new Error('Direct Claude API calls are disabled. Use backendApiService instead.');
  },
  summarizeTranscriptionEntries: () => {
    throw new Error('Direct Claude API calls are disabled. Use backendApiService instead.');
  }
};
