// app/api/subjects/[id]/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: subject, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching subject:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subject' },
        { status: 500 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(subject);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}