const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { readGuild } = require('../../utils/guildStorage');
const { COLORS, createModernEmbed, DESIGN } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  aliases: ['رصيد', 'bal', 'فلوس', 'فلوسي', 'جواهر'],
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('💰 عرض رصيدك من العملات والجواهر')
    .addUserOption(o => o.setName('user').setDescription('عرض رصيد عضو آخر').setRequired(false)),
  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => {});

    const target = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(target.id);
    const displayName = member?.displayName || target.username;
    const guildId = interaction.guild.id;
    const g = readGuild(guildId);

    g.users = g.users || {};
    const u = g.users[target.id] || { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1 };

    // Compute rank
    let rank = null;
    try {
      const sorted = Object.entries(g.users || {})
        .sort(([, a], [, b]) => ((b.balance || 0) + (b.bank?.balance || 0)) - ((a.balance || 0) + (a.bank?.balance || 0)));
      const idx = sorted.findIndex(([id]) => id === target.id);
      if (idx >= 0) rank = idx + 1;
    } catch (e) {}

    // بطاقة الرصيد العصرية
    try {
      const { balanceCard } = require('../../utils/modernCards');
      const card = await balanceCard({
        username: displayName,
        wallet: u.balance || 0,
        bank: u.bank?.balance || 0,
        loan: u.bank?.loan || 0,
        totalUsers: Object.keys(g.users || {}).length,
        level: u.level || 1,
        rank,
        currency: config.CURRENCY_NAME || 'جواهر',
        avatarURL: target.displayAvatarURL({ extension: 'png', size: 256 }),
      });
      if (card && card.buffer) {
        return interaction.editReply({ files: [new AttachmentBuilder(card.buffer, { name: 'balance.png' })] });
      }
    } catch (err) {
      console.error('balance card render failed:', err);
    }

    // Fallback embed
    const embed = createModernEmbed(interaction, `💰 المحفظة الرقمية: ${displayName}`, null, COLORS.gold)
      .setAuthor({ name: displayName, iconURL: target.displayAvatarURL({ dynamic: true }) })
      .setDescription(`🏛 **البنك المركزي**\n${DESIGN.thin_separator}`)
      .addFields(
        { name: `${DESIGN.diamond} الرصيد`, value: `**${(u.balance || 0).toLocaleString()}** ${config.CURRENCY_NAME || 'جوهرة'}`, inline: true },
        { name: '🏦 البنك', value: `**${(u.bank?.balance || 0).toLocaleString()}**`, inline: true },
        { name: '📊 الثروة', value: `**${((u.balance || 0) + (u.bank?.balance || 0)).toLocaleString()}**`, inline: true },
        { name: `${DESIGN.level} المستوى`, value: `**${u.level || 1}**`, inline: true },
        { name: `${DESIGN.star} الترتيب`, value: rank ? `#${rank}` : '—', inline: true }
      )
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: '💡 استخدم /daily للحصول على مكافأة يومية!' });

    return interaction.editReply({ embeds: [embed] });
  }
};
