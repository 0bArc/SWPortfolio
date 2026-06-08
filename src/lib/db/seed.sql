-- Dev-only seed. Never run automatically on production update.
INSERT INTO posts (slug, title, excerpt, content, tags, author, status, date, reading_time)
VALUES (
  'hei-verden',
  'Hello, world',
  'First post on my blog. A bit about what I plan to write about going forward.',
  E'Welcome to my blog. I plan to write about things I learn, projects I work on, and thoughts on coding and security.\n\n## What I will write about\n\nThe plan is to cover things that actually interest me:\n\n- Coding and projects I am working on\n- Cybersecurity and what I am learning\n- Tools and technology I use\n\nMore content coming soon.\n',
  ARRAY['meta'],
  'Sander Kristiansen',
  'published',
  '2026-06-05',
  1
) ON CONFLICT (slug) DO NOTHING;
