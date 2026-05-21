# Duo-Cinaiko

C'est un projet perso qui utilise Next.js pour apprendre l'anglais et d'autres langues via une application, avec un mélange entre Anki et Duolingo.
Le but est de compléter des phrases à trous (cloze tests).
Les mots et les phrases sont générés directement via Gemini, puis enregistrés sur un fichier Google Sheet qui est synchronisé avec l'application.

---

## Configuration de l'environnement

Pour faire tourner le projet localement, créez un fichier `.env.local` à la racine et renseignez vos clés d'API Supabase :

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Lancement du projet

```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement
npm run dev
```

## Importation de données (JSON via Gemini)

L'importation de données se fait directement depuis l'interface d'administration (`/admin`). Vous pouvez y coller le JSON généré par Gemini pour alimenter les tables.

### 📝 Prompt Gemini recommandé

```text
Objet : Génération de données linguistiques pour application de Cloze-Test

Tu es un expert en linguistique. Génère un jeu de données JSON à partir d'une liste de mots sources.

Instructions de contenu :
- Pour chaque mot, génère 5 phrases distinctes.
- Format Cloze-Test : Le mot cible dans la phrase doit être structuré ainsi : {{mot_a_deviner::traduction_française}}.
- Conjugaison : Utilise le [Indiquer le temps ici, ex: Present Simple / Present Continuous].
- Morphologie : Décompose le mot en Lemme, Radical, Préfixe et Suffixe (si applicable).
- Synonymes Contextuels : Pour chaque phrase, propose entre 1 et 5 synonymes qui pourraient remplacer le mot cible exactement dans ce contexte précis sans changer le sens de la phrase.

Structure technique du JSON attendu (Tableau d'objets) :
- language_code: "en"
- target_word: Le mot étudié.
- part_of_speech: Nature grammaticale.
- grammar_notes: Précisions grammaticales ou temps utilisé.
- lemma: Forme canonique.
- prefix: Préfixe (laisser vide "" si aucun).
- suffix: Suffixe (laisser vide "" si aucun).
- radical: Le radical.
- content_raw: La phrase complète avec la notation {{mot::traduction}}.
- display_text: La phrase avec le trou "[...]".
- answer_target: Le mot à deviner exact.
- hint: La traduction française.
- contextual_synonyms: Tableau contenant entre 1 et 5 synonymes acceptables dans ce contexte précis.

Mots à traiter (issus de ma liste Anki) :
[Copie-colle ici les lignes de ton fichier CSV]
```

---

## Structure de la base de données (Supabase)

Voici le script SQL de la structure actuelle à exécuter sur Supabase :

```sql
-- 1. Table des langues
CREATE TABLE public.languages (
  code text NOT NULL,
  name text NOT NULL,
  CONSTRAINT languages_pkey PRIMARY KEY (code)
) TABLESPACE pg_default;

-- 2. Table des Mots (words)
CREATE TABLE public.words (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  language_code text NOT NULL,
  word text NOT NULL,
  part_of_speech text NULL,
  grammar_notes text NULL,
  lemma text NULL,
  prefix text NULL,
  suffix text NULL,
  radical text NULL,
  CONSTRAINT words_pkey PRIMARY KEY (id),
  CONSTRAINT words_language_code_fkey FOREIGN KEY (language_code) REFERENCES languages (code),
  CONSTRAINT unique_language_word UNIQUE (language_code, word)
) TABLESPACE pg_default;

-- 3. Table des Phrases (sentences)
CREATE TABLE public.sentences (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  word_id uuid NULL,
  language_code text NOT NULL,
  external_id text NULL,
  content_raw text NOT NULL,
  display_text text NOT NULL,
  answer_target text NOT NULL,
  hint text NULL,
  contextual_synonyms text[] NULL DEFAULT '{}',
  created_at timestamp with time zone NULL DEFAULT now(),
  target_word text NULL,
  part_of_speech text NULL,
  grammar_notes text NULL,
  CONSTRAINT sentences_pkey PRIMARY KEY (id),
  CONSTRAINT sentences_external_id_key UNIQUE (external_id),
  CONSTRAINT sentences_language_code_fkey FOREIGN KEY (language_code) REFERENCES languages (code),
  CONSTRAINT sentences_word_id_fkey FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 4. Table des Révisions (word_reviews)
CREATE TABLE public.word_reviews (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  word_id uuid NOT NULL,
  next_review_date timestamp with time zone NULL DEFAULT now(),
  interval integer NULL DEFAULT 0,
  ease_factor double precision NULL DEFAULT 2.5,
  repetition_count integer NULL DEFAULT 0,
  first_studied_at timestamp with time zone NULL,
  last_reviewed_at timestamp with time zone NULL DEFAULT now(),
  created_at timestamp with time zone NULL DEFAULT now(),
  stability double precision NULL,
  difficulty double precision NULL,
  state integer NULL,
  CONSTRAINT word_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT unique_user_word UNIQUE (user_id, word_id),
  CONSTRAINT word_reviews_word_id_fkey FOREIGN KEY (word_id) REFERENCES words (id) ON DELETE CASCADE,
  CONSTRAINT word_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id)
) TABLESPACE pg_default;

-- 5. Table d'historique (review_logs)
CREATE TABLE public.review_logs (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  word_id uuid NOT NULL,
  sentence_id uuid NOT NULL,
  is_correct boolean NOT NULL,
  reviewed_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT review_logs_pkey PRIMARY KEY (id),
  CONSTRAINT review_logs_word_id_fkey FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
  CONSTRAINT review_logs_sentence_id_fkey FOREIGN KEY (sentence_id) REFERENCES sentences(id) ON DELETE CASCADE,
  CONSTRAINT review_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id)
) TABLESPACE pg_default;
```

---

## Historique des modifications apportées

Voici un récapitulatif complet de toutes les évolutions majeures implémentées sur le projet :

1. **Refactoring vers les Révisions par Mot (et non par phrase)** :
   - Création de la table `words` pour stocker de manière unique les informations d'un mot (lemme, préfixe, suffixe, radical, partie du discours).
   - Modification de la table `sentences` pour la lier à un mot via `word_id`.
   - L'algorithme de répétition espacée (SRS) cible désormais le mot global (`word_reviews`), tandis que l'historique d'apprentissage de chaque phrase individuelle est conservé dans `review_logs`.

2. **Dictionnaire / Deck par Mot** :
   - Refonte de la page Deck (`/deck`) pour regrouper l'affichage par mot.
   - Présentation de jusqu'à 3 exemples de phrases par mot avec possibilité d'accéder au reste.

3. **Intégration de l'Algorithme FSRS (Free Spaced Repetition Scheduler) v6** :
   - Création d'un planificateur FSRS personnalisé (`app/utils/fsrs.ts`) basé sur l'état FSRS.
   - Évolution de la table `word_reviews` avec les champs `stability` (stabilité), `difficulty` (difficulté), et `state` (état FSRS).
   - Implémentation du système de notation d'apprentissage sur 4 boutons (À revoir, Difficile, Bien, Facile) avec calcul prédictif en temps réel des prochains intervalles affichés sur chaque bouton.

4. **File d'Attente à Double Validation & Clôture de Session** :
   - Mise en place d'une file d'attente intelligente :
     - Les cartes échouées sont revues en priorité sous 1 minute.
     - Les nouvelles cartes validées sont revues sous 10 minutes pour confirmation.
   - Boucle de clôture forcée : aucune session ne peut se terminer tant que toutes les erreurs de la session n'ont pas été revues et validées.

5. **Gestion Avancée des Synonymes Contextuels** :
   - Ajout d'une colonne `contextual_synonyms` dans la table `sentences`.
   - Gestion d'un état "synonyme" intermédiaire (liseré orange) invitant l'apprenant à trouver le mot cible exact sans pénalité SRS.

6. **Améliorations de l'Interface Utilisateur (Aesthetics & UX)** :
   - Masquage des notes grammaticales/temps (`grammar_notes`) si le mot n'est pas un verbe pour éviter la surcharge.
   - Affichage de la morphologie du mot (lemme, radical, préfixe, suffixe) en bas de carte uniquement après validation.
   - Raccourcis clavier après validation :
     - Touche `M` : Relit le mot cible via la synthèse vocale.
     - Touche `P` : Relit la phrase entière via la synthèse vocale.
     - Touches `1`, `2`, `3`, `4` : Évaluent la difficulté (À revoir, Difficile, Bien, Facile).
     - Touches `Espace` / `Entrée` : Valident ou continuent avec la note par défaut (Bien si correct, Revoir si faux).
   - Les 4 boutons de grading (À revoir, Difficile, Bien, Facile) s'affichent désormais de manière interactive et sont cliquables **que la réponse soit correcte ou incorrecte** (offrant un contrôle total de la notation comme sur Anki).

7. **Gestion et Édition Directe dans le Dictionnaire (Deck)** :
   - Clic sur un mot pour ouvrir une vue détaillée (Modal) contenant toutes ses informations morphologiques et la liste de toutes ses phrases d'exemples.
   - Édition à la volée des informations d'un mot (mot cible, lemme, radical, préfixe, suffixe, nature grammaticale, notes de grammaire) et mise à jour dynamique.
   - Suppression définitive d'un mot avec cascade SQL automatique (supprime les phrases et l'historique SRS associés).
   - Gestion des phrases d'exemples liées à ce mot :
     - Ajout de nouvelles phrases au format Cloze-Test (avec parsing automatique de la réponse et du trou).
     - Prise en charge des synonymes et des traductions lors de la création d'exemples.
     - Suppression de phrases d'exemples individuelles.

8. **Optimisation des performances, intervalles et compteurs Anki (Zéro Latence & Progression)** :
   - Remplacement de l'attente bloquante (`await`) de la sauvegarde en base de données (`saveResult`) par un appel asynchrone en tâche de fond pour une transition instantanée des cartes.
   - Ajustement des intervalles pour les mots vus pour la première fois : **À revoir (Again) : 1 min**, **Difficile (Hard) : 6 min**, et **Bien (Good) : 10 min** (au lieu de 10 min pour Hard et Good auparavant).
   - Les textes des boutons et le label de statut "Confirmation" ont été mis à jour en conséquence.
   - Intégration de compteurs de progression de style Anki en haut de carte : **Bleu (nouveaux mots)**, **Rouge (mots à revoir/apprentissage)**, **Vert (mots déjà vus/révisions)**, et un compteur supplémentaire **Gris (mots validés durant la session)**.
