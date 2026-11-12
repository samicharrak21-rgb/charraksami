const { SlashCommandBuilder } = require('discord.js');
const { canAct, logCase, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['بطيء', 'وضع_بطيء'],
  requiredPermissions: [FLAGS.ManageChannels],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('🐌 ضبط الوضع البطيء للقناة')
    .addIntegerOption(o => o.setName('seconds').setDescription('الثواني بين كل رسالة (0 = إيقاف)').setRequired(true).setMinValue(0).setMaxValue(21600)),
  async execute(interaction) {
    const check = canAct(interaction, { perm: FLAGS.ManageChannels, needTarget: false });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });
    const seconds = Math.min(21600, Math.max(0, interaction.options?.getInteger?.('seconds') ?? 5));
    const channel = interaction.channel;
    try {
      await channel.setRateLimitPerUser(seconds);
      await logCase(interaction, 'slowmode', null, seconds ? `الوضع البطيء: ${seconds} ثانية في #${channel.name}` : `أُوقف الوضع البطيء في #${channel.name}`);
      return interaction.reply({ content: seconds ? `🐌 تم تفعيل الوضع البطيء في ${channel}: **${seconds} ثانية** بين كل رسالة.` : `✅ تم إيقاف الوضع البطيء في ${channel}.` });
    } catch (e) {
      return interaction.reply({ content: `❌ فشل الضبط: ${e.message}`, ephemeral: true });
    }
  }
};
