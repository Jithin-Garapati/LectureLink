export async function transcribeAudio(audioFile: File) {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', audioFile);

    // Send to our backend endpoint instead of Groq directly
    const response = await fetch('/api/transcribe', {
      method: 'POST',
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
