-- 003_work_section_headings.sql
--
-- Seeds the Work section's heading and subheading so they are editable from
-- /edit like every other section, rather than living as hardcoded fallbacks.
--
-- EXPAND ONLY. ON CONFLICT DO NOTHING rather than DO UPDATE: if these have
-- already been edited in the admin, re-running must not overwrite the wording.

INSERT INTO section_content (section_id, field_key, field_value) VALUES
  ('work', 'heading',    'Work.'),
  ('work', 'subheading', 'Things you can actually try, not screenshots.')
ON CONFLICT (section_id, field_key) DO NOTHING;
