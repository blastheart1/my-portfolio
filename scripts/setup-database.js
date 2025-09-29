#!/usr/bin/env node

/**
 * Database and Cron Setup Script
 * This script helps set up PostgreSQL and cron jobs for the blog system
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Blog System Database and Cron Jobs...\n');

// Check if we're in a Vercel project
function checkVercelProject() {
  try {
    const vercelConfig = fs.readFileSync('.vercel/project.json', 'utf8');
    return JSON.parse(vercelConfig);
  } catch (error) {
    return null;
  }
}

// Create environment file template
function createEnvTemplate() {
  const envTemplate = `# OpenAI API Key (required for content generation)
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here

# Vercel Postgres Database (will be filled after database creation)
POSTGRES_URL=your_vercel_postgres_url_here
POSTGRES_PRISMA_URL=your_vercel_postgres_url_here
POSTGRES_URL_NON_POOLING=your_vercel_postgres_url_here
POSTGRES_USER=your_postgres_user_here
POSTGRES_HOST=your_postgres_host_here
POSTGRES_PASSWORD=your_postgres_password_here
POSTGRES_DATABASE=your_postgres_database_here

# Cron job secret for authentication
CRON_SECRET=${generateRandomSecret()}
`;

  if (!fs.existsSync('.env.local')) {
    fs.writeFileSync('.env.local', envTemplate);
    console.log('✅ Created .env.local template');
  } else {
    console.log('⚠️  .env.local already exists, skipping...');
  }
}

function generateRandomSecret() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Setup Vercel Postgres
async function setupVercelPostgres() {
  console.log('📊 Setting up Vercel Postgres...');
  
  try {
    // Check if already linked to Vercel
    const project = checkVercelProject();
    if (!project) {
      console.log('🔗 Linking to Vercel...');
      execSync('vercel link', { stdio: 'inherit' });
    }

    console.log('🗄️  Creating Postgres database...');
    console.log('   This will open Vercel dashboard in your browser...');
    
    // Create database using Vercel CLI
    execSync('vercel storage create postgres', { stdio: 'inherit' });
    
    console.log('✅ Postgres database created!');
    console.log('📝 Please copy the database credentials to your .env.local file');
    
  } catch (error) {
    console.error('❌ Error setting up Vercel Postgres:', error.message);
    console.log('\n🔧 Manual setup instructions:');
    console.log('1. Go to https://vercel.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to Storage tab');
    console.log('4. Create a new Postgres database');
    console.log('5. Copy the connection details to .env.local');
  }
}

// Setup cron job
function setupCronJob() {
  console.log('⏰ Setting up cron job...');
  
  const vercelJson = {
    "crons": [
      {
        "path": "/api/cron/generate-content",
        "schedule": "0 0 */2 * *"
      }
    ]
  };

  fs.writeFileSync('vercel.json', JSON.stringify(vercelJson, null, 2));
  console.log('✅ Created vercel.json with cron configuration');
  console.log('   Cron job will run every 2 days at midnight UTC');
}

// Test database connection
async function testDatabaseConnection() {
  console.log('🧪 Testing database connection...');
  
  try {
    const response = await fetch('http://localhost:3000/api/init-db', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test'}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Database connection successful!');
    } else {
      console.log('⚠️  Database connection failed - make sure to set up environment variables');
    }
  } catch (error) {
    console.log('⚠️  Could not test database connection (server not running)');
  }
}

// Main setup function
async function main() {
  try {
    // Step 1: Create environment template
    createEnvTemplate();
    
    // Step 2: Setup Vercel Postgres
    await setupVercelPostgres();
    
    // Step 3: Setup cron job
    setupCronJob();
    
    // Step 4: Test connection
    await testDatabaseConnection();
    
    console.log('\n🎉 Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Add your OpenAI API key to .env.local');
    console.log('2. Add your Postgres credentials to .env.local');
    console.log('3. Deploy to Vercel: vercel --prod');
    console.log('4. Set environment variables in Vercel dashboard');
    console.log('5. Test the system: npm run dev');
    
    console.log('\n🔧 Manual database setup:');
    console.log('If automatic setup failed, you can manually:');
    console.log('1. Go to https://vercel.com/dashboard');
    console.log('2. Select your project → Storage → Create Database → Postgres');
    console.log('3. Copy connection details to .env.local');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
main();