import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import path from 'path';
import os from 'os';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Utility function to split a buffer into chunks of specified size
function splitBuffer(buffer: Buffer, maxSizeInBytes: number): Buffer[] {
  const chunks = [];
  let offset = 0;
  while (offset < buffer.length) {
    const end = Math.min(offset + maxSizeInBytes, buffer.length);
    chunks.push(buffer.slice(offset, end));
    offset = end;
  }
  return chunks;
}

export const runtime = 'nodejs'; // Using Node.js runtime (or 'edge' if you're using the Edge runtime)
export const dynamic = 'force-dynamic'; // Optional: Specify dynamic behavior if needed

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const maxChunkSize = 25 * 1024 * 1024; // 25 MB

    let transcriptionText = '';

    // Split the buffer if it exceeds 25 MB
    const audioChunks = splitBuffer(buffer, maxChunkSize);

    // Process each chunk individually
    for (const chunk of audioChunks) {
      const chunkFile = new File([chunk], 'audio_chunk.webm', { type: 'audio/webm' });
      const transcription = await groq.audio.transcriptions.create({
        file: chunkFile,
        model: "whisper-large-v3-turbo",
        response_format: "verbose_json",
      });

      // Append each chunk's transcription text
      transcriptionText += transcription.text;
    }

    // Enhance the transcription into notes
    const enhancedNotes = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
You are an expert educational assistant tasked with converting a transcript of a classroom lecture into comprehensive and well-organized lecture notes. Your goal is to make the material clear and accessible for students studying the subject. Please follow these guidelines:

Structure the Notes:

Title: Provide a clear and descriptive title based on the lecture topic.
Introduction: Summarize the main objectives and key points of the lecture.
Sections and Subsections: Divide the content into logical sections and subsections with appropriate headings.
Content Clarity:

Explain Concepts Clearly: Rewrite the transcript content to ensure that all concepts are explained in a clear and understandable manner.
Use Examples: Include relevant examples to illustrate complex ideas. Examples should be practical and relatable.
Include Formulas (If Applicable): Present any necessary formulas neatly, and provide explanations of each component of the formulas.
Enhance Understanding:

Highlight Key Points: Use bullet points or numbering to emphasize important information.
Include Instructor's Key Remarks: Pay attention to any important points or announcements made by the instructor during the lecture (such as upcoming assignments, deadlines, or exam-related instructions), and include them in a separate "Instructor's Announcements" section or under relevant headings where appropriate.
Interactive Elements:

Solvable Problems: At the end of each major section, include a few solvable problems or questions that were discussed or are relevant to the lecture material.
Solutions (Optional): If solutions were provided during the lecture, include them. Otherwise, indicate that solutions can be found in the accompanying materials.
Formatting:

Use clear and consistent formatting for headings, subheadings, bullet points, and numbered lists.
Ensure proper grammar, punctuation, and spelling throughout the notes.
Final Review:

Ensure that the notes flow logically and cover all the key points from the transcript.
Make sure that the explanations are thorough enough for someone who did not attend the lecture to understand the material.
Transcript: [Insert the lecture transcript here]

Instructions:

Generate the lecture notes based on the above guidelines.
Do not include the transcript in the final notes.
Ensure the notes are self-contained and do not require external references to understand the content.

`
        },
        {
          role: "user",
          content: transcriptionText
        }
      ],
      model: "llama-3.2-90b-text-preview",
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1,
      stream: false,
    });

    return NextResponse.json({ 
      transcription: transcriptionText, 
      enhancedNotes: enhancedNotes.choices[0].message.content 
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json({ error: 'Error processing audio' }, { status: 500 });
  }
}
