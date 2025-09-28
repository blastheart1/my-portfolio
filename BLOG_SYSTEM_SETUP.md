# Blog/Case Study System Setup

This document explains how to set up and configure the AI-powered blog and case study generation system.

## Features

- 🤖 **AI-Powered Content Generation**: Uses OpenAI GPT-3.5-turbo for cost-efficient content creation
- 📊 **Case Studies & Blog Posts**: Automatically generates both types of content
- 🗄️ **Persistent Storage**: Content is stored in Vercel Postgres database
- ⏰ **Automated Generation**: Runs every 2 days via Vercel cron jobs
- 🎨 **Beautiful UI**: Integrates seamlessly with your existing design
- 🔄 **Smart Content**: Avoids repetition by analyzing previous content

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file with the following variables:

```bash
# OpenAI API Key (required)
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

# Vercel Postgres Database (required)
POSTGRES_URL=your_vercel_postgres_url_here
POSTGRES_PRISMA_URL=your_vercel_postgres_url_here
POSTGRES_URL_NON_POOLING=your_vercel_postgres_url_here
POSTGRES_USER=your_postgres_user_here
POSTGRES_HOST=your_postgres_host_here
POSTGRES_PASSWORD=your_postgres_password_here
POSTGRES_DATABASE=your_postgres_database_here

# Cron job authentication (required)
CRON_SECRET=your_random_secret_here
```

### 2. Database Setup

1. **Create Vercel Postgres Database**:
   - Go to your Vercel dashboard
   - Navigate to Storage → Create Database → Postgres
   - Copy the connection details to your environment variables

2. **Initialize Database Schema**:
   ```bash
   # Run the setup script
   node scripts/setup-blog.js
   
   # Or manually call the init endpoint
   curl -X GET "https://your-domain.vercel.app/api/init-db" \
        -H "Authorization: Bearer your_cron_secret"
   ```

### 3. Vercel Deployment

1. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

2. **Configure Environment Variables**:
   - Add all environment variables in Vercel dashboard
   - Ensure `CRON_SECRET` is set for security

3. **Set up Cron Job**:
   - The `vercel.json` file is already configured
   - Cron job runs every 2 days at midnight UTC
   - Path: `/api/cron/generate-content`

### 4. Manual Content Generation

You can manually generate content by calling:

```bash
# Generate new content
curl -X POST "https://your-domain.vercel.app/api/blog/generate" \
     -H "Content-Type: application/json" \
     -d '{}'

# Or with specific parameters
curl -X POST "https://your-domain.vercel.app/api/blog/generate" \
     -H "Content-Type: application/json" \
     -d '{"topic": "Machine Learning", "type": "case-study"}'
```

## API Endpoints

### Content Generation
- `POST /api/blog/generate` - Generate new content
- `GET /api/blog` - Get all blog posts
- `GET /api/blog?id=post-id` - Get specific post

### Cron Jobs
- `GET /api/cron/generate-content` - Automated content generation
- `GET /api/init-db` - Initialize database schema

## Content Topics

The system generates content on these topics:
- Generative AI
- Software Quality Assurance
- Machine Learning
- DevOps
- Cloud Computing
- Cybersecurity
- Data Science
- Web Development

## Cost Optimization

- Uses GPT-3.5-turbo for cost efficiency
- Limits token usage (1200-1500 tokens per generation)
- Generates content every 2 days to minimize API calls
- Smart prompts to avoid repetition

## Customization

### Adding New Topics

Edit `/src/lib/openai-service.ts`:

```typescript
const TOPICS = [
  'Generative AI',
  'Software Quality Assurance',
  'Your New Topic', // Add here
  // ... existing topics
];
```

### Modifying Generation Frequency

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-content",
      "schedule": "0 0 */1 * *"  // Change to daily: */1
    }
  ]
}
```

### Customizing Content Types

Modify the generation logic in `/src/lib/openai-service.ts`:

```typescript
export function shouldGenerateCaseStudy(): boolean {
  // Change probability (0.4 = 40% case study, 60% blog)
  return Math.random() < 0.4;
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Verify POSTGRES_URL is correct
   - Check Vercel environment variables

2. **OpenAI API Error**:
   - Verify NEXT_PUBLIC_OPENAI_API_KEY is set
   - Check API key has sufficient credits

3. **Cron Job Not Running**:
   - Verify CRON_SECRET is set
   - Check Vercel cron job configuration

### Debugging

1. **Check Logs**:
   ```bash
   vercel logs
   ```

2. **Test Endpoints**:
   ```bash
   # Test database initialization
   curl -X GET "https://your-domain.vercel.app/api/init-db" \
        -H "Authorization: Bearer your_cron_secret"
   
   # Test content generation
   curl -X POST "https://your-domain.vercel.app/api/blog/generate" \
        -H "Content-Type: application/json" \
        -d '{}'
   ```

## Security Considerations

- All cron endpoints require authentication via `CRON_SECRET`
- Database credentials are stored securely in Vercel
- OpenAI API key is environment-specific
- Content is validated before storage

## Performance

- Lazy loading for blog section component
- Efficient database queries with pagination
- Optimized OpenAI prompts for token usage
- Cached content retrieval

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Vercel logs
3. Verify environment variables
4. Test API endpoints manually