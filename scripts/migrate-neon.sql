-- ============================================================
-- Portfolio CMS — Neon DB Migration
-- Run once: psql $DATABASE_URL_UNPOOLED < scripts/migrate-neon.sql
-- ============================================================

-- 1. Section visibility & ordering
CREATE TABLE IF NOT EXISTS sections (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL DEFAULT '',
  visible     BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Generic key/value content per section
CREATE TABLE IF NOT EXISTS section_content (
  id          SERIAL PRIMARY KEY,
  section_id  TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  field_key   TEXT NOT NULL,
  field_value TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (section_id, field_key)
);

-- 3. Experience entries with parallel track support
CREATE TABLE IF NOT EXISTS experience_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track       TEXT NOT NULL DEFAULT 'main',
  role        TEXT NOT NULL,
  company     TEXT NOT NULL,
  description TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  visible     BOOLEAN NOT NULL DEFAULT true,
  detail_body TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. Projects
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

-- 5. Service tiers
CREATE TABLE IF NOT EXISTS service_tiers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  tagline     TEXT,
  outcome     TEXT,
  price_php   INTEGER,
  price_usd   INTEGER,
  features    TEXT[] NOT NULL DEFAULT '{}',
  is_popular  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  visible     BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 6. Tech stack items
CREATE TABLE IF NOT EXISTS tech_stack_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  icon_key    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  visible     BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 7. Media assets
CREATE TABLE IF NOT EXISTS media_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label         TEXT NOT NULL UNIQUE,
  url           TEXT NOT NULL,
  blob_pathname TEXT,
  mime_type     TEXT,
  size_bytes    BIGINT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Seed sections
INSERT INTO sections (id, label, visible, sort_order) VALUES
  ('hero',       'Hero',       true, 0),
  ('about',      'About',      true, 1),
  ('experience', 'Experience', true, 2),
  ('skills',     'Skills',     true, 3),
  ('projects',   'Projects',   true, 4),
  ('services',   'Services',   true, 5),
  ('blog',       'Blog',       true, 6),
  ('contact',    'Contact',    true, 7),
  ('settings',   'Settings',   false, 99)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

-- Seed hero content
INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('hero', 'name',        'Antonio Luis Santos'),
  ('hero', 'subtitle',    'Software Development & QA'),
  ('hero', 'description', 'Full-Stack, AI, and scalable systems – building future-ready applications that deliver results.'),
  ('hero', 'cta_label',   'Schedule a Call'),
  ('hero', 'cta_url',     'https://calendly.com/antonioluis-santos1/30min')
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Seed about content
INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('about', 'heading',    'About me.'),
  ('about', 'subheading', 'The person behind the code.'),
  ('about', 'body',       'A Full-Stack Software Engineer specializing in generative AI, skilled in ReactJS, Next.js, TailwindCSS, Supabase, Python, FastAPI, and TensorFlow, with hands-on experience integrating AI APIs such as OpenAI. Work includes building websites, chatbots, and intelligent applications, and crafting scalable, future-ready AI solutions. Also a Lead QA Manager and IBM ODM developer, delivering enterprise-grade platforms and decision management systems that align technology with business strategy.')
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Seed experience content
INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('experience', 'heading',    'Experience.'),
  ('experience', 'subheading', 'What I''ve built and where.')
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Seed skills content
INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('skills', 'heading',    'Tech stack.'),
  ('skills', 'subheading', 'Tools I ship with daily.')
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Seed projects content
INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('projects', 'heading',    'Projects.'),
  ('projects', 'subheading', 'Things I''ve shipped.')
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Seed services content
INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('services', 'heading',    'Services.'),
  ('services', 'subheading', 'What I offer.')
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Seed blog content
INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('blog', 'heading',    'Blog.'),
  ('blog', 'subheading', 'Thoughts and writeups.')
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Seed contact content
INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('contact', 'heading',       'Launch a conversation.'),
  ('contact', 'subheading',    'Let''s build something together.'),
  ('contact', 'location',      'Manila, Philippines'),
  ('contact', 'linkedin_url',  'https://linkedin.com/in/antonioluis-santos'),
  ('contact', 'instagram_url', 'https://instagram.com/0xlv1s_'),
  ('contact', 'email',         'antonioluis.santos1@gmail.com')
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Seed experience entries (safe — skips rows with the same role+company+start_date)
INSERT INTO experience_entries (track, role, company, description, start_date, end_date, sort_order)
SELECT track, role, company, description, start_date::date, end_date::date, sort_order
FROM (VALUES
  ('main', 'Senior IBM ODM Specialist (BRMS) & QA Team Manager', 'Bell Canada Inc.',
   'Lead QA for a large-scale, customer-facing platform. Focus on accuracy, reliability, and seamless delivery while fostering a culture of collaboration and accountability.',
   '2024-10-01', NULL, 0),
  ('main', 'Senior IBM ODM Developer', 'Bell Canada Inc.',
   'Lead end-to-end development of IBM ODM BRMS solutions aligned with business and technical requirements.',
   '2023-01-01', '2024-10-01', 1),
  ('main', 'ODM Developer | BRMS Engineer (IBM ODM)', 'Bell Canada Inc.',
   'Contributed to the design and development of enterprise applications using IBM ODM BRMS.',
   '2020-11-01', '2023-01-01', 2),
  ('milestone', 'Subject Matter Expert (Bell Mobility)', 'Bell Canada Inc.',
   'Trusted technical and process resource for Bell Mobility contact centre, driving accuracy, efficiency, and consistent service delivery.',
   '2019-04-01', '2020-11-01', 3),
  ('milestone', 'Hello, World!', 'My Personal Computer',
   'First line of code using C on my Pentium 4-powered PC.',
   '2009-01-01', '2009-12-31', 4)
) AS v(track, role, company, description, start_date, end_date, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM experience_entries e
  WHERE e.role = v.role AND e.company = v.company AND e.start_date = v.start_date::date
);

-- Seed service tiers (safe — skips rows with the same name)
INSERT INTO service_tiers (name, tagline, outcome, price_php, price_usd, features, is_popular, sort_order)
SELECT name, tagline, outcome, price_php, price_usd, features, is_popular, sort_order
FROM (VALUES
  ('Starter', 'Launch fast, look sharp',
   'Get a professional web presence up in days, not months.',
   22000, 599,
   ARRAY['Up to 5 pages', 'Responsive + mobile-first', 'Contact form', 'SEO basics + Analytics', 'Hosting & domain setup', '7-day email support'],
   false, 0),
  ('Professional', 'Built to grow with you',
   'A full-featured platform that drives leads, sales, and credibility.',
   45000, 1199,
   ARRAY['Up to 15 pages', 'E-commerce + payment gateways', 'Advanced SEO & schema markup', 'Analytics dashboard', 'Social media integration', '14-day priority support'],
   true, 1),
  ('Enterprise', 'No limits, full control',
   'Custom-built systems engineered for scale and long-term performance.',
   100000, 2999,
   ARRAY['Unlimited pages', 'Custom backend + APIs', 'Enterprise SEO strategy', 'Dedicated project manager', 'Weekly progress reports', '30-day phone/chat/email support'],
   false, 2)
) AS v(name, tagline, outcome, price_php, price_usd, features, is_popular, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM service_tiers st WHERE st.name = v.name
);

-- ============================================================
-- Chatbot Knowledge + AI Config
-- ============================================================

-- 8. Chatbot learned examples (quarantined until admin approves)
CREATE TABLE IF NOT EXISTS chatbot_examples (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_input  TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  tag         TEXT NOT NULL DEFAULT '',
  approved    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chatbot_examples_approved ON chatbot_examples (approved);
CREATE INDEX IF NOT EXISTS idx_chatbot_examples_created  ON chatbot_examples (created_at DESC);

-- 9. Opt-in conversation logs
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  messages   JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chatbot_convs_created ON chatbot_conversations (created_at DESC);

-- 10. AI provider config (one active row drives chatbot responses)
CREATE TABLE IF NOT EXISTS ai_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                TEXT NOT NULL DEFAULT 'openai',
  model                   TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
  temperature             NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  max_tokens              INTEGER NOT NULL DEFAULT 300,
  use_knowledge           BOOLEAN NOT NULL DEFAULT true,
  system_prompt_override  TEXT,
  active                  BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- Seed default AI configs (safe — skips rows with the same provider+model)
INSERT INTO ai_config (provider, model, temperature, max_tokens, use_knowledge, active)
SELECT provider, model, temperature, max_tokens, use_knowledge, active
FROM (VALUES
  ('openai', 'gpt-3.5-turbo',             0.70::numeric, 300, true, true),
  ('openai', 'gpt-4o-mini',               0.70::numeric, 500, true, false),
  ('claude', 'claude-haiku-4-5-20251001', 0.70::numeric, 300, true, false),
  ('claude', 'claude-sonnet-4-6',         0.70::numeric, 500, true, false)
) AS v(provider, model, temperature, max_tokens, use_knowledge, active)
WHERE NOT EXISTS (
  SELECT 1 FROM ai_config ac WHERE ac.provider = v.provider AND ac.model = v.model
);

-- Seed splash version (bump this value in admin to re-show splash to returning visitors)
INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('settings', 'splash_enabled', 'true'),
  ('settings', 'splash_version', '1')
ON CONFLICT (section_id, field_key) DO NOTHING;

-- Seed projects (safe — skips rows with the same title that already exist)
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
