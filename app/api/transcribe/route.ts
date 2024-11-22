import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import Groq from 'groq-sdk';
import fs from 'fs';

// Add error handling for missing API key
if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY environment variable is not set');
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Define the Transcription type based on Groq's response
interface Transcription {
  text: string;
  segments: Array<{
    id: number;
    text: string;
    start: number;
    end: number;
  }>;
}

export async function POST(request: NextRequest) {
  let tempPath: string | null = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Create a temporary file with mp3 extension
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    tempPath = join(tmpdir(), `upload-${Date.now()}.mp3`);
    await writeFile(tempPath, buffer);

    try {
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: "whisper-large-v3-turbo",
        response_format: "verbose_json",
        language: "en",
        temperature: 0.0,
      }) as Transcription;

      // Ensure we're returning a properly formatted response
      return NextResponse.json({
        text: transcription.text,
        segments: transcription.segments
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error('Groq API error:', error);
        return NextResponse.json(
          { error: error.message || 'Error from Groq API' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Unknown error occurred' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Server error:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (tempPath) {
      try {
        await unlink(tempPath);
      } catch (error) {
        console.error('Error cleaning up temp file:', error);
      }
    }
  }
}
