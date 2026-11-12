// وردل عربي — 5 أحرف، 6 محاولات، نظام تلوين دقيق
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { fmt, getUser, saveUser, bumpStat, brandedEmbed, winEmbed, loseEmbed, balanceFooter, safeReply, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');

// كلمات من 5 أحرف عربية (بدون شدة/همزات معقدة)
const WORDS = ['كتاب','مدرس','قمر','شجرة','بحر','نجمة','جبل','وردة','ثلج','مطر',
  'عصفور','نسر','حصان','جمل','أرنب','ذئب','نخلة','تفاح','عنب','رمان',
  'سمكة','حوت','نمل','فراش','أرز','قمح','شعير','زيت','سكر','ملح',
  'قلم','ورق','كرسي','طاول','نافذ','باب','جدار','سقف','أرض','شارع',
  'سيار','طائر','قارب','مركب','جسر','نفق','مدن','قرى','شعب','وطن'].filter(w => w.length === 5);

function colorize(guess, target) {
  const result = Array(5).fill('⬛');
  const targetArr = target.split('');
  // greens
  for (let i = 0; i < 5; i++) if (guess[i] === targetArr[i]) { result[i] = '🟩'; targetArr[i] = null; }
  // yellows
  for (let i = 0; i < 5; i++) if (result[i] === '⬛') {
    const idx = targetArr.indexOf(guess[i]);
    if (idx !== -1) { result[i] = '🟨'; targetArr[idx] = null; }
  }
  return result.join('') + ' ` ' + guess.split('').reverse().join(' ') + ' `';
}

module.exports = {
  aliases: ['وردل', 'wordle'],
  data: new SlashCommandBuilder().setName('wordle').setDescription('🟩 وردل العربي — خمّن الكلمة بـ5 أحرف خلال 6 محاولات'),

  async execute(interaction) {
    const target = WORDS[Math.floor(Math.random() * WORDS.length)];
    const guesses = [];
    const userId = interaction.user.id, guildId = interaction.guild.id;

    const embed = () => brandedEmbed(interaction, '🟩 وردل', COLORS.success).setDescription(
      `**خمّن كلمة من 5 أحرف عربية**\n` +
      `🟩 = حرف صحيح في مكانه\n🟨 = حرف صحيح في مكان خاطئ\n⬛ = حرف غير موجود\n\n` +
      (guesses.length ? guesses.join('\n') : '*لا توجد محاولات بعد*') +
      `\n\nمحاولات: **${guesses.length}/6**`
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('wd_guess').setLabel('✏️ محاولة').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('wd_quit').setLabel('🛑 استسلام').setStyle(ButtonStyle.Danger)
    );

    const msg = await safeReply(interaction, { embeds: [embed()], components: [row] });
    const col = msg.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 10*60*1000 });
    col.on('collect', async i => {
      if (i.customId === 'wd_quit') return col.stop('quit');
      const modal = new ModalBuilder().setCustomId('wd_m').setTitle('أدخل كلمة من 5 أحرف');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('w').setLabel('الكلمة').setStyle(TextInputStyle.Short).setMinLength(5).setMaxLength(5).setRequired(true)
      ));
      await i.showModal(modal);
      try {
        const sub = await i.awaitModalSubmit({ time: 60000, filter: m => m.user.id === userId });
        const w = sub.fields.getTextInputValue('w').trim();
        if (w.length !== 5) { await sub.reply({ content: '❌ يجب أن تكون 5 أحرف.', ephemeral: true }); return; }
        guesses.push(colorize(w, target));
        await sub.deferUpdate();
        if (w === target) col.stop('win');
        else if (guesses.length >= 6) col.stop('lose');
        else await interaction.editReply({ embeds: [embed()] }).catch(()=>{});
      } catch {}
    });
    col.on('end', async (_c, reason) => {
      const { g, u } = getUser(guildId, userId);
      bumpStat(u, 'wordle_count');
      let fn = loseEmbed, title = 'انتهت', reward = 0;
      if (reason === 'win') { reward = 600 - guesses.length * 80; u.balance += reward; u.xp += 50; bumpStat(u, 'wordle_wins'); fn = winEmbed; title = `أحسنت في ${guesses.length} محاولات!`; }
      saveUser(guildId, g);
      await interaction.editReply({ embeds: [fn(interaction, title, `الكلمة: **${target}**\n${guesses.join('\n') || '—'}\n\n` + (reward ? `💰 +${fmt(reward)} ${CURRENCY} • ✨ +50 XP` : '')).setFooter(balanceFooter(u))], components: [] }).catch(()=>{});
    });
  }
};
