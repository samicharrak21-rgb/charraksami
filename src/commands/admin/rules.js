const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { postRulesMessage } = require('../../systems/rules');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  aliases: ['rules', 'قوانين', 'قانون', 'rl'],
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('📜 إدارة نظام القوانين والتحقق التفاعلي')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sc => sc.setName('status').setDescription('عرض حالة نظام القوانين الحالية'))
    .addSubcommand(sc => sc.setName('toggle').setDescription('تفعيل أو تعطيل نظام القوانين'))
    .addSubcommand(sc => sc.setName('setrole').setDescription('تحديد الرتبة التي تعطى عند الموافقة').addRoleOption(o => o.setName('role').setDescription('الرتبة').setRequired(true)))
    .addSubcommand(sc => sc.setName('setchannel').setDescription('تحديد قناة إرسال القوانين').addChannelOption(o => o.setName('channel').setDescription('القناة').setRequired(true)))
    .addSubcommand(sc => sc.setName('setmessage').setDescription('تخصيص رسالة القوانين').addStringOption(o => o.setName('message').setDescription('نص الرسالة').setRequired(true)))
    .addSubcommand(sc => sc.setName('post').setDescription('إرسال رسالة القوانين التفاعلية الآن')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const g = readGuild(guildId);
    g.rules = g.rules || { enabled: false, role: null, channel: null, message: null };

    const embed = new EmbedBuilder().setTimestamp();

    if (sub === 'status') {
      embed.setColor(COLORS.primary)
        .setTitle('📜 حالة نظام القوانين')
        .addFields(
          { name: 'الحالة', value: g.rules.enabled ? '✅ مفعل' : '❌ معطل', inline: true },
          { name: 'رتبة التحقق', value: g.rules.role ? `<@&${g.rules.role}>` : 'لم تحدد', inline: true },
          { name: 'القناة المستهدفة', value: g.rules.channel ? `<#${g.rules.channel}>` : 'لم تحدد', inline: true },
          { name: 'نص القوانين', value: g.rules.message || 'القوانين الافتراضية', inline: false }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'toggle') {
      g.rules.enabled = !g.rules.enabled;
      writeGuild(guildId, g);
      embed.setColor(g.rules.enabled ? COLORS.success : COLORS.error)
        .setDescription(`تم ${g.rules.enabled ? 'تفعيل' : 'تعطيل'} نظام القوانين بنجاح.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'setrole') {
      const role = interaction.options.getRole('role');
      g.rules.role = role.id;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success).setDescription(`✅ تم تحديد رتبة الموافقة: ${role}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'setchannel') {
      const ch = interaction.options.getChannel('channel');
      g.rules.channel = ch.id;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success).setDescription(`✅ تم تحديد قناة القوانين: ${ch}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'setmessage') {
      const msg = interaction.options.getString('message');
      g.rules.message = msg;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success).setDescription('✅ تم تحديث نص رسالة القوانين بنجاح.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'post') {
      if (!g.rules.channel) return interaction.reply({ content: '❌ يجب تحديد القناة أولاً باستخدام `/rules setchannel`', ephemeral: true });
      
      await interaction.deferReply({ ephemeral: true });
      const posted = await postRulesMessage(interaction.client, guildId, g.rules.channel);
      
      if (posted) {
        embed.setColor(COLORS.success).setDescription(`✅ تم إرسال رسالة القوانين التفاعلية بنجاح في <#${g.rules.channel}>`);
      } else {
        embed.setColor(COLORS.error).setDescription('❌ فشل إرسال الرسالة. تأكد من صلاحيات البوت في القناة.');
      }
      return interaction.editReply({ embeds: [embed] });
    }
  }
};
