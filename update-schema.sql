-- Add sources column to blog_posts table
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS sources JSONB;

-- Update existing records to have empty sources array
UPDATE blog_posts 
SET sources = '[]'::jsonb 
WHERE sources IS NULL;