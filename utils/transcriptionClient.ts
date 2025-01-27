const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB to be safely under 25MB limit
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Get API keys from environment
const API_KEYS = [
  process.env.NEXT_PUBLIC_GROQ_API_KEY,
  process.env.NEXT_PUBLIC_GROQ_API_KEY_2
].filter(Boolean);

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function transcribeChunkWithRetry(chunk: Blob, retryCount = 0, keyIndex = 0): Promise<any> {
  try {
    const formData = new FormData();
    formData.append('file', chunk, 'chunk.mp3');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'verbose_json');
    formData.append('language', 'en');
    formData.append('temperature', '0.0');

    const apiKey = API_KEYS[keyIndex];
    if (!apiKey) {
      throw new Error('No valid API key available');
    }

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 413) {
        throw new Error('File too large. Please try a smaller chunk size.');
      }
      if (response.status === 429) { // Too Many Requests
        // Try the next API key if available
        if (keyIndex + 1 < API_KEYS.length) {
          console.log('Rate limit hit, switching to backup API key...');
          return transcribeChunkWithRetry(chunk, retryCount, keyIndex + 1);
        }
        // If we've tried all keys, wait and retry with the first one
        console.log('All API keys rate limited, waiting before retry...');
        await sleep(RETRY_DELAY * (retryCount + 1));
        return transcribeChunkWithRetry(chunk, retryCount + 1, 0);
      }
      throw new Error(error.error?.message || `Transcription failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Retry attempt ${retryCount + 1} for chunk...`);
      // Try the next API key on retry if available
      const nextKeyIndex = (keyIndex + 1) % API_KEYS.length;
      await sleep(RETRY_DELAY * (retryCount + 1)); // Exponential backoff
      return transcribeChunkWithRetry(chunk, retryCount + 1, nextKeyIndex);
    }
    throw error;
  }
}

export async function transcribeAudio(audioFile: File) {
  try {
    if (API_KEYS.length === 0) {
      throw new Error('No Groq API keys configured');
    }

    let fullTranscription = '';
    const chunks: Blob[] = [];
    
    // Split file into chunks
    let offset = 0;
    while (offset < audioFile.size) {
      const chunk = audioFile.slice(offset, offset + MAX_FILE_SIZE);
      chunks.push(chunk);
      offset += MAX_FILE_SIZE;
    }

    console.log(`Split audio into ${chunks.length} chunks`);

    // Process chunks sequentially with progress tracking
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${(chunks[i].size / (1024 * 1024)).toFixed(2)}MB)`);
      try {
        // Start with a random API key for better load distribution
        const startKeyIndex = Math.floor(Math.random() * API_KEYS.length);
        const result = await transcribeChunkWithRetry(chunks[i], 0, startKeyIndex);
        fullTranscription += result.text + ' ';
        console.log(`Successfully processed chunk ${i + 1}`);
      } catch (chunkError: any) {
        console.error(`Error processing chunk ${i + 1}:`, chunkError);
        throw new Error(`Failed to process chunk ${i + 1}: ${chunkError.message}`);
      }
    }

    return { text: fullTranscription.trim() };
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}
