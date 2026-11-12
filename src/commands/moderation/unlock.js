const { SlashCommandBuilder } = require('discord.js');
const { canAct, logCase, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['فتح'],
  requiredPermissions: [FLAGS.ManageChannels],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('🔓 فتح القناة المقفلة'),
  async execute(interaction) {
    const check = canAct(interaction, { perm: FLAGS.ManageChannels, needTarget: false });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });
    const channel = interaction.channel;
    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
      await logCase(interaction, 'unlock', null, `فُتحت #${channel.name}`);
      return interaction.reply({ content: `🔓 تم فتح ${channel} — الكتابة متاحة للجميع.` });
    } catch (e) {
      return interaction.reply({ content: `❌ فشل الفتح: ${e.message}`, ephemeral: true });
    }
  }
};
