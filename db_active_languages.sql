-- Migration SQL : Support 7 Langues et Activation Utilisateur

-- 1. Insertion/Mise à jour des 7 langues dans public.languages
INSERT INTO public.languages (code, name) VALUES
  ('en', 'Anglais'),
  ('de', 'Allemand'),
  ('es', 'Espagnol'),
  ('pt', 'Portugais'),
  ('it', 'Italien'),
  ('zh', 'Chinois'),
  ('ja', 'Japonais')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 2. Création de la table de liaison user_active_languages
CREATE TABLE IF NOT EXISTS public.user_active_languages (
  user_id uuid NOT NULL,
  language_code text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_active_languages_pkey PRIMARY KEY (user_id, language_code),
  CONSTRAINT user_active_languages_language_code_fkey FOREIGN KEY (language_code) REFERENCES public.languages (code) ON DELETE CASCADE,
  CONSTRAINT user_active_languages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 3. Désactivation de la RLS pour cette table pour correspondre au reste
ALTER TABLE public.user_active_languages DISABLE ROW LEVEL SECURITY;

-- 4. Initialisation des langues actives par défaut (en, es, de) pour tous les utilisateurs existants
INSERT INTO public.user_active_languages (user_id, language_code)
SELECT id, 'en' FROM auth.users ON CONFLICT DO NOTHING;

INSERT INTO public.user_active_languages (user_id, language_code)
SELECT id, 'es' FROM auth.users ON CONFLICT DO NOTHING;

INSERT INTO public.user_active_languages (user_id, language_code)
SELECT id, 'de' FROM auth.users ON CONFLICT DO NOTHING;
