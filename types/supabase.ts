export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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