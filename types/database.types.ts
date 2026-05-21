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
      words: {
        Row: {
          id: string;
          language_code: string;
          word: string;
          part_of_speech: string | null;
          grammar_notes: string | null;
          lemma: string | null;
          prefix: string | null;
          suffix: string | null;
          radical: string | null;
        };
        Insert: {
          id?: string;
          language_code: string;
          word: string;
          part_of_speech?: string | null;
          grammar_notes?: string | null;
          lemma?: string | null;
          prefix?: string | null;
          suffix?: string | null;
          radical?: string | null;
        };
        Update: {
          id?: string;
          language_code?: string;
          word?: string;
          part_of_speech?: string | null;
          grammar_notes?: string | null;
          lemma?: string | null;
          prefix?: string | null;
          suffix?: string | null;
          radical?: string | null;
        };
      };
      sentences: {
        Row: {
          id: string;
          word_id: string | null;
          language_code: string;
          external_id: string | null;
          content_raw: string;
          display_text: string;
          answer_target: string;
          hint: string | null;
          created_at: string;
          target_word: string | null;
          part_of_speech: string | null;
          grammar_notes: string | null;
          contextual_synonyms: string[] | null;
        };
        Insert: {
          id?: string;
          word_id?: string | null;
          language_code: string;
          external_id?: string | null;
          content_raw: string;
          display_text: string;
          answer_target: string;
          hint?: string | null;
          created_at?: string;
          target_word?: string | null;
          part_of_speech?: string | null;
          grammar_notes?: string | null;
          contextual_synonyms?: string[] | null;
        };
        Update: {
          id?: string;
          word_id?: string | null;
          language_code?: string;
          external_id?: string | null;
          content_raw?: string;
          display_text?: string;
          answer_target?: string;
          hint?: string | null;
          created_at?: string;
          target_word?: string | null;
          part_of_speech?: string | null;
          grammar_notes?: string | null;
          contextual_synonyms?: string[] | null;
        };
      };
      word_reviews: {
        Row: {
          id: string;
          user_id: string;
          word_id: string;
          next_review_date: string;
          interval: number;
          ease_factor: number;
          repetition_count: number;
          first_studied_at: string | null;
          last_reviewed_at: string;
          stability: number | null;
          difficulty: number | null;
          state: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          word_id: string;
          next_review_date?: string;
          interval?: number;
          ease_factor?: number;
          repetition_count?: number;
          first_studied_at?: string | null;
          last_reviewed_at?: string;
          stability?: number | null;
          difficulty?: number | null;
          state?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          word_id?: string;
          next_review_date?: string;
          interval?: number;
          ease_factor?: number;
          repetition_count?: number;
          first_studied_at?: string | null;
          last_reviewed_at?: string;
          stability?: number | null;
          difficulty?: number | null;
          state?: number | null;
        };
      };
      review_logs: {
        Row: {
          id: string;
          user_id: string;
          word_id: string;
          sentence_id: string;
          is_correct: boolean;
          reviewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          word_id: string;
          sentence_id: string;
          is_correct: boolean;
          reviewed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          word_id?: string;
          sentence_id?: string;
          is_correct?: boolean;
          reviewed_at?: string;
        };
      };
    };
  };
}
