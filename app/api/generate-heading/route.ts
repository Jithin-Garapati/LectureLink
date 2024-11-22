import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received request body:', body);

    const { transcription, enhancedNotes } = body;
    console.log('Transcription length:', transcription?.length);
    console.log('Enhanced notes length:', enhancedNotes?.length);

    if (!transcription && !enhancedNotes) {
      console.log('No transcription or enhanced notes provided');
      return NextResponse.json({ error: 'No transcription or enhanced notes provided' }, { status: 400 });
    }

    const textToAnalyze = transcription || enhancedNotes;
    console.log('Text to analyze length:', textToAnalyze.length);
    console.log('First 100 chars:', textToAnalyze.substring(0, 100));

    const prompt = `Given this lecture transcription, generate a concise title and subject tag. Format the response as JSON with "heading" and "subjectTag" fields.
    
    Transcription: "${textToAnalyze.substring(0, 1000)}..."
    
    Generate a clear, informative heading that captures the main topic, and a short subject tag (1-3 words) for categorization.`;

    console.log('Sending prompt to Groq');
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "mixtral-8x7b-32768",
      temperature: 0.3,
      max_tokens: 150,
    });

    const response = completion.choices[0]?.message?.content;
    console.log('Groq response:', response);

    if (!response) {
      console.log('No response from Groq');
      throw new Error('No response from Groq');
    }

    try {
      const parsed = JSON.parse(response);
      console.log('Parsed response:', parsed);
      return NextResponse.json({
        heading: parsed.heading,
        subjectTag: parsed.subjectTag
      });
    } catch (error) {
      console.error('Error parsing Groq response:', error);
      return NextResponse.json({
        heading: 'Untitled Lecture',
        subjectTag: 'General'
      });
    }
  } catch (error) {
    console.error('Error in generate-heading:', error);
    return NextResponse.json({ error: 'Failed to generate heading', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}