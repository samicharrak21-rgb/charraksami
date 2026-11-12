const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  aliases: ['welcomesettings', 'اعدادات_الترحيب', 'إعدادات_الترحيب', 'ws'],
  data: new SlashCommandBuilder()
    .setName('welcomesettings')
    .setDescription('👋 إعدادات نظام الترحيب بالسيرفر')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('status').setDescription('عرض حالة الترحيب الحالية'))
    .addSubcommand(s => s.setName('toggle').setDescription('تفعيل أو تعطيل الترحيب'))
    .addSubcommand(s => s.setName('channel').setDescription('تحديد قناة الترحيب').addChannelOption(o => o.setName('channel').setDescription('القناة').setRequired(true).addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(s => s.setName('message').setDescription('تخصيص رسالة الترحيب').addStringOption(o => o.setName('text').setDescription('نص الرسالة (استخدم المتغيرات)').setRequired(true)))
    .addSubcommand(s => s.setName('title').setDescription('تخصيص عنوان الترحيب (Embed Title)').addStringOption(o => o.setName('text').setDescription('عنوان الرسالة (استخدم المتغيرات)').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const g = readGuild(guildId);

    if (!g.welcome) g.welcome = { enabled: false, channel: null, message: null };

    const embed = new EmbedBuilder().setTimestamp();

    if (sub === 'status') {
      embed.setColor(COLORS.primary)
        .setTitle('👋 حالة نظام الترحيب')
        .addFields(
          { name: 'الحالة', value: g.welcome.enabled ? '✅ مفعل' : '❌ معطل', inline: true },
          { name: 'القناة', value: g.welcome.channel ? `<#${g.welcome.channel}>` : 'لم تحدد', inline: true },
          { name: 'الرسالة', value: g.welcome.message || 'الرسالة الافتراضية', inline: false }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'toggle') {
      g.welcome.enabled = !g.welcome.enabled;
      writeGuild(guildId, g);
      embed.setColor(g.welcome.enabled ? COLORS.success : COLORS.error)
        .setDescription(`تم ${g.welcome.enabled ? 'تفعيل' : 'تعطيل'} نظام الترحيب بنجاح.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      g.welcome.channel = channel.id;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success)
        .setDescription(`✅ تم تحديد قناة الترحيب: ${channel}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'message') {
      const text = interaction.options.getString('text');
      g.welcome.message = text;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success)
        .setTitle('✅ تم تحديث رسالة الترحيب')
        .setDescription(`**الرسالة الجديدة:**\n${text}\n\n**المتغيرات المتاحة:**\n\`{user}\`, \`{mention}\`, \`{server}\`, \`{memberCount}\``);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'title') {
      const text = interaction.options.getString('text');
      g.welcome.title = text;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success)
        .setTitle('✅ تم تحديث عنوان الترحيب')
        .setDescription(`**العنوان الجديد:**\n${text}\n\n**المتغيرات المتاحة:**\n\`{user}\`, \`{mention}\`, \`{server}\`, \`{memberCount}\``);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
