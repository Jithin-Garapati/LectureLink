import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';

// Add error handling for missing API key
if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY environment variable is not set');
}

// This should be a secure secret key stored in your environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export async function POST() {
  try {
    // Create a short-lived token that includes the Groq API key
    const token = sign(
      { 
        apiKey: process.env.GROQ_API_KEY,
        exp: Math.floor(Date.now() / 1000) + (5 * 60) // 5 minutes expiration
      },
      process.env.JWT_SECRET
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
