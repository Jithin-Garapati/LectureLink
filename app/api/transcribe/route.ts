import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { createReadStream } from 'fs';
import formidable from 'formidable';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Increased timeout

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob | null;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const isLastChunk = chunkIndex === totalChunks - 1;

    if (!audioFile) {
      return NextResponse.json({ error: 'No valid audio file provided' }, { status: 400 });
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a temporary file path
    const tempFilePath = `/tmp/chunk_${chunkIndex}.webm`;
    await require('fs').promises.writeFile(tempFilePath, buffer);

    try {
      const transcription = await groq.audio.transcriptions.create({
        file: createReadStream(tempFilePath),
        model: "whisper-large-v3-turbo",
        response_format: "verbose_json"
      });

      // Clean up temp file
      await require('fs').promises.unlink(tempFilePath);

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
      // Clean up temp file in case of error
      await require('fs').promises.unlink(tempFilePath).catch(() => {});
      throw error;
    }

  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json({ 
      error: 'Error processing audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
