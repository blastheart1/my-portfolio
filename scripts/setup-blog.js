#!/usr/bin/env node

/**
 * Setup script for the Blog/Case Study system
 * This script helps initialize the database and test the system
 */

const https = require('https');

const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-here';

async function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method,
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function setupBlogSystem() {
  console.log('🚀 Setting up Blog/Case Study system...\n');

  try {
    // Step 1: Initialize database
    console.log('📊 Initializing database...');
    const dbResult = await makeRequest('/api/init-db');
    if (dbResult.status === 200) {
      console.log('✅ Database initialized successfully');
    } else {
      console.log('❌ Database initialization failed:', dbResult.data);
      return;
    }

    // Step 2: Generate initial content
    console.log('\n📝 Generating initial content...');
    const contentResult = await makeRequest('/api/blog/generate', 'POST');
    if (contentResult.status === 200) {
      console.log('✅ Initial content generated successfully');
      console.log(`   Title: ${contentResult.data.post.title}`);
      console.log(`   Type: ${contentResult.data.post.type}`);
      console.log(`   Topic: ${contentResult.data.post.topic}`);
    } else {
      console.log('❌ Content generation failed:', contentResult.data);
    }

    console.log('\n🎉 Blog system setup complete!');
    console.log('\nNext steps:');
    console.log('1. Set up Vercel Postgres database');
    console.log('2. Configure environment variables');
    console.log('3. Deploy to Vercel');
    console.log('4. Set up cron job for automatic content generation');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

// Run the setup
setupBlogSystem();