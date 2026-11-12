const { SlashCommandBuilder } = require('discord.js');
const { canAct, resolveTarget, targetName, logCase, dmPunishment, dmEmbed, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['فك_اسكات'],
  requiredPermissions: [FLAGS.ModerateMembers],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('🔊 فك إسكات عضو')
    .addUserOption(o => o.setName('user').setDescription('العضو المراد فك إسكاته').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('السبب')),
  async execute(interaction) {
    const target = await resolveTarget(interaction);
    if (!target?.id || !target.manageable) return interaction.reply({ content: '❌ حدّد العضو: منشن، أو رد على رسالته.', ephemeral: true });
    const check = canAct(interaction, { perm: FLAGS.ModerateMembers, targetMember: target });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });
    const reason = interaction.options?.getString?.('reason') || 'بدون سبب';

    try {
      await target.timeout(null, `${reason} | بواسطة ${interaction.user.tag}`);
    } catch (e) {
      return interaction.reply({ content: `❌ فشل فك الإسكات: ${e.message}`, ephemeral: true });
    }
    await dmPunishment(target, dmEmbed('فك إسكات', interaction.guild.name, reason));
    await logCase(interaction, 'unmute', target, reason);
    await interaction.reply({ content: `🔊 تم فك إسكات **${targetName(target)}** | السبب: ${reason}` });
  }
};
