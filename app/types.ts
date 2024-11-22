export type LectureStatus = 
  | 'draft'
  | 'uploading'
  | 'processing'
  | 'transcribing'
  | 'enhancing'
  | 'completed'
  | 'failed';

export interface Lecture {
  id: string;
  subject_id: string;
  user_id: string;
  heading: string;
  transcript: string;
  enhanced_notes: string;
  subject_tag: string;
  recorded_at: string;
  audio_path?: string;
  status: LectureStatus;
  upload_progress: number;
  transcription_progress: number;
  error_message?: string;
} 