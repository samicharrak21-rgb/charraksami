const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');
const { listAchievements, checkAchievements } = require('../../systems/achievements');

module.exports = {
  aliases: ['انجازات', 'اوسمة', 'achievements', 'badges'],
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('🏆 عرض إنجازاتك وأوسمتك')
    .addUserOption(o => o.setName('user').setDescription('عرض لشخص آخر')),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    // Refresh check first
    await checkAchievements(interaction.guild.id, target.id);
    const g = readGuild(interaction.guild.id);
    const u = g.users?.[target.id] || {};
    const owned = new Set(u.achievements || []);
    const all = listAchievements();
    const unlocked = all.filter(a => owned.has(a.id));
    const locked   = all.filter(a => !owned.has(a.id));
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    const name = member?.displayName || target.username;

    const badges = unlocked.length
      ? unlocked.map(a => a.emoji).join(' ')
      : '_لا توجد أوسمة بعد_';

    const lines = (arr, mark) => arr.map(a =>
      `${mark} ${a.emoji} **${a.name}** — ${a.desc}`
    ).join('\n') || '_لا شيء_';

    const e = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setAuthor({ name, iconURL: target.displayAvatarURL() })
      .setTitle(`🏆 إنجازات ${name}`)
      .setDescription(
        `**الأوسمة:** ${badges}\n` +
        `**التقدم:** \`${unlocked.length}/${all.length}\`\n\n` +
        `**✅ مفتوحة (${unlocked.length})**\n${lines(unlocked, '🟢').slice(0, 1000)}\n\n` +
        `**🔒 مغلقة (${locked.length})**\n${lines(locked.slice(0, 8), '⚪').slice(0, 1000)}` +
        (locked.length > 8 ? `\n_+${locked.length - 8} إنجاز آخر مخفي…_` : '')
      )
      .setFooter({ text: 'استخدم الأوامر للعب وفتح المزيد!' })
      .setTimestamp();

    await interaction.reply({ embeds: [e] });
  }
};
