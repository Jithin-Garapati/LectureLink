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
- Initial scan for key points and main topics
- Identification of core concepts and technologies
- Planning of note structure and organization
- Analysis of practical applications and examples
- Identification of technical requirements and tools]
</think>

Then, follow this detailed analysis framework:

1. 📢 IMPORTANT ANNOUNCEMENTS (if any)
   - Extract any deadlines or important dates mentioned
   - Note any special requirements or prerequisites
   - List any tools or software needed for the course

2. 🎯 CORE CONCEPTS & PRINCIPLES
   For each major concept covered:
   a) Clear Definition
      - Provide a precise, academic definition
      - Follow with a simplified explanation
      - Include any specific terminology explained simply
   
   b) Technical Details
      - List key components and features
      - Explain how different parts work together
      - Include any technical specifications or requirements
   
   c) Practical Applications
      - Show real-world use cases
      - Provide industry examples
      - Explain practical benefits and limitations

3. 💡 KEY TAKEAWAYS
   - List main points from the lecture
   - Highlight crucial concepts to remember
   - Note any dependencies between topics
   - Identify practical skills gained

4. 🔍 TOOLS & RESOURCES
   - List all software and tools mentioned
   - Include any recommended learning resources
   - Note hardware requirements if specified
   - Add links to documentation or guides

Format the notes using clear markdown with:
- Hierarchical headers (###) for main sections
- Bullet points for easy reading
- **Bold** for important terms and concepts
- \`code blocks\` for technical content
- > Blockquotes for important quotes or emphasis
- Tables for comparing features or specifications

Remember to:
- Keep explanations clear and practical
- Focus on real-world applications
- Include all technical details
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