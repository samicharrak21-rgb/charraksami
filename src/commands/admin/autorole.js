const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  aliases: ['autorole', 'رتبة_تلقائية', 'رتبه_تلقائيه', 'ar'],
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('👑 إدارة نظام الرتب التلقائية عند الانضمام')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sc => sc.setName('status').setDescription('عرض حالة الرتب التلقائية الحالية'))
    .addSubcommand(sc => sc.setName('toggle').setDescription('تفعيل أو تعطيل الرتب التلقائية'))
    .addSubcommand(sc => sc.setName('set').setDescription('تحديد الرتبة التي تعطى عند الدخول').addRoleOption(o => o.setName('role').setDescription('الرتبة').setRequired(true)))
    .addSubcommand(sc => sc.setName('timed-add').setDescription('إضافة رتبة تعطى بعد مرور مدة').addRoleOption(o => o.setName('role').setDescription('الرتبة').setRequired(true)).addIntegerOption(o => o.setName('days').setDescription('عدد الأيام بعد الانضمام').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const g = readGuild(guildId);
    
    g.autoRole = g.autoRole || { enabled: false, roleId: null };
    g.timedRoles = g.timedRoles || [];

    const embed = new EmbedBuilder().setTimestamp();

    if (sub === 'status') {
      embed.setColor(COLORS.primary)
        .setTitle('👑 حالة نظام الرتب التلقائية')
        .addFields(
          { name: 'الحالة', value: g.autoRole.enabled ? '✅ مفعل' : '❌ معطل', inline: true },
          { name: 'رتبة الدخول', value: g.autoRole.roleId ? `<@&${g.autoRole.roleId}>` : 'لم تحدد', inline: true },
          { name: 'الرتب المؤقتة', value: g.timedRoles.length > 0 ? g.timedRoles.map(r => `<@&${r.id}> بعد ${r.days} يوم`).join('\n') : 'لا يوجد', inline: false }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'toggle') {
      g.autoRole.enabled = !g.autoRole.enabled;
      writeGuild(guildId, g);
      embed.setColor(g.autoRole.enabled ? COLORS.success : COLORS.error)
        .setDescription(`تم ${g.autoRole.enabled ? 'تفعيل' : 'تعطيل'} نظام الرتب التلقائية بنجاح.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'set') {
      const role = interaction.options.getRole('role');
      g.autoRole.roleId = role.id;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success).setDescription(`✅ تم تحديد رتبة الدخول التلقائية: ${role}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'timed-add') {
      const role = interaction.options.getRole('role');
      const days = interaction.options.getInteger('days');
      
      g.timedRoles.push({ id: role.id, days });
      writeGuild(guildId, g);
      
      embed.setColor(COLORS.success).setDescription(`✅ سيتم إعطاء رتبة ${role} للأعضاء بعد **${days}** يوم من انضمامهم.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
