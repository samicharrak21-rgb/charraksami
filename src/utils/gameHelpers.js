// Unified game helpers — consistent UI, balance handling, validation.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readGuild, writeGuild } = require('./guildStorage');
const { COLORS } = require('./embeds');
const { pickGif } = require('./gameMedia');
const config = require('../config');

const CURRENCY = config.CURRENCY || '💎';
const CURRENCY_NAME = config.CURRENCY_NAME || 'جواهر';

const DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━━';
const SOFT_DIVIDER = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function getUser(guildId, userId) {
  const g = readGuild(guildId);
  g.users = g.users || {};
  if (!g.users[userId]) {
    g.users[userId] = {
      balance: config.DEFAULT_BALANCE || 1000,
      xp: 0, level: 1, stats: {}, inventory: {}
    };
  }
  const u = g.users[userId];
  u.balance = Number(u.balance) || 0;
  u.xp = Number(u.xp) || 0;
  u.stats = u.stats || {};
  return { g, u };
}

function saveUser(guildId, g) {
  writeGuild(guildId, g);
}

function bumpStat(u, key, by = 1) {
  u.stats = u.stats || {};
  u.stats[key] = (u.stats[key] || 0) + by;
}

/**
 * Pre-game validation: bet bounds, balance, returns { ok, bet, u, g, errorEmbed }
 */
function validateBet(interaction, { min = 10, max = 1000000, defaultBet = 100 } = {}) {
  let bet = interaction.options?.getInteger?.('bet');
  if (!bet && interaction.customId) {
    const m = interaction.customId.match(/_(\d+)$/);
    if (m) bet = parseInt(m[1], 10);
  }
  if (!bet || bet < min) bet = defaultBet;
  if (bet > max) bet = max;

  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const { g, u } = getUser(guildId, userId);

  if (u.balance < bet) {
    return {
      ok: false,
      errorEmbed: errorEmbed(
        'رصيد غير كافٍ',
        `تحتاج إلى **${fmt(bet)}** ${CURRENCY} للمشاركة.\nرصيدك الحالي: **${fmt(u.balance)}** ${CURRENCY}`
      )
    };
  }
  return { ok: true, bet, g, u, guildId, userId };
}

function brandedEmbed(interaction, title, color = COLORS.primary) {
  const e = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp();
  if (interaction?.member || interaction?.user) {
    const name = interaction.member?.displayName || interaction.user?.username || 'لاعب';
    const icon = interaction.user?.displayAvatarURL?.() || undefined;
    e.setAuthor({ name, iconURL: icon });
  }
  e.setFooter({ text: `${config.SERVER_NAME || 'Sami Bot'} • نظام الألعاب` });
  return e;
}

function gameEmbed(interaction, title, description, color = COLORS.primary) {
  return brandedEmbed(interaction, title, color)
    .setDescription(`${DIVIDER}\n${description}\n${DIVIDER}`);
}

// Tracks pending GIF attachments to auto-attach via safeReply.
const _pendingGifs = new WeakMap();
function _attachGif(embed, game, state) {
  try {
    if (!game) return embed;
    const { pickGifAttachment } = require('./gameMedia');
    const r = pickGifAttachment(game, state);
    if (r) {
      embed.setImage(r.url);
      _pendingGifs.set(embed, r.file);
    }
  } catch {}
  return embed;
}

function winEmbed(interaction, title, description, game = null) {
  return _attachGif(brandedEmbed(interaction, `🏆 ${title}`, COLORS.success)
    .setDescription(`${DIVIDER}\n${description}\n${DIVIDER}`), game, 'win');
}

function loseEmbed(interaction, title, description, game = null) {
  return _attachGif(brandedEmbed(interaction, `💀 ${title}`, COLORS.error)
    .setDescription(`${DIVIDER}\n${description}\n${DIVIDER}`), game, 'lose');
}

function tieEmbed(interaction, title, description, game = null) {
  return _attachGif(brandedEmbed(interaction, `🤝 ${title}`, COLORS.warning)
    .setDescription(`${DIVIDER}\n${description}\n${DIVIDER}`), game, 'tie');
}

function gifEmbed(interaction, title, description, game, state, color = COLORS.primary) {
  return _attachGif(brandedEmbed(interaction, title, color)
    .setDescription(`${DIVIDER}\n${description}\n${DIVIDER}`), game, state);
}

function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

function balanceFooter(u) {
  return { text: `الرصيد: ${fmt(u.balance)} ${CURRENCY_NAME}  •  XP: ${fmt(u.xp)}` };
}

function playAgainRow(customId, label = '🔁 جولة أخرى', extra = []) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Primary),
    ...extra
  );
  return row;
}

function disabledRow(row) {
  const r = ActionRowBuilder.from(row);
  r.components.forEach(c => c.setDisabled(true));
  return r;
}

async function safeReply(interaction, payload) {
  // Auto-attach any GIF files referenced by the embeds via attachment://
  try {
    const embeds = payload?.embeds || [];
    const files = Array.isArray(payload?.files) ? [...payload.files] : [];
    const seen = new Set(files.map(f => f?.name).filter(Boolean));
    for (const e of embeds) {
      const f = _pendingGifs.get(e);
      if (f && !seen.has(f.name)) { files.push(f); seen.add(f.name); }
    }
    if (files.length) payload = { ...payload, files };
  } catch {}
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    }
    if (interaction.isButton?.()) {
      return await interaction.update(payload);
    }
    return await interaction.reply({ ...payload, fetchReply: true });
  } catch {
    try { return await interaction.followUp(payload); } catch {}
  }
}

function progressBar(current, total, size = 14, full = '█', empty = '░') {
  const pct = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(pct * size);
  return full.repeat(filled) + empty.repeat(size - filled) + ` ${Math.round(pct * 100)}%`;
}

module.exports = {
  CURRENCY, CURRENCY_NAME, DIVIDER, SOFT_DIVIDER,
  fmt, getUser, saveUser, bumpStat,
  validateBet, brandedEmbed, gameEmbed, gifEmbed,
  winEmbed, loseEmbed, tieEmbed, errorEmbed,
  balanceFooter, playAgainRow, disabledRow, safeReply, progressBar,
  pickGif
};
