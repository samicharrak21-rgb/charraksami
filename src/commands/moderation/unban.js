const { SlashCommandBuilder } = require('discord.js');
const { canAct, logCase, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['فك_حظر'],
  requiredPermissions: [FLAGS.BanMembers],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('🔓 فك حظر عضو')
    .addStringOption(o => o.setName('user').setDescription('آيدي العضو المحظور').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('السبب')),
  async execute(interaction) {
    const check = canAct(interaction, { perm: FLAGS.BanMembers, needTarget: false });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });

    const raw = interaction.options?.getString?.('user') || '';
    const id = raw.match(/\d{17,21}/)?.[0];
    if (!id) return interaction.reply({ content: '❌ أدخل آيدي العضو المحظور (17-21 رقم). مثال: `فك حظر 123456789012345678`', ephemeral: true });
    const reason = interaction.options?.getString?.('reason') || 'بدون سبب';

    try {
      await interaction.guild.bans.fetch(id);
    } catch {
      return interaction.reply({ content: '❌ هذا العضو غير محظور أصلاً.', ephemeral: true });
    }
    try {
      await interaction.guild.members.unban(id, `${reason} | بواسطة ${interaction.user.tag}`);
    } catch (e) {
      return interaction.reply({ content: `❌ فشل فك الحظر: ${e.message}`, ephemeral: true });
    }
    await logCase(interaction, 'unban', { id, username: `آيدي: ${id}`, displayName: `آيدي: ${id}` }, reason);
    await interaction.reply({ content: `🔓 تم فك حظر **${id}** | السبب: ${reason}` });
  }
};
