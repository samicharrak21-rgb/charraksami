const { readGuild, writeGuild } = require('../utils/guildStorage');
const { EmbedBuilder } = require('discord.js');
const { COLORS, createStyledEmbed } = require('../utils/embeds');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    const guildId = newMember.guild.id;
    const g = readGuild(guildId);

    // Detect new boost (was not boosting, now is)
    if (!oldMember.premiumSince && newMember.premiumSince) {
      const boosterChannelId = g.channels?.booster;
      let channel = boosterChannelId ? newMember.guild.channels.cache.get(boosterChannelId) : newMember.guild.systemChannel;
      
      if (!channel && boosterChannelId) {
        channel = await newMember.guild.channels.fetch(boosterChannelId).catch(() => null);
      }
      
      // Fallback to a text channel if system channel is null
      if (!channel) {
        channel = newMember.guild.channels.cache.find(c => c.isTextBased());
      }
      
      if (channel) {
        const u = g.users[newMember.id] || { balance: 0, xp: 0 };
        const boostReward = 10000;
        const boostXp = 5000;
        
        u.balance = (u.balance || 0) + boostReward;
        u.xp = (u.xp || 0) + boostXp;
        
        // Mark as claimed for this month to avoid double claim via command
        const today = new Date().toISOString().split('T')[0].substring(0, 7);
        u.boost_claims = u.boost_claims || [];
        if (!u.boost_claims.includes(today)) u.boost_claims.push(today);
        
        g.users[newMember.id] = u;
        writeGuild(guildId, g);

        const boostEmbed = createStyledEmbed(newMember, '💎 دعم أسطوري جديد!', '#ff73fa')
          .setDescription(`شكراً لك يا <@${newMember.id}> على تعزيز السيرفر (Nitro Boost)!\nلقد تم منحك مكافأة خاصة تقديراً لدعمك الرهيب:\n\n💰 **${boostReward.toLocaleString()}** جواهر\n⭐ **${boostXp.toLocaleString()}** خبرة (XP)\n\nيمكنك استخدام أمر \`/booster\` شهرياً للمطالبة بمكافآت إضافية!`)
          .setThumbnail(newMember.user.displayAvatarURL())
          ;

        channel.send({ content: `🎊 تعزيز جديد للسيرفر! <@${newMember.id}>`, embeds: [boostEmbed] }).catch(() => {});
      }
    }
  }
};
