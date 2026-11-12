// 🎉 /group — تشغيل الألعاب الجماعية
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { startGroupGame, GAMES } = require('../../systems/groupGames');
const { COLORS } = require('../../utils/embeds');

const AR = {
  'كاتب': 'fastest', 'اسرع': 'fastest', 'كتابه': 'fastest',
  'اسئله': 'quiz', 'معلومات': 'quiz', 'كويز': 'quiz',
  'ايموجي': 'emoji', 'صيد': 'emoji',
  'رياضيات': 'math', 'حساب': 'math',
  'مبعثره': 'scramble', 'ترتيب': 'scramble',
  'اقصاء': 'elimination', 'روليت': 'elimination',
  'كراسي': 'chairs', 'كرسي': 'chairs',
};
const norm = (t) => String(t || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();

module.exports = {
  aliases: ['جماعي', 'جماعية', 'العاب-جماعية', 'party'],
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('group')
    .setDescription('🎉 ألعاب جماعية لكل أعضاء القناة')
    .addStringOption((o) => o.setName('game').setDescription('اختر اللعبة').setRequired(false)
      .addChoices(...Object.entries(GAMES).map(([value, g]) => ({ name: `${g.emoji} ${g.name}`, value }))))
    .addIntegerOption((o) => o.setName('rounds').setDescription('عدد الجولات (1-15)').setMinValue(1).setMaxValue(15))
    .addIntegerOption((o) => o.setName('prize').setDescription('جائزة الفائز').setMinValue(0).setMaxValue(100000)),

  async execute(interaction) {
    let type = interaction.options.getString('game');
    if (type && !GAMES[type]) type = AR[norm(type)] || null;

    if (!type) {
      const list = Object.entries(GAMES).map(([k, g]) => `${g.emoji} **${g.name}** — \`/group game:${k}\`\n> ${g.desc}`).join('\n');
      const embed = new EmbedBuilder().setColor(COLORS.royal).setTitle('🎉 الألعاب الجماعية')
        .setDescription(`${list}\n\n💡 بالأوامر النصية: \`جماعي كراسي\` ، \`جماعي اسئلة\` ...`)
        .setFooter({ text: 'الفائز يحصل على جواهر وخبرة!' });
      return interaction.reply({ embeds: [embed] });
    }

    const rounds = interaction.options.getInteger('rounds') || 5;
    const prize = interaction.options.getInteger('prize') ?? 1500;
    await interaction.reply({ content: `${GAMES[type].emoji} جاري تجهيز **${GAMES[type].name}**...` });
    const res = await startGroupGame(interaction.channel, interaction.user, type, { rounds, prize });
    if (!res.ok && res.error && res.error !== 'not enough players') {
      await interaction.followUp({ content: `❌ ${res.error}`, ephemeral: true }).catch(() => {});
    }
  },
};
