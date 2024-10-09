import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';

// GET all lectures, ordered by recorded_at
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST a new lecture
export async function POST(request: NextRequest) {
  try {
    const lectureData = await request.json();
    console.log('Received lecture data:', lectureData);

    // Validate required fields
    const requiredFields = ['subject_id', 'heading', 'subject_tag', 'transcript', 'enhanced_notes', 'recorded_at'];
    for (const field of requiredFields) {
      if (!lectureData[field]) {
        console.error(`Missing required field: ${field}`);
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('lectures')
      .insert(lectureData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('Lecture saved successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE a lecture by id
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Lecture ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('lectures')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Lecture deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
