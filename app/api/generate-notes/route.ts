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

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY environment variable is not set');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const NOTE_GENERATION_PROMPT = `Analyze the provided transcript of a teacher's lesson and generate a structured set of notes with two main sections:

**Important Announcements**
- Extract and list all deadlines, exam dates, project guidelines, or schedule changes
- Include administrative details like submission portals, required materials, and policy updates

**Study Notes**
For each major concept covered:
### [Concept Name]
- **What it is**: Simple 1-2 sentence definition in everyday language
- **Example**: Relatable analogy or scenario
- **Key Detail**: Highlight common misunderstandings or important rules
- **Practice**: Sample question or exercise
- **Connections**: Links to prior lessons or real-life applications

Guidelines:
- Use bullet points and clear headings
- Avoid jargon, prioritize simplicity
- Highlight must-know details for exams
- Flag and clarify commonly confused areas

Here's the lecture transcript to analyze:`;

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

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: NOTE_GENERATION_PROMPT + "\n\n" + transcription
        }
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.6,
      max_tokens: 2048,
      top_p: 0.95,
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
