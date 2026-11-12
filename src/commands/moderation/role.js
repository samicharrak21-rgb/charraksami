const { SlashCommandBuilder } = require('discord.js');
const { canAct, resolveTarget, targetName, logCase, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['رتبه_عضو'],
  requiredPermissions: [FLAGS.ManageRoles],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('🎖️ إعطاء أو سحب رتبة من عضو')
    .addSubcommand(s => s.setName('add').setDescription('إعطاء رتبة')
      .addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('الرتبة').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('سحب رتبة')
      .addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('الرتبة').setRequired(true))),
  async execute(interaction) {
    const action = interaction.options?.getSubcommand?.(false) || 'add';
    const target = await resolveTarget(interaction);
    if (!target?.id) return interaction.reply({ content: '❌ حدّد العضو.', ephemeral: true });
    const check = canAct(interaction, { perm: FLAGS.ManageRoles, targetMember: target.roles ? target : null });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });

    const role = interaction.options?.getRole?.('role') || interaction.mentions?.roles?.first?.() || null;
    if (!role) return interaction.reply({ content: '❌ حدّد الرتبة بمنشن (@رتبة) أو من الخيارات.', ephemeral: true });
    if (role.managed) return interaction.reply({ content: '❌ لا يمكن التعديل على رتب التكامل/البوتات.', ephemeral: true });

    const me = interaction.guild.members.me;
    if (me && role.position >= me.roles.highest.position)
      return interaction.reply({ content: '❌ الرتبة أعلى من رتبة البوت — ارفع رتبة البوت أولاً.', ephemeral: true });

    try {
      if (action === 'remove') {
        if (!target.roles?.cache?.has(role.id)) return interaction.reply({ content: `ℹ️ **${targetName(target)}** لا يملك رتبة ${role.name}.`, ephemeral: true });
        await target.roles.remove(role.id, `بواسطة ${interaction.user.tag}`);
        await logCase(interaction, 'role_remove', target, `سُحبت رتبة ${role.name}`);
        return interaction.reply({ content: `📉 تم سحب رتبة ${role} من **${targetName(target)}**.` });
      }
      if (target.roles?.cache?.has(role.id)) return interaction.reply({ content: `ℹ️ **${targetName(target)}** يملك رتبة ${role.name} مسبقاً.`, ephemeral: true });
      await target.roles.add(role.id, `بواسطة ${interaction.user.tag}`);
      await logCase(interaction, 'role_add', target, `أُعطيت رتبة ${role.name}`);
      return interaction.reply({ content: `🎖️ تم إعطاء رتبة ${role} لـ **${targetName(target)}**.` });
    } catch (e) {
      return interaction.reply({ content: `❌ فشل التنفيذ: ${e.message}`, ephemeral: true });
    }
  }
};
