const { readGuild, writeGuild } = require('../utils/guildStorage');
const { EmbedBuilder } = require('discord.js');
const { COLORS, getRandomGif, createStyledEmbed } = require('../utils/embeds');
const config = require('../config');

async function handleAFKReturn(message) {
  if (!message.guild || message.author?.bot) return;
  const guildData = readGuild(message.guild.id);
  const afkUsers = guildData.afkUsers || {};
  
  if (afkUsers[message.author.id]) {
    const afkData = afkUsers[message.author.id];
    delete afkUsers[message.author.id];
    guildData.afkUsers = afkUsers;
    writeGuild(message.guild.id, guildData);

    try {
      const { updateMemberNickname } = require('../utils/nicknameManager');
      // Pass null for level to let it be fetched from data, and false for isAfk
      await updateMemberNickname(message.member, null, false);
    } catch (e) {}

    const durationMs = Date.now() - afkData.timestamp;
    const minutesAway = Math.floor(durationMs / 60000);
    const gift = config.AFK_GIFT || 100;
    
    // Only give gift if AFK for at least 1 hour (to prevent abuse)
    const isEligibleForGift = durationMs >= 3600000;
    
    if (isEligibleForGift) {
      guildData.users = guildData.users || {};
      guildData.users[message.author.id] = guildData.users[message.author.id] || { balance: 0, xp: 0, level: 1 };
      guildData.users[message.author.id].balance += gift;
      // لا تضيف XP عند العودة من AFK
    }
    
    writeGuild(message.guild.id, guildData);

    const welcomeEmbed = createStyledEmbed(message, '✨ أهلاً بعودتك!', COLORS.success)
      .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
      .setDescription(`**${message.member?.displayName}** رجع!\n${isEligibleForGift ? `🎁 **الهدية:** 💎 **${gift}**\n` : ''}⏱️ مدة الغياب: **${minutesAway}** دقيقة.`)
      .setImage(getRandomGif('afkReturn'));

    const m = await message.reply({ embeds: [welcomeEmbed] }).catch(() => null);
    if (m) {
      setTimeout(() => {
        m.delete().catch(() => {}); // حذف رد البوت
        message.delete().catch(() => {}); // حذف رسالة المستخدم الأصلية
      }, 15 * 1000);
    }
    return true;
  }
  return false;
}

async function checkMentions(message) {
  if (!message.guild || message.author?.bot || message.mentions.users.size === 0) return;
  const guildData = readGuild(message.guild.id);
  const afkUsers = guildData.afkUsers || {};

  for (const [id, user] of message.mentions.users) {
    if (afkUsers[id]) {
      const data = afkUsers[id];
      const duration = Math.floor((Date.now() - data.timestamp) / 60000);
      const member = message.guild.members.cache.get(id);
      const displayName = member?.displayName || user.username;
      const m = await message.reply({
        content: `**${displayName}** حالياً AFK (${data.reason}) - من **${duration}** دقيقة`,
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
      
      if (m) {
        setTimeout(() => {
          m.delete().catch(() => {}); // حذف رد البوت فقط
        }, 15 * 1000);
      }
      break;
    }
  }
}

module.exports = {
  handleAFKReturn,
  checkMentions
};
