const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  aliases: ['قنوات', 'قنواتي', 'channels'],
  data: new SlashCommandBuilder()
    .setName('channelsettings')
    .setDescription('📁 تخصيص قنوات الأنظمة (ترحيب، إعلانات، مستويات، قوانين)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sc => sc.setName('show').setDescription('عرض جميع إعدادات القنوات الحالية'))
    .addSubcommand(sc => sc.setName('set').setDescription('تحديد قناة لنظام معين').addStringOption(o => o.setName('system').setDescription('النظام').setRequired(true).addChoices(
      { name: 'الترحيب (Welcome)', value: 'welcome' },
      { name: 'الإعلانات (Announce)', value: 'announce' },
      { name: 'المستويات (Levels)', value: 'levels' },
      { name: 'التذاكر (Tickets)', value: 'tickets' },
      { name: 'القوانين (Rules)', value: 'rules' },
      { name: 'البوستر (Booster)', value: 'booster' },
      { name: 'البومب (Bump)', value: 'bump' },
      { name: 'نشر السيرفر (Promote)', value: 'promote' },
      { name: 'السجلات (Logs)', value: 'logs' }
    )).addChannelOption(o => o.setName('channel').setDescription('القناة').setRequired(true)))
    .addSubcommand(sc => sc.setName('xp-allow').setDescription('السماح بـ XP في قناة معينة').addChannelOption(o => o.setName('channel').setDescription('القناة').setRequired(true)))
    .addSubcommand(sc => sc.setName('xp-block').setDescription('منع الـ XP في قناة معينة').addChannelOption(o => o.setName('channel').setDescription('القناة').setRequired(true)))
    .addSubcommand(sc => sc.setName('xp-clear').setDescription('مسح قائمة القنوات المسموحة والممنوعة من الـ XP')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const g = readGuild(guildId);
    
    if (!g.channels) g.channels = {};
    const embed = new EmbedBuilder().setTimestamp();

    if (sub === 'show') {
      embed.setColor(COLORS.primary)
        .setTitle('📁 إعدادات القنوات المخصصة')
        .addFields(
          { name: '👋 الترحيب', value: g.channels.welcome ? `<#${g.channels.welcome}>` : 'لم تحدد', inline: true },
          { name: '📢 الإعلانات', value: g.channels.announce ? `<#${g.channels.announce}>` : 'لم تحدد', inline: true },
          { name: '⭐ المستويات', value: g.channels.levels ? `<#${g.channels.levels}>` : 'لم تحدد', inline: true },
          { name: '🎟️ التذاكر', value: g.channels.tickets ? `<#${g.channels.tickets}>` : 'لم تحدد', inline: true },
          { name: '📜 القوانين', value: g.channels.rules ? `<#${g.channels.rules}>` : 'لم تحدد', inline: true },
          { name: '⏰ البومب', value: g.channels.bump ? `<#${g.channels.bump}>` : 'لم تحدد', inline: true },
          { name: '🚀 البوستر', value: g.channels.booster ? `<#${g.channels.booster}>` : 'لم تحدد', inline: true },
          { name: '📢 النشر', value: g.channels.promote ? `<#${g.channels.promote}>` : 'لم تحدد', inline: true },
          { name: '🛡️ السجلات', value: g.channels.logs ? `<#${g.channels.logs}>` : 'لم تحدد', inline: true },
          { name: '✅ قنوات الـ XP المسموحة', value: g.channels.xpAllowed?.length > 0 ? g.channels.xpAllowed.map(id => `<#${id}>`).join(', ') : 'الكل مسموح', inline: false },
          { name: '❌ قنوات الـ XP الممنوعة', value: g.channels.xpBlocked?.length > 0 ? g.channels.xpBlocked.map(id => `<#${id}>`).join(', ') : 'لا يوجد', inline: false }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'set') {
      const system = interaction.options.getString('system');
      const ch = interaction.options.getChannel('channel');
      g.channels[system] = ch.id;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success).setDescription(`✅ تم تحديد قناة **${system}** لتكون ${ch}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'xp-allow') {
      const ch = interaction.options.getChannel('channel');
      g.channels.xpAllowed = g.channels.xpAllowed || [];
      if (!g.channels.xpAllowed.includes(ch.id)) g.channels.xpAllowed.push(ch.id);
      writeGuild(guildId, g);
      embed.setColor(COLORS.success).setDescription(`✅ تم السماح بالـ XP في القناة: ${ch}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'xp-block') {
      const ch = interaction.options.getChannel('channel');
      g.channels.xpBlocked = g.channels.xpBlocked || [];
      if (!g.channels.xpBlocked.includes(ch.id)) g.channels.xpBlocked.push(ch.id);
      writeGuild(guildId, g);
      embed.setColor(COLORS.error).setDescription(`✅ تم منع الـ XP في القناة: ${ch}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'xp-clear') {
      g.channels.xpAllowed = [];
      g.channels.xpBlocked = [];
      writeGuild(guildId, g);
      embed.setColor(COLORS.warning).setDescription('♻️ تم مسح جميع إعدادات قنوات الـ XP المسموحة والممنوعة.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
