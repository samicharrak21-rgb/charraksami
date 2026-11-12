const { readGuild, writeGuild, saveTemplate } = require('../utils/guildStorage');
const logger = require('../utils/logger');

const scheduledTimers = new Map();

function buildEmbedFromData(data) {
  const embed = {};
  if (data.title) embed.title = data.title;
  if (data.description) embed.description = data.description;
  if (data.color) embed.color = data.color;
  if (data.image) embed.image = { url: data.image };
  if (data.thumbnail) embed.thumbnail = { url: data.thumbnail };
  if (data.footer) embed.footer = { text: data.footer };
  if (data.author) embed.author = { name: data.author };
  if (data.timestamp) embed.timestamp = new Date(data.timestamp);
  return embed;
}

async function sendAnnouncement(client, guildId, ann) {
  try {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return logger.warn({ guildId }, 'Guild for announcement not found');
    const channel = ann.channelId ? guild.channels.cache.get(ann.channelId) : null;
    if (!channel || !channel.isTextBased()) return logger.warn({ ann }, 'Announcement channel not available');

    const payload = { embeds: [buildEmbedFromData(ann.embed || {})] };
    if (ann.mention && ann.mention === 'here') payload.content = '@here';
    else if (ann.mention && ann.mention === 'everyone') payload.content = '@everyone';
    else if (ann.mention && ann.mention.startsWith('role:')) payload.content = `<@&${ann.mention.split(':')[1]}>`;

    await channel.send(payload);
    logger.info({ guildId, annId: ann.id }, 'Announcement sent');

    // remove if it was scheduled
    if (ann.scheduled) {
      const g = readGuild(guildId);
      g.announcements = (g.announcements || []).filter(a => a.id !== ann.id);
      writeGuild(guildId, g);
    }
  } catch (err) {
    logger.error({ err }, 'sendAnnouncement failed');
  }
}

function scheduleAnnouncement(client, guildId, ann) {
  try {
    const when = new Date(ann.timestamp).getTime();
    const now = Date.now();
    const delay = Math.max(0, when - now);
    if (delay <= 0) {
      // send immediately
      sendAnnouncement(client, guildId, ann);
      return;
    }

    const key = `${guildId}_${ann.id}`;
    if (scheduledTimers.has(key)) clearTimeout(scheduledTimers.get(key));
    const t = setTimeout(() => {
      sendAnnouncement(client, guildId, ann);
      scheduledTimers.delete(key);
    }, delay);
    scheduledTimers.set(key, t);
    logger.info({ guildId, annId: ann.id, when: ann.timestamp }, 'Scheduled announcement');
  } catch (err) {
    logger.error({ err }, 'scheduleAnnouncement error');
  }
}

function loadScheduled(client) {
  // iterate all data files in data dir
  const fs = require('fs');
  const path = require('path');
  const { DATA_DIR } = require('../config');
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const guildId = path.basename(file, '.json');
        const g = readGuild(guildId);
        const anns = g.announcements || [];
        for (const ann of anns) scheduleAnnouncement(client, guildId, ann);
      } catch (e) {
        logger.warn({ e, file }, 'Failed loading scheduled announcements for file');
      }
    }
  } catch (err) {
    logger.error({ err }, 'loadScheduled failed');
  }
}

function addScheduledAnnouncement(guildId, ann) {
  const g = readGuild(guildId);
  g.announcements = g.announcements || [];
  g.announcements.push(ann);
  writeGuild(guildId, g);
}

module.exports = { sendAnnouncement, scheduleAnnouncement, loadScheduled, addScheduledAnnouncement, buildEmbedFromData };
