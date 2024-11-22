// This file can be deleted as we're now processing directly with Groq from the frontend

import { NextResponse } from 'next/server';

export async function POST() {
  try {
    return NextResponse.json({ message: 'Audio processing has been moved to client-side' }, { status: 410 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
