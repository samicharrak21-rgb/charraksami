const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  aliases: ['settings', 'اعدادات', 'إعدادات', 'st'],
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('⚙️ لوحة تحكم إعدادات البوت'),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: '❌ ليس لديك صلاحية لإدارة السيرفر!', ephemeral: true });
    }

    const guildId = interaction.guild.id;
    const g = readGuild(guildId);

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setAuthor({ name: `إعدادات ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
      .setTitle('⚙️ لوحة التحكم المركزية')
      .setDescription('مرحباً بك في لوحة تحكم **سامي**. من هنا يمكنك تخصيص جميع أنظمة البوت وتفعيلها أو تعطيلها بسهولة.')
      .addFields(
        { name: '👋 الترحيب', value: g.welcome?.enabled ? '✅ مفعل' : '❌ معطل', inline: true },
        { name: '⚔️ الـ XP', value: g.xp?.enabled ? '✅ مفعل' : '❌ معطل', inline: true },
        { name: '🛡️ الحماية', value: g.protection?.enabled !== false ? '✅ مفعل' : '❌ معطل', inline: true },
        { name: '🔗 منع الروابط', value: g.protection?.antiLink ? '✅ مفعل' : '❌ معطل', inline: true },
        { name: '🚫 منع السبام', value: g.protection?.antiSpam ? '✅ مفعل' : '❌ معطل', inline: true },
        { name: '🧹 تنظيف النظام', value: g.protection?.cleanSystem ? '✅ مفعل' : '❌ معطل', inline: true }
      )
      .setFooter({ text: 'اختر فئة من القائمة أدناه لتعديل الإعدادات' })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('settings_category')
          .setPlaceholder('اختر النظام لتعديله...')
          .addOptions([
            { label: 'إعدادات الترحيب', value: 'welcome', emoji: '👋' },
            { label: 'إعدادات المستويات (XP)', value: 'xp', emoji: '⚔️' },
            { label: 'إعدادات التذاكر', value: 'tickets', emoji: '🎟️' },
            { label: 'إعدادات القنوات', value: 'channels', emoji: '📁' },
            { label: 'إعدادات الحماية (Spam/Link)', value: 'protection', emoji: '🛡️' }
          ])
      );

    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('settings_refresh')
          .setLabel('تحديث')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('settings_reset')
          .setLabel('إعادة ضبط المصنع')
          .setEmoji('⚠️')
          .setStyle(ButtonStyle.Danger)
      );

    const msg = await interaction.reply({ embeds: [embed], components: [row, buttons], ephemeral: true, fetchReply: true });

    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ هذه اللوحة ليست لك!', ephemeral: true });

      const g2 = readGuild(guildId);
      
      if (i.customId === 'settings_refresh') {
        const refreshedEmbed = EmbedBuilder.from(embed)
          .setFields(
            { name: '👋 الترحيب', value: g2.welcome?.enabled ? '✅ مفعل' : '❌ معطل', inline: true },
            { name: '⚔️ الـ XP', value: g2.xp?.enabled ? '✅ مفعل' : '❌ معطل', inline: true },
            { name: '🛡️ الحماية', value: g2.protection?.enabled !== false ? '✅ مفعل' : '❌ معطل', inline: true },
            { name: '🔗 منع الروابط', value: g2.protection?.antiLink ? '✅ مفعل' : '❌ معطل', inline: true },
            { name: '🚫 منع السبام', value: g2.protection?.antiSpam ? '✅ مفعل' : '❌ معطل', inline: true },
            { name: '🧹 تنظيف النظام', value: g2.protection?.cleanSystem ? '✅ مفعل' : '❌ معطل', inline: true }
          );
        return i.update({ embeds: [refreshedEmbed] });
      }

      if (i.customId === 'settings_category') {
        const category = i.values[0];
        if (category === 'protection') {
          const prot = g2.protection || { enabled: true, antiLink: false, antiSpam: false, cleanSystem: false };
          const protEmbed = new EmbedBuilder()
            .setColor(COLORS.primary)
            .setTitle('🛡️ إعدادات الحماية والقروبات')
            .setDescription('تحكم في حماية السيرفر من الرسائل المزعجة والروابط، وتنظيف رسائل النظام.')
            .addFields(
              { name: '🔗 منع الروابط', value: prot.antiLink ? '✅ مفعل' : '❌ معطل', inline: true },
              { name: '🚫 منع السبام', value: prot.antiSpam ? '✅ مفعل' : '❌ معطل', inline: true },
              { name: '🧹 تنظيف رسائل النظام', value: prot.cleanSystem ? '✅ مفعل' : '❌ معطل', inline: true }
            );

          const protRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('toggle_antilink').setLabel('الروابط 🔗').setStyle(prot.antiLink ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('toggle_antispam').setLabel('السبام 🚫').setStyle(prot.antiSpam ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('toggle_cleansystem').setLabel('التنظيف 🧹').setStyle(prot.cleanSystem ? ButtonStyle.Success : ButtonStyle.Secondary)
          );

          const backButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('settings_main').setLabel('رجوع 🔙').setStyle(ButtonStyle.Primary)
          );

          return i.update({ embeds: [protEmbed], components: [protRow, backButton] });
        }
        // Other categories can be added here
        return i.reply({ content: '⚙️ هذا القسم قيد التطوير حالياً.', ephemeral: true });
      }

      if (i.customId.startsWith('toggle_')) {
        const feature = i.customId.split('_')[1];
        g2.protection = g2.protection || { enabled: true };
        
        if (feature === 'antilink') g2.protection.antiLink = !g2.protection.antiLink;
        if (feature === 'antispam') g2.protection.antiSpam = !g2.protection.antiSpam;
        if (feature === 'cleansystem') g2.protection.cleanSystem = !g2.protection.cleanSystem;

        writeGuild(guildId, g2);
        
        // Re-render protection menu
        const prot = g2.protection;
        const protEmbed = new EmbedBuilder()
          .setColor(COLORS.primary)
          .setTitle('🛡️ إعدادات الحماية والقروبات')
          .setDescription('تم تحديث الإعدادات بنجاح!')
          .addFields(
            { name: '🔗 منع الروابط', value: prot.antiLink ? '✅ مفعل' : '❌ معطل', inline: true },
            { name: '🚫 منع السبام', value: prot.antiSpam ? '✅ مفعل' : '❌ معطل', inline: true },
            { name: '🧹 تنظيف رسائل النظام', value: prot.cleanSystem ? '✅ مفعل' : '❌ معطل', inline: true }
          );

        const protRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('toggle_antilink').setLabel('الروابط 🔗').setStyle(prot.antiLink ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('toggle_antispam').setLabel('السبام 🚫').setStyle(prot.antiSpam ? ButtonStyle.Success : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('toggle_cleansystem').setLabel('التنظيف 🧹').setStyle(prot.cleanSystem ? ButtonStyle.Success : ButtonStyle.Secondary)
        );

        const backButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('settings_main').setLabel('رجوع 🔙').setStyle(ButtonStyle.Primary)
        );

        return i.update({ embeds: [protEmbed], components: [protRow, backButton] });
      }

      if (i.customId === 'settings_main') {
        return i.update({ embeds: [embed], components: [row, buttons] });
      }
    });
  }
};
