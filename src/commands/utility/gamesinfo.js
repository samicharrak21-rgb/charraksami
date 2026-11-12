// 🎮 قائمة الألعاب v21 — بطاقة مرسومة بكل الألعاب وطريقة تشغيلها والمهلة الحقيقية لكل لعبة
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { cooldownLabel } = require('../../utils/cooldowns');
const config = require('../../config');

const SECTIONS = [
  { title: '🎰 الكازينو', theme: 'gold', games: [
    { icon: '🎰', name: 'ماكينة الحظ', trigger: 'سلوت 500', cmd: 'slots', art: 'slots' },
    { icon: '🎡', name: 'الروليت', trigger: 'روليت 500 احمر', cmd: 'roulette', art: 'roulette' },
    { icon: '🃏', name: 'بلاك جاك', trigger: 'بلاك 500', cmd: 'blackjack', art: 'blackjack' },
    { icon: '🪙', name: 'رمي العملة', trigger: 'عملة 300 صورة', cmd: 'coinflip', art: 'coinflip' },
    { icon: '🚀', name: 'الصاروخ', trigger: 'صاروخ 500 2', cmd: 'crash', art: 'crash' },
    { icon: '🎟️', name: 'بطاقة الكشط', trigger: 'كشط 300', cmd: 'scratch', art: 'scratch' },
    { icon: '🧰', name: 'صناديق الكنز', trigger: 'كنز 500', cmd: 'treasure', art: 'treasure' },
    { icon: '⬆️', name: 'أعلى أو أقل', trigger: 'اعلى 300', cmd: 'highlow', art: 'highlow' },
    { icon: '💣', name: 'الألغام', trigger: 'الغام 300', cmd: 'minesweeper', art: 'minesweeper' },
  ] },
  { title: '🎲 ألعاب وتحديات', theme: 'emerald', games: [
    { icon: '🔮', name: 'خمن الرقم', trigger: 'خمن 200', cmd: 'guess', art: 'guess' },
    { icon: '🐪', name: 'سباق الهجن', trigger: 'سباق 500 2', cmd: 'race', art: 'race' },
    { icon: '✂️', name: 'حجرة ورقة مقص', trigger: 'حجرة · ورقة · مقص', cmd: 'rps', art: 'rps' },
    { icon: '❌', name: 'إكس أو', trigger: 'xo + منشن', cmd: 'tictactoe', art: 'tictactoe' },
    { icon: '🔴', name: 'أربعة في صف', trigger: 'كونكت + منشن', cmd: 'connect4', art: 'connect4' },
    { icon: '🔤', name: 'وردل', trigger: 'وردل', cmd: 'wordle', art: 'wordle' },
    { icon: '🪢', name: 'المشنقة', trigger: 'مشنقة', cmd: 'hangman', art: 'hangman' },
    { icon: '🧠', name: 'معلومات عامة', trigger: 'تريفيا', cmd: 'trivia', art: 'trivia' },
    { icon: '🎣', name: 'صيد السمك', trigger: 'صيد', cmd: 'fish', art: 'fish' },
    { icon: '🎲', name: 'النرد', trigger: 'نرد 2', cmd: 'dice', art: 'dice' },
    { icon: '🎡', name: 'عجلة الحظ', trigger: 'عجلة الحظ', cmd: 'fun', art: 'wheel' },
    { icon: '⚔️', name: 'مبارزة', trigger: 'مبارزة @عضو', cmd: 'fun', art: 'rps' },
  ] },
  { title: '🎉 جماعية والسهرة', theme: 'violet', games: [
    { icon: '🪑', name: 'الكراسي', trigger: 'كراسي', cmd: 'group', art: 'group' },
    { icon: '💥', name: 'روليت الإقصاء', trigger: 'روليت جماعي', cmd: 'group', art: 'roulette' },
    { icon: '⚡', name: 'الأسرع · فكك · حساب', trigger: 'اسرع · فكك · حساب', cmd: 'group', art: 'trivia' },
    { icon: '🗣️', name: 'صراحة وجرأة', trigger: 'صراحه · جرأه', cmd: 'social', art: 'social' },
    { icon: '🤔', name: 'لو خيروك · كت', trigger: 'لو خيروك · كت', cmd: 'social', art: 'social' },
    { icon: '🧩', name: 'لغز · نكتة · حكمة', trigger: 'لغز · نكته · حكمه', cmd: 'social', art: 'social' },
  ] },
  { title: '⚔️ المغامرة والاقتصاد', theme: 'crimson', games: [
    { icon: '🏰', name: 'الدانجون', trigger: 'دانجون', cmd: 'dungeon' },
    { icon: '🌾', name: 'المزرعة', trigger: 'مزرعة', cmd: 'farm' },
    { icon: '🛒', name: 'المتجر', trigger: 'متجر', cmd: 'shop' },
    { icon: '💼', name: 'العمل', trigger: 'عمل', cmd: 'work', cooldown: '1س' },
    { icon: '🎁', name: 'الراتب اليومي', trigger: 'راتب', cmd: 'daily', cooldown: '24س' },
    { icon: '🏆', name: 'المتصدرين', trigger: 'توب', cmd: 'leaderboard' },
  ] },
];

module.exports = {
  aliases: ['العاب', 'الألعاب', 'معلومات_الألعاب', 'معلومات_الالعاب', 'كازينو'],
  data: new SlashCommandBuilder()
    .setName('gamesinfo')
    .setDescription('🎮 كل الألعاب المتاحة وطريقة تشغيلها'),
  async execute(interaction) {
    const sections = SECTIONS.map((s) => ({ ...s, games: s.games.map((g) => ({ ...g, cooldown: g.cooldown || cooldownLabel(g.cmd) })) }));
    const embed = new EmbedBuilder()
      .setColor(require('../../utils/embeds').COLORS.primary)
      .setTitle('🎮 ألعاب السيرفر')
      .setDescription('اكتب كلمة اللعبة في الشات مباشرة (بدون `/`) — مثال: `سلوت 500` أو `روليت 1k احمر`.\nيمكنك كتابة `الكل` بدل المبلغ للمراهنة برصيدك كاملاً.')
      .setFooter({ text: `${config.SERVER_NAME || 'Sami Bot'} • نظام الألعاب` });
    const files = [];
    try {
      const card = await require('../../utils/cardKit').gamesMenuCard({ sections, botName: interaction.client.user.username });
      if (card) { files.push(new AttachmentBuilder(card.buffer, { name: 'games.png' })); embed.setImage('attachment://games.png'); }
    } catch {}
    if (!files.length) {
      for (const s of sections) embed.addFields({ name: s.title, value: s.games.map((g) => `${g.icon} **${g.name}** — \`${g.trigger}\` • ${g.cooldown}`).join('\n') });
    }
    return interaction.reply({ embeds: [embed], files });
  },
};
