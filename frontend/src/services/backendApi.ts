// Backend API service for transcript summarization
class BackendApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:3001';
  }

  async summarizeTranscript(transcript: string, maxLength: number = 150): Promise<string> {
    try {
      console.log('📤 Sending summarization request to backend...');
      
      const response = await fetch(`${this.baseUrl}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          maxLength
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Backend summarization failed');
      }

      console.log('✅ Summary received from backend');
      return data.summary;
    } catch (error) {
      console.error('❌ Backend API error:', error);
      throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const backendApiService = new BackendApiService();
