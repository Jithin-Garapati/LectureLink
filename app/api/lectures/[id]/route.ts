// app/api/lectures/[id]/route.ts
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
    const { data: lecture, error } = await supabase
      .from('lectures')
      .select(`
        *,
        subject:subjects (
          id,
          name
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) throw error;
    if (!lecture) {
      return NextResponse.json({ error: 'Lecture not found' }, { status: 404 });
    }

    return NextResponse.json(lecture);
  } catch (error) {
    console.error('Error fetching lecture:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lecture' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get lecture details including audio path
    const { data: lecture, error: fetchError } = await supabase
      .from('lectures')
      .select('audio_path, audio_chunks')
      .eq('id', params.id)
      .single();

    if (fetchError) throw fetchError;

    // Delete audio file(s) from storage
    if (lecture?.audio_path) {
      await supabase.storage
        .from('lectures')
        .remove([lecture.audio_path]);
    }

    // Delete any audio chunks if they exist
    if (lecture?.audio_chunks && Array.isArray(lecture.audio_chunks)) {
      await supabase.storage
        .from('lectures')
        .remove(lecture.audio_chunks);
    }

    // Delete the lecture record
    const { error: deleteError } = await supabase
      .from('lectures')
      .delete()
      .eq('id', params.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lecture' },
      { status: 500 }
    );
  }
}