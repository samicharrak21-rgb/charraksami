const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createStyledEmbed } = require('../../utils/embeds');

/**
 * /reminder set <minutes> <text>
 * تذكير بسيط في الذاكرة — يعمل ما دام البوت شغّال.
 */
module.exports = {
  aliases: ['تذكير', 'reminder', 'remind'],
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('⏰ ذكّرني بشيء بعد فترة')
    .addIntegerOption(o => o.setName('minutes').setDescription('بعد كم دقيقة').setRequired(true).setMinValue(1).setMaxValue(1440))
    .addStringOption(o => o.setName('text').setDescription('نص التذكير').setRequired(true)),

  async execute(interaction) {
    const minutes = interaction.options.getInteger('minutes');
    const text = interaction.options.getString('text');
    const ms = minutes * 60 * 1000;
    const when = Math.floor((Date.now() + ms) / 1000);

    const ack = createStyledEmbed(interaction, '⏰ تم ضبط التذكير', COLORS.success)
      .setDescription(`سأذكّرك بـ:\n> ${text}\n\n📅 الموعد: <t:${when}:R>`);
    await interaction.reply({ embeds: [ack], ephemeral: true });

    setTimeout(() => {
      const ping = createStyledEmbed(interaction, '🔔 تذكير!', COLORS.warning)
        .setDescription(`<@${interaction.user.id}> طلبت تذكيرك بـ:\n> ${text}`);
      interaction.followUp({ content: `<@${interaction.user.id}>`, embeds: [ping] }).catch(() => {});
    }, ms);
  }
};
