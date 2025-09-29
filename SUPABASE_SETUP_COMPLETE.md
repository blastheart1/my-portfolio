# Complete Supabase Setup Guide

## 🎯 Current Status
- ✅ Blog system code is ready
- ✅ Cron job configuration is set up
- ⚠️ Database connection needs to be configured

## 🚀 Quick Setup Steps

### Step 1: Get Supabase Project URL and API Key

1. **Go to your Supabase project dashboard:**
   - Visit [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Get Project URL and API Key:**
   - Go to **Settings** → **API**
   - Copy the **Project URL** (e.g., `https://dueakwjavikbamngrkri.supabase.co`)
   - Copy the **anon public** API key

### Step 2: Update Environment Variables

Add these to your `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://dueakwjavikbamngrkri.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# OpenAI API Key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

# Cron secret
CRON_SECRET=blog_cron_secret_2024_secure
```

### Step 3: Create Database Table

1. **Go to Supabase SQL Editor:**
   - In your Supabase dashboard
   - Go to **SQL Editor**

2. **Run this SQL to create the table:**
```sql
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('blog', 'case-study')),
  topic VARCHAR(100) NOT NULL,
  metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published BOOLEAN DEFAULT true
);
```

### Step 4: Deploy to Vercel

```bash
# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
# Go to Project Settings → Environment Variables
# Add all variables from .env.local
```

### Step 5: Test the System

```bash
# Test content generation
curl -X POST "https://your-domain.vercel.app/api/blog/generate" \
     -H "Content-Type: application/json" \
     -d '{}'

# Check if content was created
curl -X GET "https://your-domain.vercel.app/api/blog"
```

## 🔧 Alternative: Use Supabase Client

If you prefer to use Supabase's client instead of direct PostgreSQL:

1. **Install Supabase client:**
```bash
npm install @supabase/supabase-js
```

2. **Update database.ts to use Supabase client:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

## 🎉 What Happens Next

Once set up:
- ✅ Cron job runs every 2 days
- ✅ Generates new blog posts and case studies
- ✅ Content is stored permanently in Supabase
- ✅ Beautiful UI displays the content
- ✅ AI-powered content generation

## 🆘 Troubleshooting

### Database Connection Issues
- Check Supabase project is active
- Verify API keys are correct
- Ensure table was created successfully

### Content Generation Issues
- Verify OpenAI API key is valid
- Check API key has sufficient credits
- Ensure environment variables are set in Vercel

### Cron Job Issues
- Verify CRON_SECRET is set in Vercel
- Check Vercel Functions logs
- Ensure vercel.json is deployed

## 📊 Monitoring

- **Supabase Dashboard**: Monitor database usage
- **Vercel Dashboard**: Check function logs
- **OpenAI Dashboard**: Monitor API usage

The system will automatically generate fresh content every 2 days, keeping your portfolio dynamic and engaging!