import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { transcription, enhancedNotes } = await req.json();

    const prompt = `
      Analyze the following lecture transcription and enhanced notes. Then:
      1. Generate a concise heading of 3-5 words that captures the main topic.
      2. Create a single-word subject tag that best categorizes the lecture content.

      Transcription excerpt: ${transcription.substring(0, 300)}...
      Enhanced Notes excerpt: ${enhancedNotes.substring(0, 300)}...

      Provide your response in the following JSON format:
      {
        "heading": "Your 3-5 word heading here",
        "subjectTag": "YourSingleWordTag"
      }

      Ensure the heading is descriptive but concise, and the subjectTag is a single word without spaces.
    `;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that generates concise headings and subject tags for academic lectures."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 150,
      stream: false,
    });

    const content = completion.choices[0].message.content;
    const response = content ? JSON.parse(content) : null;

    // Ensure subjectTag is a single word
    response.subjectTag = response.subjectTag.replace(/\s+/g, '');

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating heading:', error);
    return NextResponse.json({ error: 'Failed to generate heading and tag' }, { status: 500 });
  }
}