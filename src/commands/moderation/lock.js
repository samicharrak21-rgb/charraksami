const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { canAct, logCase, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['قفل', 'اقفل'],
  requiredPermissions: [FLAGS.ManageChannels],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('🔒 قفل القناة على الجميع'),
  async execute(interaction) {
    const check = canAct(interaction, { perm: FLAGS.ManageChannels, needTarget: false });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });
    const channel = interaction.channel;
    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      await logCase(interaction, 'lock', null, `قُفلت #${channel.name}`);
      return interaction.reply({ content: `🔒 تم قفل ${channel} — لا يستطيع أحد الكتابة الآن.` });
    } catch (e) {
      return interaction.reply({ content: `❌ فشل القفل: ${e.message}`, ephemeral: true });
    }
  }
};
