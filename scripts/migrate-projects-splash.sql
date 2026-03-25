-- ============================================================
-- Additive migration: Projects table + Splash version setting
-- Safe to run on an existing DB — skips rows that already exist
-- Run: psql $DATABASE_URL_UNPOOLED < scripts/migrate-projects-splash.sql
-- ============================================================

-- Ensure the settings section exists (needed for section_content FK)
INSERT INTO sections (id, label, visible, sort_order)
VALUES ('settings', 'Settings', false, 99)
ON CONFLICT (id) DO NOTHING;

-- Splash version setting (new key — skipped if already set)
INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('settings', 'splash_enabled', 'true'),
  ('settings', 'splash_version', '1')
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Projects table (no-op if already exists)
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  tech        TEXT[] NOT NULL DEFAULT '{}',
  link        TEXT,
  image_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  visible     BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed initial projects (skips any title that already exists)
INSERT INTO projects (title, description, tech, link, sort_order)
SELECT title, description, tech, link, sort_order
FROM (VALUES
  ('Advanced Chatbot',
   'Built a chatbot for my developer portfolio using TensorFlow.js and the OpenAI API. Designed with React and TypeScript for a responsive experience, styled with Tailwind CSS, and enhanced with Framer Motion animations to deliver an engaging conversational interface.',
   ARRAY['React','TypeScript','TensorFlow.js','OpenAI API','Tailwind CSS','Framer Motion'],
   'https://luis-chatbot.vercel.app/', 0),
  ('Resume Analyzer',
   'A web app that analyzes resumes against job descriptions, providing skill matching, missing keywords, and actionable recommendations. Highlights full-stack development, interactive UI, and real-time insights.',
   ARRAY['React','TypeScript','Python','OpenAI','Tailwind CSS','Framer Motion','Vercel','Render'],
   'https://resume-ai-frontend-orpin.vercel.app', 1),
  ('Voice Assistant',
   'Real-time voice conversation application with streaming speech synthesis and natural language processing. Features live audio streaming, WebRTC communication, and intelligent speech recognition with seamless browser compatibility.',
   ARRAY['React','TypeScript','Python FastAPI','LiveKit','OpenAI Whisper','WebRTC','WebSocket','Vercel','Render'],
   'https://voice-ai-braincx.vercel.app/', 2),
  ('SmartSync Integrator - QuickBooks & Bill.com',
   'Built a comprehensive integration management hub for connecting QuickBooks Online, Bill.com, and Zapier workflows. Features real-time data synchronization, automated token refresh, financial analytics dashboard, and secure API routing for seamless business automation.',
   ARRAY['Next.js','TypeScript','React','Tailwind CSS','QuickBooks API','Bill.com API','OAuth 2.0','Framer Motion','Vercel'],
   'https://smartsync-integrator.vercel.app/', 3),
  ('VA Portfolio Sample',
   'Professional virtual assistant portfolio website with functional contact form, email automation, and modern UI. Features responsive design, interactive animations, and automated email notifications for client inquiries.',
   ARRAY['Next.js 15','TypeScript','Tailwind CSS','Framer Motion','Resend API','GSAP','Swiper','Vercel'],
   'https://va-portfolio-sample.vercel.app/', 4),
  ('Pilates With Bee',
   'Built an online Pilates clinic platform for scheduling sessions, managing content, and providing virtual consultations. Integrated headless CMS and automation tools for streamlined client management.',
   ARRAY['Next.js','React','Tailwind CSS','Sanity CMS','Zapier','Vercel'],
   'https://pilates-w-bee.vercel.app/', 5)
) AS v(title, description, tech, link, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM projects WHERE projects.title = v.title
);

-- Seed section headings/subheadings (only inserts — skips if already customized)
INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('skills',    'heading',    'Tech stack.'),
  ('skills',    'subheading', 'Tools I ship with daily.'),
  ('projects',  'heading',    'Projects.'),
  ('projects',  'subheading', 'Things I''ve shipped.'),
  ('services',  'heading',    'Services.'),
  ('services',  'subheading', 'What I offer.'),
  ('blog',      'heading',    'Blog.'),
  ('blog',      'subheading', 'Thoughts and writeups.'),
  ('contact',   'heading',    'Launch a conversation.'),
  ('contact',   'subheading', 'Let''s build something together.')
ON CONFLICT (section_id, field_key) DO NOTHING;
