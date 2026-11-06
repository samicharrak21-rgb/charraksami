const { readGuild } = require('./guildStorage');
const logger = require('./logger');

/**
 * Modern minimal nickname formatting:
 *   Normal:  "Name · ⚡5"
 *   AFK:     "💤 Name"
 *
 * Strips ANY previous decoration (legacy ornate styles like ꧁༒ Name ༒꧂,
 * 『AFK』, » Lvl 3, etc.) before applying the new tag, so re-runs never
 * compound tags.
 */

const AFK_DECORATE = (name) => `『 AFK 』 ${name}`;
const LEVEL_TAG = (lv) => `· ⚡${lv}`;

// Patterns of any decoration we ever applied (legacy + current).
const DECORATION_PATTERNS = [
  // Current modern style
  /^\s*💤\s*/u,
  /\s*·\s*⚡\s*\d+\s*$/u,
  /\s*⚡\s*\d+\s*$/u,
  // Legacy ornate AFK
  /꧁༒/gu, /༒꧂/gu,
  /\s*꧁\s*/gu, /\s*꧂\s*/gu, /༒/gu,
  /^\s*『\s*AFK\s*』\s*/giu,
  /\s*『\s*AFK\s*』\s*/giu,
  /^\s*\[AFK\]\s*/giu,
  /\s*\[AFK\]\s*/giu,
  // Legacy level tags
  /\s*〔\s*Lv\s*\d+\s*〕\s*/giu,
  /\s*\|\s*Lvl?\s*\d+\s*/giu,
  /\s*»\s*Lvl?\s*\d+\s*/giu,
  /\s*»\s*\d+\s*/g,
  /\s*⭐\s*\d+\s*/g,
];

function stripDecoration(name) {
  if (!name) return '';
  let n = String(name);
  for (const p of DECORATION_PATTERNS) n = n.replace(p, ' ');
  return n.replace(/\s+/g, ' ').trim();
}

function buildNick(baseName, level, isAfk) {
  if (isAfk) return AFK_DECORATE(baseName);
  if (level && level > 1) return `${baseName} ${LEVEL_TAG(level)}`;
  return baseName;
}

async function updateMemberNickname(member, level = null, isAfk = null) {
  if (!member || !member.guild) return;
  if (member.id === member.guild.ownerId) return;
  if (!member.manageable) return;

  const guildId = member.guild.id;
  const userId = member.id;
  const g = readGuild(guildId);

  if (level === null) {
    const userData = g.users?.[userId] || g.xpData?.[userId];
    level = userData ? (userData.level || 1) : 1;
  }
  if (isAfk === null) isAfk = !!(g.afkUsers && g.afkUsers[userId]);

  let raw =
    (g.afkUsers && g.afkUsers[userId] && g.afkUsers[userId].originalNick) ||
    member.nickname ||
    member.user.globalName ||
    member.user.username;

  let baseName = stripDecoration(raw);
  if (!baseName) baseName = member.user.username;

  let newNick = buildNick(baseName, level, isAfk);

  // Discord limit = 32 chars. Trim baseName so the decoration always fits.
  if (newNick.length > 32) {
    const overhead = newNick.length - baseName.length;
    const room = Math.max(1, 32 - overhead);
    const trimmedBase = baseName.slice(0, room).trim() || baseName.slice(0, room);
    newNick = buildNick(trimmedBase, level, isAfk);
    if (newNick.length > 32) newNick = newNick.slice(0, 32);
  }

  if (newNick === (member.nickname || '')) return;

  try {
    await member.setNickname(newNick, 'Auto-update nickname (level/AFK)');
    logger.info({ guild: guildId, user: userId, newNick }, 'nickname updated');
  } catch (err) {
    logger.warn({ guild: guildId, user: userId, err: err.message }, 'failed to update nickname');
  }
}

module.exports = { updateMemberNickname, stripDecoration };
