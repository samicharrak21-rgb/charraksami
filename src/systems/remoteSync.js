// Remote sync with Lovable Cloud Dashboard
// Periodically pulls guild settings/follows from the dashboard API
// and reports stats back. Configure via env: DASHBOARD_URL, BOT_API_KEY
const logger = require('../utils/logger');
const { readGuild, writeGuild } = require('../utils/guildStorage');

const DASHBOARD_URL = process.env.DASHBOARD_URL; // e.g. https://your-app.lovable.app
const BOT_API_KEY = process.env.BOT_API_KEY;
const SYNC_INTERVAL = 60 * 1000; // 1 min

async function pullConfig(client) {
  if (!DASHBOARD_URL || !BOT_API_KEY) return;
  try {
    const guildIds = [...client.guilds.cache.keys()];
    const res = await fetch(`${DASHBOARD_URL}/api/bot/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-key': BOT_API_KEY },
      body: JSON.stringify({ guildIds }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return logger.warn(`[remoteSync] config HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.guilds) return;
    for (const [gid, remote] of Object.entries(data.guilds)) {
      const g = readGuild(gid) || {};
      g.channels = { ...(g.channels || {}), ...(remote.channels || {}) };
      if (remote.welcome) g.welcome = { ...(g.welcome || {}), ...remote.welcome };
      if (Array.isArray(remote.shh_follows)) g.shh_follows = remote.shh_follows;
      if (remote.settings) g.settings = { ...(g.settings || {}), ...remote.settings };
      writeGuild(gid, g);
    }
    logger.info(`[remoteSync] pulled config for ${Object.keys(data.guilds).length} guild(s)`);
  } catch (e) {
    logger.warn(`[remoteSync] pull failed: ${e.message}`);
  }
}

async function pushStats(client) {
  if (!DASHBOARD_URL || !BOT_API_KEY) return;
  try {
    const guilds = client.guilds.cache.map(g => ({
      id: g.id, name: g.name, icon: g.iconURL(), memberCount: g.memberCount,
    }));
    await fetch(`${DASHBOARD_URL}/api/bot/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-key': BOT_API_KEY },
      body: JSON.stringify({ status: 'online', uptime: process.uptime(), ping: client.ws.ping, guilds }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    logger.debug(`[remoteSync] heartbeat failed: ${e.message}`);
  }
}

module.exports = {
  start(client) {
    if (!DASHBOARD_URL || !BOT_API_KEY) {
      logger.info('[remoteSync] DASHBOARD_URL/BOT_API_KEY not set — remote dashboard disabled');
      return;
    }
    logger.info(`[remoteSync] enabled, syncing with ${DASHBOARD_URL} every 60s`);
    pullConfig(client);
    pushStats(client);
    setInterval(() => pullConfig(client), SYNC_INTERVAL);
    setInterval(() => pushStats(client), SYNC_INTERVAL);
  }
};
