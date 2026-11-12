const { SlashCommandBuilder } = require('discord.js');
const { canAct, resolveTarget, targetName, logCase, dmPunishment, dmEmbed, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['حظر'],
  requiredPermissions: [FLAGS.BanMembers],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('🔨 حظر عضو من السيرفر')
    .addUserOption(o => o.setName('user').setDescription('العضو المراد حظره').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('سبب الحظر')),
  async execute(interaction) {
    const target = await resolveTarget(interaction);
    if (!target?.id) return interaction.reply({ content: '❌ حدّد العضو: منشن، أو رد على رسالته.', ephemeral: true });
    const check = canAct(interaction, { perm: FLAGS.BanMembers, targetMember: target.roles ? target : null });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });
    const reason = interaction.options?.getString?.('reason') || 'بدون سبب';

    try {
      await target.send(dmEmbed('حظر دائم', interaction.guild.name, reason)).catch(() => {});
      await interaction.guild.members.ban(target.id, { reason: `${reason} | بواسطة ${interaction.user.tag}` });
    } catch (e) {
      return interaction.reply({ content: `❌ فشل تنفيذ الحظر: ${e.message}`, ephemeral: true });
    }
    await logCase(interaction, 'ban', target, reason);
    await interaction.reply({ content: `🔨 تم حظر **${targetName(target)}** | السبب: ${reason}` });
  }
};
