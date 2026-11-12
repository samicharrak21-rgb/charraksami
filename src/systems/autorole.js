const { readGuild, writeGuild } = require('../utils/guildStorage');
const logger = require('../utils/logger');

// Structure in guild data:
// g.autoRole = { roleId: '...', enabled: true }
// g.timedRoles = [{ id: 'roleId', days: 7 }]

async function onMemberJoin(member) {
  const g = readGuild(member.guild.id);
  if (!g) return;
  // immediate auto role
  if (g.autoRole && g.autoRole.enabled && g.autoRole.roleId) {
    try {
      const me = member.guild.members.me;
      const role = member.guild.roles.cache.get(g.autoRole.roleId);
      if (role && me.permissions.has(require('discord.js').PermissionsBitField.Flags.ManageRoles) && me.roles.highest.position > role.position) {
        await member.roles.add(role.id);
      }
    } catch (e) { logger.warn({ e }, 'autorole immediate assign failed'); }
  }

  // record join timestamp for timed roles processing
  if (!g.joinTimestamps) g.joinTimestamps = {};
  g.joinTimestamps[member.id] = Date.now();
  writeGuild(member.guild.id, g);
}

async function processTimedRoles(client) {
  const fs = require('fs');
  const path = require('path');
  const { DATA_DIR } = require('../config');
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      if (file === 'package.json' || file === 'package-lock.json') continue;
      try {
        const guildId = path.basename(file, '.json');
        if (!/^\d{17,20}$/.test(guildId)) continue; // Only process guild ID files
        const g = readGuild(guildId);
        if (!g || !g.timedRoles || !g.joinTimestamps) continue;
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) continue;
        for (const [memberId, joinedAt] of Object.entries(g.joinTimestamps)) {
          const member = await guild.members.fetch(memberId).catch(() => null);
          if (!member) continue;
          const msSince = Date.now() - joinedAt;
          for (const tr of g.timedRoles) {
            const days = Number(tr.days) || 0;
            const needMs = days * 24 * 60 * 60 * 1000;
            if (msSince >= needMs) {
              // assign role if not present
              try {
                const role = guild.roles.cache.get(tr.id);
                const me = guild.members.me;
                if (!role) continue;
                if (!member.roles.cache.has(role.id)) {
                  if (me.permissions.has(require('discord.js').PermissionsBitField.Flags.ManageRoles) && me.roles.highest.position > role.position) {
                    await member.roles.add(role.id);
                  }
                }
              } catch (e) { logger.warn({ e }, 'timed role assign failed'); }
            }
          }
        }
      } catch (e) { logger.warn({ e }, 'processing guild timed roles failed'); }
    }
  } catch (err) { logger.error({ err }, 'processTimedRoles failed'); }
}

function startPeriodicScanner(client, intervalMs = 10 * 60 * 1000) {
  // run immediately then every interval
  setImmediate(() => processTimedRoles(client));
  const id = setInterval(() => processTimedRoles(client), intervalMs);
  return id;
}

function cleanOldTimestamps(guildId, olderThanDays = 365) {
  try {
    const g = readGuild(guildId);
    if (!g || !g.joinTimestamps) return 0;
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    let removed = 0;
    for (const [mid, ts] of Object.entries(g.joinTimestamps)) {
      if ((ts || 0) < cutoff) { delete g.joinTimestamps[mid]; removed++; }
    }
    writeGuild(guildId, g);
    return removed;
  } catch (e) {
    logger.warn({ e }, 'cleanOldTimestamps failed');
    return 0;
  }
}

module.exports = { 
  onMemberJoin, 
  processTimedRoles, 
  start: startPeriodicScanner, 
  cleanOldTimestamps 
};
