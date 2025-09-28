# Database and Cron Setup Guide

This guide will help you set up PostgreSQL and cron jobs for the blog system.

## 🚀 Quick Setup (Automated)

Run the setup script:

```bash
npm run setup-database
```

## 📋 Manual Setup Steps

### Step 1: Environment Variables

Create `.env.local` file:

```bash
# OpenAI API Key (required)
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

# Vercel Postgres Database (will be provided after database creation)
POSTGRES_URL=your_vercel_postgres_url_here
POSTGRES_PRISMA_URL=your_vercel_postgres_url_here
POSTGRES_URL_NON_POOLING=your_vercel_postgres_url_here
POSTGRES_USER=your_postgres_user_here
POSTGRES_HOST=your_postgres_host_here
POSTGRES_PASSWORD=your_postgres_password_here
POSTGRES_DATABASE=your_postgres_database_here

# Cron job secret for authentication
CRON_SECRET=your_random_secret_here
```

### Step 2: Vercel Postgres Setup

#### Option A: Using Vercel CLI
```bash
# Link to Vercel (if not already linked)
vercel link

# Create Postgres database
vercel storage create postgres
```

#### Option B: Using Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Storage** tab
4. Click **Create Database** → **Postgres**
5. Copy the connection details to your `.env.local`

### Step 3: Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
# Go to Project Settings → Environment Variables
```

### Step 4: Initialize Database

```bash
# Initialize database schema
curl -X GET "https://your-domain.vercel.app/api/init-db" \
     -H "Authorization: Bearer your_cron_secret"
```

### Step 5: Test Content Generation

```bash
# Generate test content
curl -X POST "https://your-domain.vercel.app/api/blog/generate" \
     -H "Content-Type: application/json" \
     -d '{}'
```

## 🔧 Alternative Database Options

### Option 1: Supabase (Free tier available)
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Start local development
supabase start

# Get connection string
supabase status
```

### Option 2: Railway PostgreSQL
1. Go to [Railway](https://railway.app)
2. Create new project
3. Add PostgreSQL database
4. Copy connection string to `.env.local`

### Option 3: Neon Database (Free tier)
1. Go to [Neon](https://neon.tech)
2. Create new project
3. Copy connection string to `.env.local`

## ⏰ Cron Job Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-content",
      "schedule": "0 0 */2 * *"
    }
  ]
}
```

**Schedule Options:**
- `0 0 */2 * *` - Every 2 days at midnight UTC
- `0 0 */1 * *` - Daily at midnight UTC
- `0 0 * * 0` - Weekly on Sunday at midnight UTC

## 🧪 Testing the Setup

### Local Testing
```bash
# Start development server
npm run dev

# Test database initialization
curl -X GET "http://localhost:3000/api/init-db" \
     -H "Authorization: Bearer your_cron_secret"

# Test content generation
curl -X POST "http://localhost:3000/api/blog/generate" \
     -H "Content-Type: application/json" \
     -d '{}'
```

### Production Testing
```bash
# Test production endpoints
curl -X GET "https://your-domain.vercel.app/api/blog"
curl -X POST "https://your-domain.vercel.app/api/blog/generate" \
     -H "Content-Type: application/json" \
     -d '{}'
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify POSTGRES_URL is correct
   - Check Vercel environment variables
   - Ensure database is created and accessible

2. **OpenAI API Error**
   - Verify NEXT_PUBLIC_OPENAI_API_KEY is set
   - Check API key has sufficient credits
   - Ensure API key is valid

3. **Cron Job Not Running**
   - Verify CRON_SECRET is set in Vercel
   - Check vercel.json configuration
   - Verify cron job is enabled in Vercel dashboard

4. **Environment Variables Not Working**
   - Ensure variables are set in Vercel dashboard
   - Redeploy after setting variables
   - Check variable names match exactly

### Debug Commands

```bash
# Check Vercel deployment status
vercel ls

# View deployment logs
vercel logs

# Check environment variables
vercel env ls

# Test database connection
node -e "console.log(process.env.POSTGRES_URL)"
```

## 📊 Database Schema

The system creates this table automatically:

```sql
CREATE TABLE blog_posts (
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

## 🔐 Security Notes

- CRON_SECRET should be a random, secure string
- Never commit .env.local to version control
- Use Vercel environment variables for production
- Regularly rotate API keys and secrets

## 📈 Monitoring

- Check Vercel Functions logs for cron job execution
- Monitor database usage in Vercel dashboard
- Set up alerts for OpenAI API usage
- Track content generation frequency

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Test API endpoints manually
4. Verify all environment variables are set correctly