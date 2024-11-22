import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Enable for debugging
const DEBUG = true;

// Type for API Error responses
interface APIError extends Error {
  response?: {
    data?: unknown;
  };
}

if (DEBUG) console.log('API Key:', process.env.NEXT_PUBLIC_GROQ_API_KEY);

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

const SYSTEM_PROMPT = `You are a helpful teaching assistant that generates concise and well-structured notes from lecture transcripts.
Your task is to:
1. Extract the key concepts and main ideas
2. Organize them into clear, bullet-pointed sections
3. Highlight important definitions, formulas, or examples
4. Add brief explanations where necessary

Format the notes in a clear, markdown structure.`;

export async function POST(request: Request) {
  try {
    if (DEBUG) console.log('Starting note generation...');
    
    const { transcription } = await request.json();
    
    if (DEBUG) console.log('Received transcription:', transcription?.substring(0, 100) + '...');

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription is required' },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_GROQ_API_KEY) {
      throw new Error('GROQ API key is not configured');
    }
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: transcription
        }
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1,
    });

    if (DEBUG) console.log('Got completion response');
    
    const notes = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ notes });
  } catch (error) {
    // Detailed error logging
    if (error instanceof Error) {
      const apiError = error as APIError;
      console.error('Error in generate-notes:', {
        name: apiError.name,
        message: apiError.message,
        stack: apiError.stack,
        details: apiError.response?.data || apiError.response || error
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to generate notes',
          details: apiError.message 
        },
        { status: 500 }
      );
    }
    
    // Handle unknown error types
    console.error('Unknown error in generate-notes:', error);
    return NextResponse.json(
      { error: 'Failed to generate notes' },
      { status: 500 }
    );
  }
}
