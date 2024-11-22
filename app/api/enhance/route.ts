// app/api/enhance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received request body:', body);

    const transcription = body.transcription?.trim();
    if (!transcription) {
      console.error('No transcription provided or empty');
      return NextResponse.json({ 
        error: 'No transcription provided or empty',
        receivedBody: body 
      }, { status: 400 });
    }

    if (transcription.length < 10) {
      console.error('Transcription too short:', transcription);
      return NextResponse.json({ 
        error: 'Transcription too short',
        length: transcription.length 
      }, { status: 400 });
    }

    const prompt = `This is a classroom lecture recording. Please analyze and enhance it by:

    1. 📢 IMPORTANT ANNOUNCEMENTS (only if exists)
       - Extract any mentions of exams, quizzes, assignments, deadlines, or course requirements
       - Highlight any changes to syllabus or class schedule
       - Note any special instructions or requirements from the teacher

    2. 📝 MAIN CONCEPTS (Simplified)
       - Break down complex topics into simple, easy-to-understand explanations
       - Use everyday examples where possible
       - Include step-by-step breakdowns of difficult concepts
       - Add analogies to help understand abstract ideas

    3. 🎯 KEY POINTS
       - Bullet point all important information
       - Highlight crucial terms and definitions
       - Include any formulas or equations with explanations of what each variable means
       - Note any specific examples the teacher emphasized

    4. 📚 STUDY NOTES
       - Create a quick summary of main topics
       - Add mnemonics or memory tricks if mentioned
       - List any study tips or exam preparation advice given
       - Include any recommended practice problems or readings

    5. ❗ COMMON MISTAKES & WARNINGS
       - Note any common errors the teacher warned about
       - Include specific points the teacher stressed as important
       - Highlight any "this will be on the test" type comments

    Please format in markdown with clear sections and use:
    - Bold for important terms
    - Code blocks for formulas or technical content
    - Bullet points for easy reading
    - Headers for clear organization

    Remember to keep language clear and straightforward while maintaining accuracy.

    Transcription: "${body.transcription.substring(0, 2000)}..."`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "mixtral-8x7b-32768",
      temperature: 0.3,
      max_tokens: 2000,
    });

    const enhancedNotes = completion.choices[0]?.message?.content;
    if (!enhancedNotes) {
      throw new Error('No response from Groq');
    }

    return NextResponse.json({ enhanced_notes: enhancedNotes });
  } catch (error) {
    console.error('Error in enhance:', error);
    return NextResponse.json({ 
      error: 'Failed to enhance notes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}