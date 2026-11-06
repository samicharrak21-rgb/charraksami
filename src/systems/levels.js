const { readGuild, writeGuild } = require('../utils/guildStorage');
const { EmbedBuilder } = require('discord.js');
const { COLORS, createStyledEmbed } = require('../utils/embeds');
const logger = require('../utils/logger');
const config = require('../config');

let Canvas;
try { Canvas = require('@napi-rs/canvas'); } catch (e) { Canvas = null; }

const cooldowns = new Map();


const voiceTimers = new Map(); // Tracking voice activity

/**
 * Calculates current level based on total XP
 * Formula based on Mee6-like systems: 
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 255 XP (100 + 155)
 * Level 4: 475 XP (255 + 220)
 * Level 10: 5275 XP
 */
function calculateLevel(xp) {
  if (!xp || xp < 100) return 1;
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

/**
 * Calculates total XP required to reach a specific level
 * Formula (eased): Sum_{i=0}^{L-1} (4i^2 + 40i + 80)
 * هذا يُسهّل المستويات تدريجياً مقارنة بالصيغة السابقة
 */
function xpForLevel(level) {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 0; i < level - 1; i++) {
    total += 4 * Math.pow(i, 2) + 40 * i + 80;
  }
  return total;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Handle Voice XP: rewarding users for being in voice channels
 * Formula: 15-25 XP every minute (standard global rate)
 */
async function handleVoiceState(oldState, newState) {
  const userId = newState.member.id;
  const guildId = newState.guild.id;

  // Joined a voice channel
  if (!oldState.channelId && newState.channelId) {
    // Only if not bot and not muted/deafened
    if (newState.member.user.bot) return;
    
    const timer = setInterval(async () => {
      // Re-fetch current state to ensure still in channel and active
      const member = newState.guild.members.cache.get(userId);
      if (!member || !member.voice.channelId || member.voice.selfMute || member.voice.selfDeaf) return;

      const g = readGuild(guildId);
      if (!g.xp || g.xp.enabled === false) return;

      const gain = randInt(15, 25);
      g.users = g.users || {};
      const u = g.users[userId] = g.users[userId] || { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1, stats: {} };
      
      const oldLevel = u.level || 1;
      u.xp = (u.xp || 0) + gain;
      const newLevel = calculateLevel(u.xp);

      if (newLevel > oldLevel) {
        u.level = newLevel;
        const levelReward = require('./levelRewards').grantLevelReward(g, u, oldLevel, newLevel);
        // Notify level up if configured
        const lvlChanId = g.channels?.levels;
        const channel = (lvlChanId ? newState.guild.channels.cache.get(lvlChanId) : null) || newState.guild.channels.cache.find(c => c.isTextBased());
        if (channel) {
          const { replaceVars, getRandomGif, createStyledEmbed } = require('../utils/embeds');
          const { renderLevelUpCard } = require('../utils/imageRenderer');
          const { AttachmentBuilder } = require('discord.js');
          
          const template = g.levels?.messageTemplate || "{user} صعد للمستوى {level}!";
          const content = replaceVars(template, { user: member.toString(), level: newLevel, username: member.displayName || member.user.username });
          
          try {
            const card = await renderLevelUpCard({
              username: member.displayName || member.user.username,
              level: newLevel,
              oldLevel,
              reward: levelReward ? `+${levelReward.toLocaleString()} ${config.CURRENCY_NAME || 'جواهر'}` : null,
              avatarURL: member.user.displayAvatarURL({ extension: 'png', size: 256 })
            });

            if (card && card.buffer) {
              const { cardMessage } = require('../utils/cardEmbed');
              await channel.send(cardMessage(card, { content: member.toString(), color: 0xf9d423, title: '🎉 مستوى جديد!', description: `${content}\n🎙 من التفاعل الصوتي`, fields: levelRewardFields(levelReward, u.balance) })).catch(() => {});
            } else {
              const embed = createStyledEmbed(member, '🎉 مستوى جديد!', 0x2B2D31).setDescription(content).addFields(levelRewardFields(levelReward, u.balance)).setImage(getRandomGif('levelUp'));
              await channel.send({ content, embeds: [embed] }).catch(() => {});
            }
          } catch (err) {
            const embed = createStyledEmbed(member, '🎉 مستوى جديد!', 0x2B2D31).setDescription(content).addFields(levelRewardFields(levelReward, u.balance)).setImage(getRandomGif('levelUp'));
            await channel.send({ content, embeds: [embed] }).catch(() => {});
          }
        }
        // Assign roles
        await handleLevelRoleAssign(member, g, newLevel);
        // Update nickname
        try {
          const { updateMemberNickname } = require('../utils/nicknameManager');
          await updateMemberNickname(member, newLevel);
        } catch (e) { logger.error({ err: e.message, guild: guildId, user: member.id }, 'Failed to update nickname in voice state'); }
      }
      writeGuild(guildId, g);
    }, 60000); // Every minute

    voiceTimers.set(`${guildId}_${userId}`, timer);
  } 
  // Left or changed voice channel
  else if (oldState.channelId && !newState.channelId) {
    const key = `${guildId}_${userId}`;
    if (voiceTimers.has(key)) {
      clearInterval(voiceTimers.get(key));
      voiceTimers.delete(key);
    }
  }
}

async function handleMessageXP(message) {
  if (!message.guild || message.author.bot) return;

  const guildId = message.guild.id;
  const userId = message.author.id;
  const key = `${guildId}-${userId}`;
  const now = Date.now();

  const g = readGuild(guildId);
  
  // XP System Global Toggle
  if (!g.xp) {
    g.xp = { enabled: true, min: 15, max: 25, cooldown: 60000 };
    writeGuild(guildId, g);
  }
  if (g.xp.enabled === false) return;

  // Channel gating
  const allowed = g.channels?.xpAllowed || [];
  const blocked = g.channels?.xpBlocked || [];
  if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(message.channel.id)) return;
  if (Array.isArray(blocked) && blocked.includes(message.channel.id)) return;

  const cd = g.xp.cooldown || 60000;
  const last = cooldowns.get(key) || 0;
  if (now - last < cd) return;

  cooldowns.set(key, now);

  g.users = g.users || {};
  
  // Migration logic to restore old levels from xpData
  if (g.xpData && g.xpData[userId]) {
    const oldData = g.xpData[userId];
    const u = g.users[userId] || {};
    
    if (!g.users[userId] || (oldData.level > (u.level || 0))) {
      const oldLvl = oldData.level || 1;
      const remXp = oldData.xp || 0;
      const totalXp = xpForLevel(oldLvl) + remXp;
      
      g.users[userId] = {
        ...u,
        balance: u.balance || config.DEFAULT_BALANCE || 1000,
        xp: totalXp,
        level: oldLvl,
        stats: { ...(u.stats || {}), messages_count: (u.stats?.messages_count || 0) + (oldData.messages_count || 0) },
        inventory: u.inventory || { weapons: [], armor: [], potions: [], skills: [] },
        equipment: u.equipment || {}
      };
      
      delete g.xpData[userId];
      writeGuild(guildId, g);
      logger.info({ userId, guildId, level: oldLvl }, 'Migrated level from xpData');
    } else {
      delete g.xpData[userId];
      writeGuild(guildId, g);
    }
  }

  const u = g.users[userId] || { xp: 0, level: 1, balance: 1000 };
  
  const xpGain = randInt(g.xp.min || 15, g.xp.max || 25);
  u.xp = (u.xp || 0) + xpGain;
  u.stats = u.stats || {};
  u.stats.messages_count = (u.stats.messages_count || 0) + 1;

  const oldLevel = u.level || 1;
  const newLevel = calculateLevel(u.xp);
  
  if (newLevel > oldLevel) {
    u.level = newLevel;
    const levelReward = require('./levelRewards').grantLevelReward(g, u, oldLevel, newLevel);
    
    // Notify level up using the previous complex logic
    try {
      const { replaceVars, getRandomGif, createStyledEmbed } = require('../utils/embeds');
      const lvlChanId = g.channels?.levels;
      const targetChannel = (lvlChanId ? message.guild.channels.cache.get(lvlChanId) : null) || message.channel;
      
      if (targetChannel && targetChannel.isTextBased()) {
        const template = g.levels?.messageTemplate || "{user} صعد للمستوى {level}!";
        const messageContent = replaceVars(template, {
          user: message.author.toString(),
          mention: message.author.toString(),
          username: message.member?.displayName || message.author.username,
          level: newLevel
        });

        let sent = false;
        try {
          const { renderLevelUpCard } = require('../utils/imageRenderer');
          const { cardMessage } = require('../utils/cardEmbed');
          const card = await renderLevelUpCard({
            username: message.member?.displayName || message.author.username,
            level: newLevel,
            oldLevel,
            reward: levelReward ? `+${levelReward.toLocaleString()} ${config.CURRENCY_NAME || 'جواهر'}` : null,
            avatarURL: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
          });
          if (card && card.buffer) {
            await targetChannel.send(cardMessage(card, { content: message.author.toString(), color: 0xf9d423, title: '🎉 مستوى جديد!', description: messageContent, fields: levelRewardFields(levelReward, u.balance), footer: 'استمر في التفاعل لفتح رتب جديدة' }));
            sent = true;
          }
        } catch (err) { logger.warn({ err: err.message }, 'level card render failed'); }
        if (!sent) {
          const embed = createStyledEmbed(message, '🎉 مستوى جديد!', 0x5865F2)
            .setDescription(messageContent)
            .addFields(levelRewardFields(levelReward, u.balance))
            .setImage(getRandomGif('levelUp'));
          await targetChannel.send({ embeds: [embed] });
        }
        
        logger.info({ guild: guildId, user: userId, level: newLevel }, 'Level up message sent with GIF');
      }
    } catch (e) { 
      logger.error({ err: e.message, guild: guildId, user: userId }, 'Level up message failed'); 
    }
    
    // Update nickname only on level up or if it's missing
    try {
      const { updateMemberNickname } = require('../utils/nicknameManager'); // Add this import
      await updateMemberNickname(message.member, u.level);
    } catch (e) {
      logger.error({ err: e.message, guild: guildId, user: userId }, 'Failed to update nickname on level up');
    }
    
    // Assign roles
    await handleLevelRoleAssign(message.member, g, newLevel);
  }

  g.users[userId] = u;
  writeGuild(guildId, g);

  // Check achievements (every ~ once per minute due to XP cooldown)
  try {
    const { checkAchievements } = require('./achievements');
    await checkAchievements(guildId, userId, message.channel);
  } catch (e) {}
}

function levelRewardFields(amount, balance) {
  if (!amount) return [];
  const cur = config.CURRENCY || '💎';
  return [
    { name: '🎁 المكافأة', value: `**+${amount.toLocaleString()}** ${cur}`, inline: true },
    { name: '💰 رصيدك الآن', value: `**${(Number(balance) || 0).toLocaleString()}** ${cur}`, inline: true },
  ];
}

async function handleLevelRoleAssign(member, guildData, level) {
  if (!member || !member.guild) return;
  guildData.levelRoles = guildData.levelRoles || {};
  const mapped = guildData.levelRoles[String(level)];
  if (!mapped || !Array.isArray(mapped) || mapped.length === 0) return;

  // remove previous level roles if configured
  const removePrev = guildData.settings?.removePreviousLevelRole ?? false;
  if (removePrev) {
    const allLevelRoles = Object.values(guildData.levelRoles).flat();
    for (const r of allLevelRoles) {
      try { if (member.roles.cache.has(r) && !mapped.includes(r)) await member.roles.remove(r); } catch (e) { logger.warn({ e }, 'failed removing old level role'); }
    }
  }

  for (const roleId of mapped) {
    try {
      if (!member.roles.cache.has(roleId)) {
        const me = member.guild.members.me;
        const role = member.guild.roles.cache.get(roleId);
        if (!role) continue;
        if (!me.permissions.has(require('discord.js').PermissionsBitField.Flags.ManageRoles)) {
          logger.warn({ guild: member.guild.id }, 'bot lacks ManageRoles to assign level roles');
          continue;
        }
        if (me.roles.highest.position <= role.position) {
          logger.warn({ guild: member.guild.id, role: roleId }, 'bot role too low to assign this level role');
          continue;
        }
        await member.roles.add(roleId);
      }
    } catch (e) { logger.warn({ e }, 'failed adding level role'); }
  }
}

async function makeRankCard(guild, userId) {
  const g = readGuild(guild.id);
  const u = g.users?.[userId] || { xp: 0, level: 1, prestige: 0 };
  const xp = u.xp || 0;
  const level = u.level || 1;
  const prestige = u.prestige || 0;

  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const neededXp = nextLevelXp - currentLevelXp;
  const progress = Math.min(1, Math.max(0, (xp - currentLevelXp) / neededXp));

  const member = await guild.members.fetch(userId).catch(() => null);
  const username = member ? (member.displayName || member.user.username) : 'Unknown';

  if (!Canvas) {
    return { 
      title: `📊 بطاقة المستوى: ${username}`, 
      description: `⭐ **المستوى:** \`${level}\`\n✨ **البريستيج:** \`${prestige}\`\n📈 **الخبرة:** \`${xp.toLocaleString()} / ${nextLevelXp.toLocaleString()}\` XP` 
    };
  }

  try {
    const CanvasLib = Canvas;
    const width = 934, height = 282;
    const canvas = CanvasLib.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Modern background with rounded corners
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 20);
    ctx.clip();

    // Dark background
    ctx.fillStyle = '#1a1c20';
    ctx.fillRect(0, 0, width, height);

    // Subtle pattern or gradient
    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, 'rgba(88, 101, 242, 0.15)'); // Discord Blue subtle
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    // Avatar
    if (member) {
      const avatar = await CanvasLib.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
      ctx.save();
      ctx.beginPath();
      ctx.arc(140, 141, 90, 0, Math.PI * 2);
      ctx.strokeStyle = '#5865f2';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 50, 51, 180, 180);
      ctx.restore();
    }

    // Username
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Sans';
    ctx.fillText(username.substring(0, 15), 280, 100);

    // Level & Prestige
    ctx.fillStyle = '#b9bbbe';
    ctx.font = '30px Sans';
    ctx.fillText(`LEVEL ${level}`, 280, 150);
    
    ctx.fillStyle = '#9b59b6';
    ctx.font = 'bold 30px Sans';
    const prestigeText = `PRESTIGE ${prestige}`;
    const prestigeWidth = ctx.measureText(prestigeText).width;
    ctx.fillText(prestigeText, width - prestigeWidth - 50, 150);

    // Progress bar background
    const barX = 280, barY = 185, barW = 600, barH = 40;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 20);
    ctx.fillStyle = '#2f3136';
    ctx.fill();

    // Progress bar fill
    if (progress > 0) {
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(40, barW * progress), barH, 20);
      const progressGrd = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      progressGrd.addColorStop(0, '#5865f2');
      progressGrd.addColorStop(1, '#8589f2');
      ctx.fillStyle = progressGrd;
      ctx.fill();
    }

    // XP Text inside bar
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Sans';
    const xpText = `${xp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP`;
    const textWidth = ctx.measureText(xpText).width;
    ctx.fillText(xpText, barX + (barW / 2) - (textWidth / 2), barY + 28);

    return await canvas.encode('png');
  } catch (err) {
    logger.warn({ err }, 'rank card creation failed');
    return { title: `Level ${level}`, description: `XP: ${xp}` };
  }
}

async function getLeaderboard(guild, limit = 10) {
  const g = readGuild(guild.id);
  const map = g.users || {};
  const arr = Object.entries(map).map(([id, d]) => ({
    id,
    xp: d.xp || 0,
    level: d.level || 0,
    balance: d.balance || 0,
    dungeon_wins: d.dungeon_wins || 0,
    username: d.username || null,
  }));
  arr.sort((a, b) => b.xp - a.xp);
  return arr.slice(0, limit);
}

function canPrestige(guildData, userData) {
  const cfg = guildData.prestige || {};
  // إزالة شرط المستوى تماماً؛ يمكن ضبط حد XP اختياري عبر إعدادات السيرفر
  const xpThreshold = typeof cfg.thresholdXP === 'number' ? cfg.thresholdXP : 0;
  if (xpThreshold > 0) return (userData.xp || 0) >= xpThreshold;
  // بدون حد XP، يسمح بالبرستيج طالما لدى المستخدم أي نقاط خبرة
  return (userData.xp || 0) > 0;
}

function doPrestige(guildId, userId) {
  const g = readGuild(guildId);
  g.users = g.users || {};
  const user = g.users[userId] || { xp: 0, level: 1, prestige: 0 };
  
  if (!canPrestige(g, user)) return { ok: false, reason: 'not_eligible' };
  
  user.prestige = (user.prestige || 0) + 1;
  user.xp = 0;
  user.level = 1;
  
  g.users[userId] = user;
  writeGuild(guildId, g);
  return { ok: true, prestige: user.prestige };
}

function replaceVars(template, member, guild, level, xp, nextXp, oldLevel) {
  const mention = member ? `<@${member.id}>` : '{mention}';
  const username = member ? member.displayName : 'User';
  const prev = typeof oldLevel === 'number' ? String(oldLevel) : String((level || 0) - 1);
  return String(template)
    .replace(/\{mention\}/gi, mention)
    .replace(/\{user\}/gi, username)
    .replace(/\{username\}/gi, username)
    .replace(/\{level\}/gi, String(level))
    .replace(/\{oldLevel\}/gi, prev)
    .replace(/\{fromLevel\}/gi, prev)
    .replace(/\{prevLevel\}/gi, prev)
    .replace(/\{xp\}/gi, String(xp))
    .replace(/\{next\}/gi, String(nextXp))
    .replace(/\{server\}/gi, guild?.name || 'Server');
}

module.exports = { handleMessageXP, handleVoiceState, makeRankCard, getLeaderboard, doPrestige, canPrestige, calculateLevel, xpForLevel };
