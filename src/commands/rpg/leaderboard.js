const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../../systems/levels');
const { COLORS, createStyledEmbed } = require('../../utils/embeds');
const { renderLeaderboardCard, hasCanvas } = require('../../utils/imageRenderer');

module.exports = {
  aliases: ['توب', 'متصدرين', 'lb', 'top', 'leaderboard'],
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('🏆 عرض قائمة متصدري السيرفر')
    .addStringOption(o => o.setName('type').setDescription('نوع القائمة').addChoices(
      { name: 'XP/Level', value: 'xp' },
      { name: 'Balance/Gold', value: 'balance' },
      { name: 'Dungeon Wins', value: 'dungeon' },
    ))
    .addIntegerOption(o => o.setName('limit').setDescription('عدد اللاعبين (الافتراضي 10)').setMinValue(1).setMaxValue(15)),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => {});
    const type = interaction.options.getString('type') || 'xp';
    const limit = interaction.options.getInteger('limit') || 10;

    const lb = await getLeaderboard(interaction.guild, 50);
    if (!lb || lb.length === 0) {
      return interaction.editReply({ content: '❌ لا توجد بيانات كافية لعرض القائمة حالياً.' });
    }

    let sorted;
    let title = '🏆 قائمة متصدري الخبرة';
    if (type === 'balance') {
      sorted = [...lb].sort((a, b) => (b.balance || 0) - (a.balance || 0));
      title = '💰 قائمة الأثرياء';
    } else if (type === 'dungeon') {
      sorted = [...lb].sort((a, b) => (b.dungeon_wins || 0) - (a.dungeon_wins || 0));
      title = '⚔ أبطال الدانجون';
    } else {
      sorted = [...lb].sort((a, b) => (b.xp || 0) - (a.xp || 0));
    }
    sorted = sorted.slice(0, limit);

    // Resolve members for avatars
    const entries = [];
    for (const item of sorted) {
      let member = null;
      try { member = await interaction.guild.members.fetch(item.id); } catch (e) {}
      const name = member?.displayName || item.username || `User ${item.id.slice(-4)}`;
      const avatarURL = member?.user?.displayAvatarURL({ extension: 'png', size: 128 }) || null;

      let value, subtitle;
      if (type === 'balance') {
        value = `💎 ${(item.balance || 0).toLocaleString()}`;
        subtitle = `Level ${item.level || 1}`;
      } else if (type === 'dungeon') {
        value = `⚔ ${(item.dungeon_wins || 0)}`;
        subtitle = `Level ${item.level || 1}`;
      } else {
        value = `${(item.xp || 0).toLocaleString()} XP`;
        subtitle = `Level ${item.level || 1}`;
      }
      entries.push({ name, subtitle, value, avatarURL });
    }

    if (hasCanvas()) {
      try {
        const card = await renderLeaderboardCard({
          title,
          entries,
          guildName: interaction.guild.name,
        });
        if (card && card.buffer) {
          return interaction.editReply({ files: [new AttachmentBuilder(card.buffer, { name: 'leaderboard.png' })] });
        }
      } catch (err) {
        console.error('leaderboard card failed:', err);
      }
    }

    // Fallback
    const lines = sorted.map((it, idx) => {
      const e = idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🔹';
      const v = type === 'balance' ? `${(it.balance || 0).toLocaleString()} 💎`
              : type === 'dungeon' ? `${it.dungeon_wins || 0} انتصار`
              : `${(it.xp || 0).toLocaleString()} XP • Lv ${it.level || 1}`;
      return `**${idx + 1}.** ${e} <@${it.id}> — ${v}`;
    });
    const embed = createStyledEmbed(interaction, title, COLORS.gold)
      .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() || undefined })
      .setDescription(lines.join('\n'))
      .setFooter({ text: 'تفاعل في السيرفر لتصعد في القائمة!' });
    return interaction.editReply({ embeds: [embed] });
  }
};
