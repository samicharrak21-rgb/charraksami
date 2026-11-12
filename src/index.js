require('dotenv').config();
const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');
const { installGlobalHandlers } = require('./utils/errorHandler');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { setBotReady, setBotMetrics, getBotReady, getBotMetrics } = require('./health');
const express = require('express');
const app = express();
const { cloudRestoreAll } = require('./utils/guildStorage');

// Install global error handlers for better logging
installGlobalHandlers();

logger.info('🚀 Starting Sami Bot for Railway deployment...');

Promise.resolve().then(() => cloudRestoreAll()).catch(() => {});

app.get('/', (req, res) => {
  res.status(200).send('Bot is running ✅');
});

app.get('/healthcheck', (req, res) => {
  res.status(200).send('Bot is running ✅');
});

app.head('/', (req, res) => {
  res.status(200).end();
});

app.head('/health', (req, res) => {
  res.status(200).end();
});

app.head('/ready', (req, res) => {
  res.status(getBotReady() ? 200 : 503).end();
});
app.get('/health', (req, res) => {
  const metrics = getBotMetrics();
  const status = getBotReady() ? 'healthy' : 'starting';
  res.status(200).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics
  });
});

app.get('/ready', (req, res) => {
  if (getBotReady()) {
    res.status(200).send('ready');
  } else {
    res.status(503).send('starting');
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🌐 Web server running on port ${PORT}`);
});
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

if (!config.TOKEN) {
  logger.error('❌ DISCORD_TOKEN is missing! Please check your environment variables.');
  setBotReady(false);
}

// Initialize the Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User]
});

// Load Commands and Events
const { commands } = require('./handlers/commandHandler');
client.commands = commands;
loadCommands();
loadEvents(client);

/**
 * Update bot metrics for the health check server
 */
function updateMetrics() {
  try {
    const guilds = client.guilds.cache.size;
    const channels = client.channels.cache.size;
    const users = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    setBotMetrics({ guilds, channels, users, ping: client.ws.ping });
  } catch (err) {
    logger.debug('Failed to update metrics: ' + err.message);
  }
}

// Bot Ready Event
client.once('clientReady', () => {
  logger.info({ 
    tag: 'ready',
    user: client.user.tag,
    guilds: client.guilds.cache.size
  }, 'Sami Bot is now ONLINE');
  
  // Set bot as ready for health monitoring
  setBotReady(true);
  updateMetrics();
  
  // Update metrics every 30 seconds
  setInterval(updateMetrics, 30000);
  
  // Set Bot Activity
  client.user.setActivity('🌾 المزرعة | ⚔️ الدانجون', { type: ActivityType.Playing });
  
  // Initialize Background Systems
  try {
    // Scheduled Announcements
    const announcements = require('./systems/announcements');
    if (announcements && typeof announcements.start === 'function') {
      announcements.start(client);
      logger.info('✅ Loaded scheduled announcements');
    }
    
    // Autorole Periodic Scanner
    const autorole = require('./systems/autorole');
    if (autorole && typeof autorole.start === 'function') {
      autorole.start(client);
      logger.info('✅ Started autorole periodic scanner');
    }

    // Auto Adhkar System
    const empress = require('./systems/empress');
    if (empress && typeof empress.startAutoAdhkar === 'function') {
      empress.startAutoAdhkar(client, 30 * 60 * 1000); // Every 30 minutes
      logger.info('✅ Started automatic Adhkar system');
    }

    // Auto Social Media Follow System (Shh)
    const shhAuto = require('./systems/shh_auto');
    if (shhAuto && typeof shhAuto.start === 'function') {
      shhAuto.start(client);
      logger.info('✅ Started social media auto-follow system');
    }

    // Remote Dashboard Sync (Lovable Cloud)
    try {
      const remoteSync = require('./systems/remoteSync');
      remoteSync.start(client);
    } catch (e) {
      logger.warn(`remoteSync failed to start: ${e.message}`);
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Some background systems failed to start');
  }
});

// Connection Monitoring
client.on('disconnect', () => {
  logger.warn('⚠️ Bot disconnected from Discord');
  setBotReady(false);
});

client.on('reconnecting', () => {
  logger.info('🔄 Bot reconnecting to Discord...');
});

client.on('error', (error) => {
  logger.error({ err: error }, '❌ Discord Client Error');
});

client.on('warn', (warning) => {
  logger.warn(warning, '⚠️ Discord Client Warning');
});

// Process-level Error Handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason }, '🚨 Unhandled Rejection at Promise');
});

process.on('uncaughtException', (error) => {
  logger.error({ err: error }, '🚨 Uncaught Exception thrown');
  // We don't exit immediately to allow the logger to finish
  setTimeout(() => process.exit(1), 1000);
});

// Final Login Attempt
if (config.TOKEN) {
  logger.info('🔐 Attempting to login to Discord...');
  client.login(config.TOKEN).catch((error) => {
    logger.error({ err: error }, '❌ Critical: Failed to login to Discord');
    setBotReady(false);
    
    if (error.code === 'TOKEN_INVALID') {
      logger.error('❌ ERROR: The Discord Token is invalid!');
    } else if (error.code === 'DISALLOWED_INTENTS') {
      logger.error('❌ ERROR: Required intents are not enabled in the Developer Portal!');
    }
  });
} else {
  logger.warn('⚠️ Bot running without TOKEN; healthcheck will report "starting".');
}

module.exports = client;
