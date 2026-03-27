-- ============================================================
-- Additive migration: Profile photo URL keys for hero section
-- Safe to run on an existing DB — skips rows that already exist
-- Run: psql $DATABASE_URL_UNPOOLED < scripts/migrate-photos.sql
-- ============================================================

INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('hero', 'photo_default_url', '/profile-photo2.png'),
  ('hero', 'photo_hover_url',   '/square-profile-photo.jpeg'),
  ('hero', 'photo_dark_url',    '/profile-photo2.png')
ON CONFLICT (section_id, field_key) DO NOTHING;
