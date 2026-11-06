const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS, createStyledEmbed } = require('../../utils/embeds');

module.exports = {
  aliases: ['دعم', 'boost'],
  data: new SlashCommandBuilder()
    .setName('booster')
    .setDescription('💎 عرض حالة دعمك للسيرفر والمطالبة بمكافآت الـ Boost'),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const g = readGuild(guildId);
    const member = interaction.member;

    if (!member.premiumSince) {
      return interaction.reply({ 
        content: '❌ هذا الأمر مخصص لداعمي السيرفر (Nitro Boosters) فقط. شكراً لمحاولتك دعمنا!', 
        ephemeral: true 
      });
    }

    g.users = g.users || {};
    const u = g.users[interaction.user.id] || { balance: 0, xp: 0 };
    
    // Check if they already claimed today/this month
    const today = new Date().toISOString().split('T')[0].substring(0, 7); // Monthly check: YYYY-MM
    u.boost_claims = u.boost_claims || [];
    
    if (u.boost_claims.includes(today)) {
      return interaction.reply({ 
        content: '✅ لقد استلمت مكافأة الدعم لهذا الشهر بالفعل! شكراً جزيلاً لتعزيزك المستمر للسيرفر. ❤️', 
        ephemeral: true 
      });
    }

    // Give reward
    const reward = 10000;
    const xpReward = 5000;
    
    u.balance = (u.balance || 0) + reward;
    u.xp = (u.xp || 0) + xpReward;
    u.boost_claims.push(today);
    g.users[interaction.user.id] = u;
    writeGuild(guildId, g);

    const embed = createStyledEmbed(interaction, '💎 شكرًا لتعزيزك الأسطوري!', '#ff73fa')
      .setDescription(`تقديراً لدعمك المستمر للسيرفر عبر **Nitro Boost**، تم منحك المكافأة الشهرية:\n\n💰 **${reward.toLocaleString()}** جواهر\n⭐ **${xpReward.toLocaleString()}** خبرة (XP)\n\nنحن ممتنون جداً لوجودك معنا! ❤️`)
      .setThumbnail(interaction.user.displayAvatarURL())
      ;

    return interaction.reply({ embeds: [embed] });
  }
};
