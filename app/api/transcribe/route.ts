import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks

export const config = {
  api: {
    bodyParser: false,
  },
};

async function saveFileLocally(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) {
    throw new Error('No file uploaded');
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Save to temp directory with unique name
  const tempPath = join(tmpdir(), `${uuidv4()}-${file.name}`);
  await writeFile(tempPath, buffer);
  return { path: tempPath, size: buffer.length };
}

async function transcribeChunk(chunk: Buffer) {
  const formData = new FormData();
  formData.append('file', new Blob([chunk], { type: 'audio/mpeg' }), 'chunk.mp3');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'verbose_json');
  formData.append('language', 'en');
  formData.append('temperature', '0.0');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Transcription failed');
  }

  return await response.json();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { path, size } = await saveFileLocally(formData);

    let fullTranscription = '';
    const buffer = await readFile(path);
    
    // Process in chunks if file is large
    if (size > CHUNK_SIZE) {
      const chunks = Math.ceil(size / CHUNK_SIZE);
      for (let i = 0; i < chunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, size);
        const chunk = buffer.slice(start, end);
        
        const result = await transcribeChunk(chunk);
        fullTranscription += result.text + ' ';
      }
    } else {
      const result = await transcribeChunk(buffer);
      fullTranscription = result.text;
    }

    // Clean up temp file
    await unlink(path);

    return NextResponse.json({ text: fullTranscription.trim() });
  } catch (error) {
    console.error('Error in transcribe:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
