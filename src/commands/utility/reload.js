const { SlashCommandBuilder } = require('discord.js');
const { loadCommands } = require('../../handlers/commandHandler');
const config = require('../../config');

module.exports = {
  aliases: ['reload', 'اعادة_تحميل', 'إعادة_تحميل', 'rld'],
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('♻️ إعادة تحميل الأوامر بدون إعادة تشغيل البوت'),
  ownerOnly: true,
  cooldown: 5,
  async execute(interaction) {
    if (interaction.user.id !== String(config.OWNER_ID || process.env.OWNER_ID)) {
      return interaction.reply({ content: '❌ هذا الأمر لمالك البوت فقط.', ephemeral: true });
    }
    loadCommands();
    await interaction.reply({ content: '✅ تم إعادة تحميل الأوامر بنجاح.', ephemeral: true });
  }
};
