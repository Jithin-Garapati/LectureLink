import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// GET single lecture by id
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  console.log('Fetching lecture with ID:', id);

  try {
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) {
      console.error('Lecture not found');
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 });
    }

    console.log('Lecture data:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE single lecture by id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  console.log('Deleting lecture with ID:', id);

  if (!id) {
    return NextResponse.json({ error: 'Lecture ID is required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('lectures')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('Lecture deleted successfully');
    return NextResponse.json({ message: 'Lecture deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
