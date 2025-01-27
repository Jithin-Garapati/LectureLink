import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { Database } from '@/types/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!params.id) {
      return NextResponse.json(
        { error: 'Lecture ID is required' },
        { status: 400 }
      );
    }

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
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Lecture not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch lecture' },
        { status: 400 }
      );
    }

    if (!lecture) {
      return NextResponse.json(
        { error: 'Lecture not found' },
        { status: 404 }
      );
    }

    if (lecture.status !== 'completed') {
      return NextResponse.json(
        { error: 'Lecture is still processing' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}