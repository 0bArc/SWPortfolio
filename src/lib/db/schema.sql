CREATE TABLE IF NOT EXISTS posts (
  id           SERIAL PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  excerpt      TEXT NOT NULL DEFAULT '',
  content      TEXT NOT NULL DEFAULT '',
  tags         TEXT[] NOT NULL DEFAULT '{}',
  author       TEXT NOT NULL DEFAULT 'Sander Kristiansen',
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  date         DATE NOT NULL,
  reading_time INT NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS posts_status_date ON posts (status, date DESC);

-- Dev seed (skipped if slug already exists)
INSERT INTO posts (slug, title, excerpt, content, tags, author, status, date, reading_time)
VALUES (
  'hei-verden',
  'Hei, verden',
  'Første innlegg på bloggen min. Litt om hva jeg planlegger å skrive om fremover.',
  E'Velkommen til bloggen min. Her planlegger jeg å skrive om ting jeg lærer, prosjekter jeg jobber med, og tanker rundt koding og sikkerhet.\n\n## Hva jeg skal skrive om\n\nPlanen er å dekke ting som faktisk interesserer meg:\n\n- Koding og prosjekter jeg holder på med\n- Cybersikkerhet og det jeg lærer\n- Verktøy og teknologi jeg bruker\n\nMer innhold kommer snart.\n',
  ARRAY['meta'],
  'Sander Kristiansen',
  'published',
  '2026-06-05',
  1
) ON CONFLICT (slug) DO NOTHING;
