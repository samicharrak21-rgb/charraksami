const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  aliases: ['gameschannel', 'قناة_العاب', 'قناة_الألعاب', 'gc'],
  data: new SlashCommandBuilder()
    .setName('gameschannel')
    .setDescription('🎮 تخصيص قناة ألعاب البوت')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sc => sc.setName('show').setDescription('عرض قناة الألعاب الحالية'))
    .addSubcommand(sc => sc.setName('set').setDescription('تحديد قناة الألعاب').addChannelOption(o => o.setName('channel').setDescription('القناة').setRequired(true).addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(sc => sc.setName('clear').setDescription('إزالة تقييد قناة الألعاب')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const g = readGuild(guildId);
    g.channels = g.channels || {};
    const embed = new EmbedBuilder().setTimestamp();
    if (sub === 'show') {
      embed.setColor(COLORS.info)
        .setTitle('🎮 قناة الألعاب')
        .setDescription(g.channels.games ? `القناة الحالية: <#${g.channels.games}>` : 'لا يوجد تقييد. الألعاب تعمل في أي قناة.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel');
      g.channels.games = channel.id;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success)
        .setTitle('✅ تم تعيين قناة الألعاب')
        .setDescription(`ستعمل ألعاب البوت فقط في: ${channel}`);
      return interaction.reply({ embeds: [embed] });
    }
    if (sub === 'clear') {
      delete g.channels.games;
      writeGuild(guildId, g);
      embed.setColor(COLORS.warning)
        .setTitle('♻️ تم إزالة تقييد قناة الألعاب')
        .setDescription('ستعمل الألعاب الآن في أي قناة نصية.');
      return interaction.reply({ embeds: [embed] });
    }
  }
};
