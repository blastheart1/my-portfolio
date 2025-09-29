#!/usr/bin/env node

/**
 * Supabase Setup Script
 * This script helps set up Supabase for the blog system
 */

const fs = require('fs');

console.log('🚀 Setting up Supabase for Blog System...\n');

console.log('📋 Manual Setup Steps:');
console.log('1. Go to https://supabase.com');
console.log('2. Sign up/Login with GitHub');
console.log('3. Create new project');
console.log('4. Go to Settings → Database');
console.log('5. Copy connection details\n');

console.log('🔗 Connection String Format:');
console.log('postgresql://postgres:[password]@[host]:5432/postgres\n');

console.log('📝 Add these to your .env.local:');
console.log('POSTGRES_URL=postgresql://postgres:[password]@[host]:5432/postgres');
console.log('POSTGRES_PRISMA_URL=postgresql://postgres:[password]@[host]:5432/postgres');
console.log('POSTGRES_URL_NON_POOLING=postgresql://postgres:[password]@[host]:5432/postgres');
console.log('POSTGRES_USER=postgres');
console.log('POSTGRES_HOST=[your-supabase-host]');
console.log('POSTGRES_PASSWORD=[your-supabase-password]');
console.log('POSTGRES_DATABASE=postgres\n');

console.log('✅ After setup:');
console.log('1. Deploy: vercel --prod');
console.log('2. Initialize: curl -X GET "https://your-domain.vercel.app/api/init-db" -H "Authorization: Bearer your_cron_secret"');
console.log('3. Test: curl -X POST "https://your-domain.vercel.app/api/blog/generate" -H "Content-Type: application/json" -d "{}"');