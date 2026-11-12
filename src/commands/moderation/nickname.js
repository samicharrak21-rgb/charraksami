const { SlashCommandBuilder } = require('discord.js');
const { canAct, resolveTarget, targetName, logCase, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['لقب', 'كنيه'],
  requiredPermissions: [FLAGS.ManageNicknames],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('✏️ تغيير لقب عضو')
    .addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true))
    .addStringOption(o => o.setName('name').setDescription('اللقب الجديد (اتركه فارغاً لإزالته)').setMaxLength(32)),
  async execute(interaction) {
    const target = await resolveTarget(interaction);
    if (!target?.id || !target.manageable) return interaction.reply({ content: '❌ حدّد العضو: منشن، أو رد على رسالته.', ephemeral: true });
    const check = canAct(interaction, { perm: FLAGS.ManageNicknames, targetMember: target });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });
    const name = interaction.options?.getString?.('name') || null;

    try {
      await target.setNickname(name);
    } catch (e) {
      return interaction.reply({ content: `❌ فشل تغيير اللقب: ${e.message}`, ephemeral: true });
    }
    await logCase(interaction, 'nickname', target, name ? `اللقب الجديد: ${name}` : 'إزالة اللقب');
    await interaction.reply({ content: name ? `✏️ تم تغيير لقب **${targetName(target)}** إلى: **${name}**` : `✏️ تمت إزالة لقب **${targetName(target)}**.` });
  }
};
