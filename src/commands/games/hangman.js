// لعبة الحرّافة (Hangman) عربية مع 100+ كلمة وفئات
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { fmt, getUser, saveUser, bumpStat, brandedEmbed, winEmbed, loseEmbed, balanceFooter, safeReply, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');

const WORDS = {
  'دول': ['السعودية','المغرب','الجزائر','مصر','الإمارات','تونس','الأردن','العراق','سوريا','لبنان','اليمن','عُمان','قطر','الكويت','السودان','ليبيا','فلسطين','الصومال','موريتانيا','جزر_القمر'],
  'حيوانات': ['أسد','نمر','فيل','زرافة','تمساح','أرنب','ثعلب','جمل','حصان','صقر','نسر','دلفين','حوت','قرد','ضفدع','عصفور','بومة','ذئب','فهد','كنغر'],
  'طعام': ['كبسة','منسف','مقلوبة','شاورما','فلافل','حمص','تبولة','مجدرة','مسخن','هريسة','كنافة','بقلاوة','معمول','هريسة','مكدوس'],
  'علوم': ['فيزياء','كيمياء','أحياء','رياضيات','فلك','هندسة','جغرافيا','تاريخ','طب','حاسوب','برمجة','شبكات','ذكاء_صناعي','روبوت','نانو'],
  'رياضة': ['كرة_قدم','تنس','سباحة','ملاكمة','كاراتيه','جودو','شطرنج','جولف','ركض','قفز','كريكت','هوكي','بلياردو','رماية','مبارزة']
};

const STAGES = [
  '```\n  ┌───┐\n  │   │\n      │\n      │\n      │\n      │\n=========\n```',
  '```\n  ┌───┐\n  │   │\n  😐  │\n      │\n      │\n      │\n=========\n```',
  '```\n  ┌───┐\n  │   │\n  😟  │\n  │   │\n      │\n      │\n=========\n```',
  '```\n  ┌───┐\n  │   │\n  😣  │\n /│   │\n      │\n      │\n=========\n```',
  '```\n  ┌───┐\n  │   │\n  😖  │\n /│\\  │\n      │\n      │\n=========\n```',
  '```\n  ┌───┐\n  │   │\n  😫  │\n /│\\  │\n /    │\n      │\n=========\n```',
  '```\n  ┌───┐\n  │   │\n  💀  │\n /│\\  │\n / \\  │\n      │\n=========\n```'
];

module.exports = {
  aliases: ['حرافة', 'hangman'],
  data: new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('🪢 لعبة تخمين الكلمة — اكتشف الكلمة قبل نفاد المحاولات')
    .addStringOption(o => o.setName('category').setDescription('الفئة').addChoices(...Object.keys(WORDS).map(k => ({name:k, value:k})))),

  async execute(interaction) {
    const cat = interaction.options.getString('category') || Object.keys(WORDS)[Math.floor(Math.random()*Object.keys(WORDS).length)];
    const word = WORDS[cat][Math.floor(Math.random()*WORDS[cat].length)];
    const guessed = new Set();
    let wrong = 0;
    const userId = interaction.user.id, guildId = interaction.guild.id;

    const display = () => Array.from(word).map(ch => ch === '_' ? ' _ ' : (guessed.has(ch) ? ` ${ch} ` : ' ❒ ')).join('');
    const isWin = () => Array.from(word).every(ch => ch === '_' || guessed.has(ch));

    const embed = (status = '') => brandedEmbed(interaction, '🪢 الحرّافة', COLORS.primary).setDescription(
      `${STAGES[wrong]}\n\n🏷️ الفئة: **${cat}**\n📝 الكلمة: \n# ${display()}\n\n` +
      `❌ أخطاء: **${wrong}/6**\n🔤 محاولات: ${[...guessed].join(' ، ') || '—'}\n${status}`
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('hm_guess').setLabel('🔤 خمّن حرفاً').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('hm_word').setLabel('💡 خمّن الكلمة').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('hm_quit').setLabel('🛑 إنهاء').setStyle(ButtonStyle.Danger)
    );

    const msg = await safeReply(interaction, { embeds: [embed()], components: [row] });

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 5*60*1000 });
    collector.on('collect', async i => {
      if (i.customId === 'hm_quit') return collector.stop('quit');
      if (i.customId === 'hm_guess' || i.customId === 'hm_word') {
        const modal = new ModalBuilder().setCustomId(`hm_modal_${i.customId === 'hm_word' ? 'word' : 'letter'}`).setTitle(i.customId === 'hm_word' ? 'خمّن الكلمة كاملة' : 'خمّن حرفاً');
        const input = new TextInputBuilder().setCustomId('val').setLabel(i.customId === 'hm_word' ? 'الكلمة' : 'حرف واحد').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(i.customId === 'hm_word' ? 30 : 2);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await i.showModal(modal);
        try {
          const sub = await i.awaitModalSubmit({ time: 60000, filter: m => m.user.id === userId });
          const val = sub.fields.getTextInputValue('val').trim();
          if (i.customId === 'hm_word') {
            if (val === word.replace(/_/g,' ') || val === word) {
              for (const ch of word) guessed.add(ch);
              await sub.deferUpdate();
              collector.stop('win');
            } else { wrong = 6; await sub.deferUpdate(); collector.stop('lose'); }
          } else {
            const ch = val[0];
            if (guessed.has(ch)) { await sub.reply({ content: 'خمنته من قبل.', ephemeral: true }); return; }
            guessed.add(ch);
            if (!word.includes(ch)) wrong++;
            await sub.deferUpdate();
            if (isWin()) collector.stop('win');
            else if (wrong >= 6) collector.stop('lose');
            else await interaction.editReply({ embeds: [embed()] }).catch(()=>{});
          }
        } catch {}
      }
    });

    collector.on('end', async (_c, reason) => {
      const { g, u } = getUser(guildId, userId);
      bumpStat(u, 'hangman_count');
      let fn = loseEmbed, title = 'انتهت اللعبة', reward = 0;
      if (reason === 'win') {
        reward = 200 + word.length * 50 - wrong * 30;
        u.balance += reward; u.xp += 30;
        bumpStat(u, 'hangman_wins');
        fn = winEmbed; title = 'أحسنت!';
      }
      saveUser(guildId, g);
      const final = fn(interaction, title, `الكلمة: **${word.replace(/_/g,' ')}**\n` + (reward ? `💰 +${fmt(reward)} ${CURRENCY} • ✨ +30 XP` : '😔 حظ أوفر!')).setFooter(balanceFooter(u));
      await interaction.editReply({ embeds: [final], components: [] }).catch(()=>{});
    });
  }
};
