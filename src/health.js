const http = require('http');

let healthServer;
let botReady = false;
let botMetrics = {
  guilds: 0,
  users: 0,
  channels: 0,
  ping: 0
};

function startHealthCheck() {
  const port = process.env.PORT || 3000;
  
  healthServer = http.createServer((req, res) => {
    const url = req.url || '/';
    const method = req.method || 'GET';

    if ((method === 'GET' || method === 'HEAD') && (url === '/' || url === '/healthcheck')) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bot is alive ✅');
      return;
    }

    if ((method === 'GET' || method === 'HEAD') && (url === '/health' || url === '/status')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const healthData = {
        status: botReady ? 'healthy' : 'starting',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        bot: 'Sami Bot - Discord RPG Bot',
        port: port,
        metrics: botMetrics
      };
      res.end(JSON.stringify(healthData, null, 2));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });
  
  healthServer.listen(port, '0.0.0.0', () => {
    console.log(`🔍 Health check server running on port ${port}`);
    console.log(`🌐 Health check URL: http://localhost:${port}/`);
    console.log(`🌐 Detailed health: http://localhost:${port}/health`);
  });
  
  healthServer.on('error', (err) => {
    console.error('❌ Health server error:', err);
  });
}

function stopHealthCheck() {
  if (healthServer) {
    healthServer.close(() => {
      console.log('🛑 Health check server stopped');
    });
  }
}

function setBotReady(ready = true) {
  botReady = ready;
  console.log(`🤖 Bot status: ${ready ? 'READY' : 'NOT READY'}`);
}

function setBotMetrics(metrics = {}) {
  botMetrics = { ...botMetrics, ...metrics };
}

function getBotReady() {
  return botReady;
}

function getBotMetrics() {
  return botMetrics;
}

process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received, shutting down gracefully');
  stopHealthCheck();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📡 SIGINT received, shutting down gracefully');
  stopHealthCheck();
  process.exit(0);
});

module.exports = { startHealthCheck, stopHealthCheck, setBotReady, setBotMetrics, getBotReady, getBotMetrics };
