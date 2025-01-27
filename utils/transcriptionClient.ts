export async function transcribeAudio(audioFile: File) {
  try {
    // First, get a secure token from our server
    const tokenResponse = await fetch('/api/transcribe', {
      method: 'POST',
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to get authentication token');
    }
    
    const { token } = await tokenResponse.json();
    
    // Create form data for Groq API
    const formData = new globalThis.FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'verbose_json');
    formData.append('language', 'en');
    formData.append('temperature', '0.0');

    // Make direct request to Groq API
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Transcription failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}
