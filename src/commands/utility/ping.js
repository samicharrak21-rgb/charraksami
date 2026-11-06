const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../../utils/embeds');

module.exports = {
  aliases: ['بنق', 'اتصال', 'ping'],
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('🏓 عرض زمن الاستجابة وحالة الاتصال'),
  cooldown: 5,
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'جاري القياس...', fetchReply: true, ephemeral: true });
    const ws = interaction.client.ws.ping;
    const apiLatency = Math.abs(sent.createdTimestamp - interaction.createdTimestamp);
    const embed = createStyledEmbed(interaction, 'حالة الاتصال', 0x00b894)
      .addFields(
        { name: 'زمن استجابة البوابة', value: `${ws}ms`, inline: true },
        { name: 'زمن استجابة API', value: `${apiLatency}ms`, inline: true }
      )
      ;
    await interaction.editReply({ content: '', embeds: [embed] });
  }
};
