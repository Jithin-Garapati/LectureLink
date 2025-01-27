// app/api/enhance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

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

    const prompt = `As an expert educational content analyzer, your task is to transform this lecture transcription into comprehensive, well-structured study notes. 

First, show your thought process:

<think duration="30">
[Your step-by-step analysis of the lecture content, including:
- Initial scan for announcements and key points
- Identification of core concepts
- Planning of note structure
- Consideration of examples and applications
- Analysis of potential student challenges]
</think>

Then, follow this detailed analysis framework:

1. 📢 CRITICAL ANNOUNCEMENTS & ADMINISTRATIVE DETAILS
   - Extract and highlight ALL deadlines, exam dates, and assignment details with exact dates
   - Note any changes to course structure, syllabus modifications, or schedule adjustments
   - List specific requirements for assignments, projects, or exams
   - Include submission guidelines, formatting requirements, and grading criteria
   - Highlight any special instructions or prerequisites mentioned

2. 🎯 CORE CONCEPTS & PRINCIPLES
   For each major concept covered:
   a) Clear Definition
      - Provide a precise, academic definition
      - Follow with a simplified explanation in everyday language
      - Include any specific terminology or jargon with clear explanations
   
   b) Detailed Breakdown
      - List all key components or elements
      - Explain relationships between different aspects
      - Include any formulas, equations, or technical details
   
   c) Real-World Applications
      - Connect theoretical concepts to practical uses
      - Provide concrete examples from industry or daily life
      - Explain why this concept is important

3. 💡 LEARNING OBJECTIVES & KEY TAKEAWAYS
   - Identify the main learning goals from the lecture
   - List skills or knowledge students should acquire
   - Highlight concepts that build on previous lectures
   - Note any prerequisites or foundational knowledge needed

4. 📝 STUDY GUIDE & EXAM PREPARATION
   - Create practice questions with detailed solutions
   - Provide study strategies specific to the content
   - List common misconceptions and how to avoid them
   - Include memory aids, mnemonics, or learning techniques
   - Note any specific areas the professor emphasized

5. 🔍 SUPPLEMENTARY RESOURCES
   - List any recommended readings, textbooks, or materials
   - Include links to additional resources mentioned
   - Note any software, tools, or equipment needed
   - Mention relevant research papers or publications

6. ❗ IMPORTANT WARNINGS & COMMON PITFALLS
   - Document specific warnings from the professor
   - List common mistakes students make
   - Include critical points that are often misunderstood
   - Note any challenging aspects that need extra attention

Format the notes using clear markdown with:
- Hierarchical headers (###) for main sections
- Bullet points for easy reading
- **Bold** for important terms and concepts
- \`code blocks\` for technical content
- > Blockquotes for professor's direct quotes or emphasis
- Tables for organized information where appropriate

Remember to:
- Maintain academic rigor while ensuring clarity
- Use clear, precise language
- Include ALL important details
- Structure information logically
- Make complex concepts accessible

Here's the lecture transcription to analyze:

"${transcription}"`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 0.95,
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