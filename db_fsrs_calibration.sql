-- Migration SQL : Calibration FSRS et Paramètres par Langue

-- 1. Ajout de la colonne rating (note de 1 à 4) dans la table review_logs
ALTER TABLE public.review_logs ADD COLUMN IF NOT EXISTS rating integer NULL;

-- 2. Remplissage rétroactif des lignes existantes (Again/1 si incorrect, Good/3 si correct)
UPDATE public.review_logs 
SET rating = CASE WHEN is_correct = true THEN 3 ELSE 1 END 
WHERE rating IS NULL;

-- 3. Création de la table des configurations FSRS utilisateur par langue
CREATE TABLE IF NOT EXISTS public.user_fsrs_settings (
  user_id uuid NOT NULL,
  language_code text NOT NULL,
  weights double precision[] NOT NULL DEFAULT '{0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.28, 2.61}',
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_fsrs_settings_pkey PRIMARY KEY (user_id, language_code),
  CONSTRAINT user_fsrs_settings_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.languages (code) ON DELETE CASCADE,
  CONSTRAINT user_fsrs_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 4. Désactivation de la sécurité Row Level Security (RLS) pour correspondre au reste de la base
ALTER TABLE public.user_fsrs_settings DISABLE ROW LEVEL SECURITY;
