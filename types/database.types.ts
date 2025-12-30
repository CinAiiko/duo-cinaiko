export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      languages: {
        Row: {
          code: string;
          name: string;
        };
        Insert: {
          code: string;
          name: string;
        };
        Update: {
          code?: string;
          name?: string;
        };
      };
      sentences: {
        Row: {
          id: string;
          language_code: string;
          external_id: string | null;
          content_raw: string;
          display_text: string;
          answer_target: string;
          hint: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          language_code: string;
          external_id?: string | null;
          content_raw: string;
          display_text: string;
          answer_target: string;
          hint?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          language_code?: string;
          external_id?: string | null;
          content_raw?: string;
          display_text?: string;
          answer_target?: string;
          hint?: string | null;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          sentence_id: string;
          next_review_date: string;
          interval: number;
          ease_factor: number;
          repetition_count: number;
          first_studied_at: string | null;
          last_reviewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sentence_id: string;
          next_review_date?: string;
          interval?: number;
          ease_factor?: number;
          repetition_count?: number;
          first_studied_at?: string | null;
          last_reviewed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sentence_id?: string;
          next_review_date?: string;
          interval?: number;
          ease_factor?: number;
          repetition_count?: number;
          first_studied_at?: string | null;
          last_reviewed_at?: string;
        };
      };
    };
  };
}
