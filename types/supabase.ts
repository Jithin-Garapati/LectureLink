export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AuthChangeEvent =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'PASSWORD_RECOVERY'
  | 'TOKEN_REFRESHED'
  | 'MFA_CHALLENGE_VERIFIED';

export interface Database {
  public: {
    Tables: {
      lectures: {
        Row: {
          id: string
          subject_id: string
          heading: string
          subject_tag: string
          transcript: string
          enhanced_notes: string
          recorded_at: string
          user_id: string
          status: 'draft' | 'recording' | 'completed'
        }
        Insert: {
          id?: string
          subject_id: string
          heading: string
          subject_tag: string
          transcript: string
          enhanced_notes: string
          recorded_at: string
          user_id: string
          status: 'draft' | 'recording' | 'completed'
        }
        Update: {
          id?: string
          subject_id?: string
          heading?: string
          subject_tag?: string
          transcript?: string
          enhanced_notes?: string
          recorded_at?: string
          user_id?: string
          status?: 'draft' | 'recording' | 'completed'
        }
      }
      subjects: {
        Row: {
          id: string
          name: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 