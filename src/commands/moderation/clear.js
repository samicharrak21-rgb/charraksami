const { SlashCommandBuilder } = require('discord.js');
const { canAct, logCase, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['مسح', 'نظف', 'حذف'],
  requiredPermissions: [FLAGS.ManageMessages],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('🧹 مسح عدد من الرسائل (حتى 100)')
    .addIntegerOption(o => o.setName('amount').setDescription('عدد الرسائل').setRequired(true).setMinValue(1).setMaxValue(100)),
  async execute(interaction) {
    const check = canAct(interaction, { perm: FLAGS.ManageMessages, needTarget: false });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });
    const amount = Math.min(100, Math.max(1, interaction.options?.getInteger?.('amount') || 50));

    const channel = interaction.channel;
    if (!channel?.bulkDelete) return interaction.reply({ content: '❌ لا يمكن مسح الرسائل هنا.', ephemeral: true });
    try {
      const deleted = await channel.bulkDelete(amount, true).catch(() => null);
      const n = deleted?.size ?? 0;
      await logCase(interaction, 'clear', null, `مسح ${n} رسالة في #${channel.name}`);
      const reply = await interaction.reply({ content: `🧹 تم مسح **${n}** رسالة.` }).catch(() => null);
      if (interaction.isMessage?.() && reply) setTimeout(() => reply.delete().catch(() => {}), 6000);
      return reply;
    } catch (e) {
      return interaction.reply({ content: `❌ فشل المسح: ${e.message}`, ephemeral: true });
    }
  }
};
