#!/usr/bin/env node

// Test health check locally
const http = require('http');

const port = 3000;

console.log('🧪 Testing health check endpoint...');

const options = {
  hostname: 'localhost',
  port: port,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const health = JSON.parse(data);
      console.log('📊 Health Response:');
      console.log(JSON.stringify(health, null, 2));
      
      if (health.status === 'healthy') {
        console.log('✅ Health check passed!');
      } else {
        console.log('⚠️ Health check starting...');
      }
    } catch (err) {
      console.error('❌ Failed to parse response:', err);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Health check failed:', err.message);
  console.log('💡 Make sure the bot is running on port', port);
});

req.on('timeout', () => {
  console.error('❌ Health check timed out');
  req.destroy();
});

req.end();
