import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import Groq from 'groq-sdk';

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
  try {
    const data = await request.json();
    const { audio } = data;

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio data is required' },
        { status: 400 }
      );
    }

    // Create a temporary file to store the audio
    const tempFilePath = join(tmpdir(), `recording-${Date.now()}.webm`);
    await writeFile(tempFilePath, Buffer.from(audio));

    try {
      // Get transcription from Groq
      const transcription = await groq.audio.transcriptions.create({
        file: tempFilePath,
        model: "whisper-large-v3",
        response_format: "verbose_json",
        language: "en",
        temperature: 0.0,
      });

      // Clean up temporary file
      await unlink(tempFilePath);

      return NextResponse.json(transcription);
    } catch (error) {
      // Clean up temporary file in case of error
      await unlink(tempFilePath);
      throw error;
    }
  } catch (error) {
    console.error('Error in transcribe route:', error);
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    );
  }
}
