const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { canAct, logCase, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['قول', 'كرر', 'انطق'],
  requiredPermissions: [FLAGS.ManageMessages],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('📢 جعل البوت يقول رسالة في القناة')
    .addStringOption(o => o.setName('text').setDescription('النص المطلوب').setRequired(true).setMaxLength(2000)),
  async execute(interaction) {
    const check = canAct(interaction, { perm: FLAGS.ManageMessages, needTarget: false });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });
    const text = interaction.options?.getString?.('text');
    if (!text) return interaction.reply({ content: '❌ اكتب النص. مثال: `قول أهلاً بالجميع`', ephemeral: true });

    // الشات النصي: نحذف رسالة الطلب ليبقى النقاء
    if (interaction.isMessage?.()) {
      await interaction._originalMessage?.delete?.().catch(() => {});
      await interaction.guild.channels.cache.get(interaction.channelId)?.send({ content: text }).catch(() => {});
      await logCase(interaction, 'say', null, text.slice(0, 100));
      return;
    }
    await interaction.channel.send({ content: text });
    await logCase(interaction, 'say', null, text.slice(0, 100));
    await interaction.reply({ content: '✅ تم الإرسال.', ephemeral: true });
  }
};
