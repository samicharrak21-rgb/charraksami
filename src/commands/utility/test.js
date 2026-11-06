const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  aliases: ['test', 'اختبار', 'tst'],
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test command to check if bot is working'),
  async execute(interaction) {
    await interaction.reply('✅ Bot is working!');
  }
};
