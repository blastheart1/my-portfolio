const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDatabase() {
  try {
    // Check if sources column exists
    const { data, error } = await supabase
      .from('blog_posts')
      .select('sources')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('Sources column does not exist, adding it...');
      // Note: In Supabase, you need to add columns via SQL editor
      console.log('Please add the sources column manually via Supabase SQL editor:');
      console.log('ALTER TABLE blog_posts ADD COLUMN sources JSONB DEFAULT \'[]\'::jsonb;');
    } else {
      console.log('Sources column exists');
    }
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

updateDatabase();