const { EmbedBuilder, ActivityType } = require('discord.js');
const { readGuild, writeGuild } = require('../utils/guildStorage');
const logger = require('../utils/logger');
const { COLORS, createStyledEmbed } = require('../utils/embeds');

module.exports = {
  start(client) {
    // 0. Load Scheduled Announcements from database
    try {
      const { loadScheduled } = require('./announce');
      loadScheduled(client);
      logger.info('✅ Loaded scheduled announcements from database');
    } catch (e) {
      logger.warn('Failed to load scheduled announcements:', e.message);
    }

    // 1. Bump Reminder (Every 2 hours)
    setInterval(async () => {
      client.guilds.cache.forEach(async guild => {
        try {
          const g = readGuild(guild.id);
          const bumpChannelId = g.channels?.bump;
          if (!bumpChannelId) return;

          const channel = guild.channels.cache.get(bumpChannelId);
          if (!channel) return;

          const lastBump = g.last_bump_time || 0;
          const now = Date.now();
          const cooldown = 2 * 60 * 60 * 1000; // 2 hours

          if (now - lastBump >= cooldown) {
            const owner = await guild.fetchOwner().catch(() => null);
            let mentionText = '';
            
            if (owner) {
              mentionText = `<@${owner.id}>`;
            } else {
              // Fallback to random admin if owner fetch fails
              await guild.members.fetch().catch(() => null);
              const admins = guild.members.cache.filter(m => !m.user.bot && m.permissions.has('Administrator'));
              if (admins.size > 0) mentionText = `<@${admins.random().id}>`;
            }

            if (!mentionText) return;
            
            const reminderEmbed = createStyledEmbed(guild, '⏰ وقت الـ Bump!', COLORS.warning)
              .setDescription(`حان وقت دعم السيرفر! يرجى استخدام أمر \`!bump\` أو \`/bump\` الآن.\n\nتذكير للإدارة: ${mentionText}`)
              .setImage('https://cdn.discordapp.com/attachments/1470839860594999593/1472741198572683470/standard.gif?ex=69a4275f&is=69a2d5df&hm=db8ea9faf6cb1686358fc51bd3746d188e98698d3e63a2c28991db24ec13d984&');

            channel.send({ content: `🔔 نداء للإدارة: ${mentionText}`, embeds: [reminderEmbed] });
            
            // Update last bump time to prevent spamming if check runs again before a real bump
            g.last_bump_time = now; 
            writeGuild(guild.id, g);
          }
        } catch (err) {
          logger.error(`Error in bump reminder for guild ${guild.id}: ${err.message}`);
        }
      });
    }, 15 * 60 * 1000); // Check every 15 minutes
  }
};
