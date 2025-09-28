const fetch = require('node-fetch');

async function testAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/blog/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'blog',
        topic: 'Machine Learning'
      })
    });
    
    const data = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();