const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks

async function transcribeChunk(chunk: Blob) {
  const formData = new FormData();
  formData.append('file', chunk, 'chunk.mp3');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');
  formData.append('language', 'en');
  formData.append('temperature', '0.0');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Transcription failed');
  }

  return await response.json();
}

export async function transcribeAudio(audioFile: File) {
  try {
    let fullTranscription = '';
    
    // Process in chunks if file is large
    if (audioFile.size > CHUNK_SIZE) {
      const chunks = Math.ceil(audioFile.size / CHUNK_SIZE);
      for (let i = 0; i < chunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, audioFile.size);
        const chunk = audioFile.slice(start, end, audioFile.type);
        
        const result = await transcribeChunk(chunk);
        fullTranscription += result.text + ' ';
      }
    } else {
      const result = await transcribeChunk(audioFile);
      fullTranscription = result.text;
    }

    return { text: fullTranscription.trim() };
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}
