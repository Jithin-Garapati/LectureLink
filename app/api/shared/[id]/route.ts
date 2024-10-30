import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { Database } from '@/types/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data: lecture, error } = await supabase
      .from('lectures')
      .select(`
        *,
        subjects (
          name
        )
      `)
      .eq('id', params.id)
      .single() as { data: Database['public']['Tables']['lectures']['Row'] & { subjects: { name: string } | null }, error: null };

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: String(error) }, { status: 400 });
    }

    if (!lecture) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 });
    }

    const formattedLecture = {
      ...lecture,
      subject_name: lecture.subjects?.name || 'Unknown Subject',
      formatted_date: new Date(lecture.recorded_at).toLocaleDateString(),
      formatted_time: new Date(lecture.recorded_at).toLocaleTimeString(),
    };

    return NextResponse.json(formattedLecture);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 