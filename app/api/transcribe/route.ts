import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Utility function to split a buffer into chunks
function splitBuffer(buffer: Buffer, maxSizeInBytes: number): Buffer[] {
  const chunks = [];
  let offset = 0;
  while (offset < buffer.length) {
    const end = Math.min(offset + maxSizeInBytes, buffer.length);
    chunks.push(buffer.slice(offset, end));
    offset = end;
  }
  return chunks;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Changed from 300 to 60 seconds for Vercel Hobby plan

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const isLastChunk = chunkIndex === totalChunks - 1;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    // Process single chunk
    const chunkFile = new File([buffer], `chunk_${chunkIndex}.webm`, { type: 'audio/webm' });
    const transcription = await groq.audio.transcriptions.create({
      file: chunkFile,
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json"
    });

    // Only process enhanced notes on the last chunk
    if (isLastChunk) {
      const enhancedNotes = await groq.chat.completions.create({
        messages: [
          { role: "system", content: `Your existing prompt...` },
          { role: "user", content: transcription.text }
        ],
        model: "llama-3.2-90b-text-preview",
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        stream: false,
      });

      return NextResponse.json({ 
        transcription: transcription.text.trim(),
        enhancedNotes: enhancedNotes.choices[0].message.content,
      });
    }

    return NextResponse.json({ 
      transcription: transcription.text.trim(),
    });

  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json({ 
      error: 'Error processing audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
