import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export enum LectureStatus {
  RECORDING = 'recording',
  PROCESSING = 'processing',
  TRANSCRIBING = 'transcribing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

interface LectureUpdate {
  status: LectureStatus | string;
  transcript?: string;
  error_message?: string;
  enhanced_notes?: string;
  heading?: string;
  subject_tag?: string;
}

export class AudioStorage {
  private supabase = createClientComponentClient();

  async createLecture(subjectId: string, userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('lectures')
        .insert({
          subject_id: subjectId,
          user_id: userId,
          status: LectureStatus.PROCESSING,
          recorded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to create lecture: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('Error creating lecture:', error);
      throw error;
    }
  }

  async updateLectureStatus(lectureId: string, update: LectureUpdate) {
    try {
      // Validate status before update
      if (update.status && !Object.values(LectureStatus).includes(update.status as LectureStatus)) {
        throw new Error(`Invalid status: ${update.status}`);
      }

      // Filter out undefined values to ensure we only update what's provided
      const updateData = Object.fromEntries(
        Object.entries({
          status: update.status,
          transcript: update.transcript,
          error_message: update.error_message,
          enhanced_notes: update.enhanced_notes,
          heading: update.heading,
          subject_tag: update.subject_tag,
          updated_at: new Date().toISOString()
        }).filter(([, value]) => value !== undefined)
      );

      const { error } = await this.supabase
        .from('lectures')
        .update(updateData)
        .eq('id', lectureId);

      if (error) {
        throw new Error(`Failed to update lecture: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating lecture status:', error);
      throw error;
    }
  }

  async clearRecording(lectureId: string) {
    try {
      const { error } = await this.supabase
        .from('lectures')
        .delete()
        .eq('id', lectureId);

      if (error) throw error;
    } catch (error) {
      console.error('Error clearing recording:', error);
      throw error;
    }
  }
}