const { SlashCommandBuilder } = require('discord.js');
const { canAct, resolveTarget, targetName, logCase, dmPunishment, dmEmbed, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['طرد'],
  requiredPermissions: [FLAGS.KickMembers],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('👢 طرد عضو من السيرفر')
    .addUserOption(o => o.setName('user').setDescription('العضو المراد طرده').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('سبب الطرد')),
  async execute(interaction) {
    const target = await resolveTarget(interaction);
    if (!target?.id || !target.kickable) return interaction.reply({ content: '❌ حدّد العضو: منشن، أو رد على رسالته.', ephemeral: true });
    const check = canAct(interaction, { perm: FLAGS.KickMembers, targetMember: target });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });
    const reason = interaction.options?.getString?.('reason') || 'بدون سبب';

    try {
      await dmPunishment(target, dmEmbed('طرد', interaction.guild.name, reason));
      await target.kick(`${reason} | بواسطة ${interaction.user.tag}`);
    } catch (e) {
      return interaction.reply({ content: `❌ فشل تنفيذ الطرد: ${e.message}`, ephemeral: true });
    }
    await logCase(interaction, 'kick', target, reason);
    await interaction.reply({ content: `👢 تم طرد **${targetName(target)}** | السبب: ${reason}` });
  }
};
