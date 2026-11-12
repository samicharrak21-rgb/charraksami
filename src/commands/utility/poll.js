const { SlashCommandBuilder } = require('discord.js');
const { pollEmbed, pollRows } = require('../../systems/pollSystem');

module.exports = {
  aliases: ['تصويت', 'استفتاء', 'رايكم'],
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('🗳️ إنشاء تصويت بأزرار ونتائج مرسومة')
    .addStringOption(o => o.setName('question').setDescription('سؤال التصويت').setRequired(true).setMaxLength(200))
    .addStringOption(o => o.setName('option1').setDescription('الخيار الأول').setRequired(true).setMaxLength(80))
    .addStringOption(o => o.setName('option2').setDescription('الخيار الثاني').setRequired(true).setMaxLength(80))
    .addStringOption(o => o.setName('option3').setDescription('الخيار الثالث').setMaxLength(80))
    .addStringOption(o => o.setName('option4').setDescription('الخيار الرابع').setMaxLength(80)),
  async execute(interaction) {
    const question = interaction.options?.getString?.('question');
    const opts = [1, 2, 3, 4].map((n) => interaction.options?.getString?.(`option${n}`)).filter(Boolean);
    if (!question || opts.length < 2) return interaction.reply({ content: '❌ حدّد سؤالاً وخيارين على الأقل. من الشات: `تصويت أحسن لعبة؟ أكشن ام استراتيجية`', ephemeral: true });

    // الشات النصي: «تصويت السؤال؟ خيار1 او خيار2»
    if (interaction.isMessage?.() && interaction.options?._args?.length) {
      // النص بعد السؤال مفصول بـ «؟» ثم خيارات بـ «او»
      const joined = interaction.options._args.join(' ');
      const parts = joined.split(/\s+او\s+|\s+أو\s+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const [q, ...rest] = parts;
        const textOpts = rest.length ? rest : opts;
        return sendPoll(interaction, q.replace(/[؟?]+$/, ''), textOpts.slice(0, 4));
      }
    }
    return sendPoll(interaction, question, opts.slice(0, 4));
  }
};

async function sendPoll(interaction, question, opts) {
  const authorName = interaction.member?.displayName || interaction.user.username;
  const counts = opts.map(() => 0);
  const reply = await interaction.reply({ embeds: [pollEmbed(question, opts, counts, authorName)] });
  const messageId = reply?.id;
  if (messageId) await interaction.editReply({ components: pollRows(messageId, opts) }).catch(() => {});
}
