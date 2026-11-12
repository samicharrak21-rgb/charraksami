const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  aliases: ['setlevelchannel', 'قناة_المستويات', 'قناة_الترقية', 'slc'],
  data: new SlashCommandBuilder()
    .setName('setlevelchannel')
    .setDescription('📍 تحديد القناة الخاصة بإرسال رسائل ترقية المستويات')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(o => 
      o.setName('channel')
        .setDescription('القناة التي سيتم إرسال الترقية فيها')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;
    const g = readGuild(guildId);
    
    if (!g.channels) g.channels = {};
    g.channels.levels = channel.id;
    
    writeGuild(guildId, g);
    
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('✅ تم تحديث قناة المستويات')
      .setDescription(`سيتم الآن إرسال جميع رسائل ترقية المستويات في القناة: ${channel}`)
      .setTimestamp();
      
    await interaction.reply({ embeds: [embed] });
  }
};
