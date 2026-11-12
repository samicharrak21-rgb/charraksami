const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const kit = require('../../utils/cardKit');
const {
  fmt, validateBet, saveUser, bumpStat,
  brandedEmbed, winEmbed, loseEmbed, tieEmbed,
  balanceFooter, safeReply, CURRENCY, getUser
} = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');
const { setEmbedMedia } = require('../../utils/mediaRegistry');

const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
function spin() { return Math.floor(Math.random() * 37); }
function colorOf(n) { if (n === 0) return { emoji: '🟢', name: 'أخضر' }; return RED.has(n) ? { emoji: '🔴', name: 'أحمر' } : { emoji: '⚫', name: 'أسود' }; }

function payout(bet, choice, n) {
  if (choice === 'red')   return RED.has(n) ? bet * 2 : 0;
  if (choice === 'black') return (n !== 0 && !RED.has(n)) ? bet * 2 : 0;
  if (choice === 'green') return n === 0 ? bet * 14 : 0;
  if (choice === 'odd')   return (n !== 0 && n % 2 === 1) ? bet * 2 : 0;
  if (choice === 'even')  return (n !== 0 && n % 2 === 0) ? bet * 2 : 0;
  if (choice === 'low')   return (n >= 1 && n <= 18) ? bet * 2 : 0;
  if (choice === 'high')  return (n >= 19 && n <= 36) ? bet * 2 : 0;
  return 0;
}

const LABELS = {
  red: '🔴 أحمر (×2)', black: '⚫ أسود (×2)', green: '🟢 الصفر (×14)',
  odd: '🔢 فردي (×2)', even: '🔢 زوجي (×2)',
  low: '⬇️ 1-18 (×2)', high: '⬆️ 19-36 (×2)'
};

const CHOICE_WORDS = {
  red: ['red', 'احمر', 'أحمر', 'حمراء', 'حمرا'], black: ['black', 'اسود', 'أسود', 'سوداء', 'سودا'], green: ['green', 'صفر', '0', 'اخضر', 'أخضر'],
  odd: ['odd', 'فردي', 'فرد'], even: ['even', 'زوجي', 'زوج'], low: ['low', 'صغير', 'منخفض', '1-18'], high: ['high', 'كبير', 'مرتفع', '19-36'],
};
function parseChoice(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return null;
  return Object.keys(CHOICE_WORDS).find((k) => k === v || CHOICE_WORDS[k].includes(v)) || null;
}

// Visual roulette wheel
const WHEEL = '🟢🔴⚫🔴⚫🔴⚫🔴⚫🔴⚫🟢⚫🔴⚫🔴⚫🔴⚫';
function buildWheel(spin = false) {
  if (spin) return '🎡 `' + WHEEL + '`';
  return '🎡 `' + WHEEL + '`';
}

module.exports = {
  aliases: ['روليت', 'roulette'],
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('🎡 الروليت الأوروبية — راهن على لون أو فئة')
    .addIntegerOption(o => o.setName('bet').setDescription('مبلغ الرهان').setRequired(true).setMinValue(20))
    .addStringOption(o => o.setName('choice').setDescription('نوع الرهان (اختياري — وإلا تظهر الأزرار)').addChoices(
      { name: '🔴 أحمر', value: 'red' }, { name: '⚫ أسود', value: 'black' }, { name: '🟢 صفر', value: 'green' },
      { name: 'فردي', value: 'odd' }, { name: 'زوجي', value: 'even' }, { name: '1-18', value: 'low' }, { name: '19-36', value: 'high' })),

  async execute(interaction) {
    const v = validateBet(interaction, { min: 20, defaultBet: 100 });
    if (!v.ok) return safeReply(interaction, { embeds: [v.errorEmbed], ephemeral: true });
    const { bet, g, u, guildId, userId } = v;

    const intro = brandedEmbed(interaction, '🎡 طاولة الروليت', COLORS.info)
      .setDescription(
        `💰 الرهان: **${fmt(bet)}** ${CURRENCY}\n\n` +
        `${buildWheel()}\n\n` +
        `**اختر نوع رهانك:**\n` +
        `🔴/⚫ ألوان **(×2)** • 🟢 صفر **(×14)**\n` +
        `🔢 فردي/زوجي **(×2)** • ⬇️/⬆️ نطاقات **(×2)**\n\n` +
        `⏱️ لديك **25 ثانية** للاختيار.`
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
    setEmbedMedia(intro, 'roulette', 'spin');

    const r1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rl_red').setLabel('🔴 أحمر').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('rl_black').setLabel('⚫ أسود').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rl_green').setLabel('🟢 صفر (×14)').setStyle(ButtonStyle.Success)
    );
    const r2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rl_odd').setLabel('🔢 فردي').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('rl_even').setLabel('🔢 زوجي').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('rl_low').setLabel('⬇️ 1-18').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('rl_high').setLabel('⬆️ 19-36').setStyle(ButtonStyle.Primary)
    );

    const play = async (choice, i = null) => {
      u.balance -= bet;
      saveUser(guildId, g);

      const spinning = brandedEmbed(interaction, '🎡 الكرة تدور...', COLORS.warning)
        .setDescription(`🎯 رهانك: **${LABELS[choice]}**\n💰 المبلغ: **${fmt(bet)}** ${CURRENCY}\n\n${buildWheel(true)}\n\n*⚪ الكرة تقفز بين الأرقام...*`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
      setEmbedMedia(spinning, 'roulette', 'spin');
      if (i) await i.update({ embeds: [spinning], components: [] }).catch(() => {});
      else await safeReply(interaction, { embeds: [spinning], components: [] });
      await new Promise(r => setTimeout(r, 1300));

      const n = spin();
      const c = colorOf(n);
      const win = payout(bet, choice, n);
      bumpStat(u, 'roulette_count');
      if (win > 0) { u.balance += win; u.xp += 80; bumpStat(u, 'roulette_wins'); }
      saveUser(guildId, g);

      const net = win - bet;
      const isWin = win > 0;
      const finalEmbed = isWin ? winEmbed(interaction, 'فوز يا بطل!') : loseEmbed(interaction, 'خسارة هذه المرة');
      finalEmbed.setDescription(
        `🎯 **الرقم:** \`${n}\` ${c.emoji} ${c.name} • 🎰 **رهانك:** ${LABELS[choice]}\n` +
        (isWin ? `💰 **+${fmt(net)}** ${CURRENCY} *(صافي ربح)*` : `💸 **-${fmt(bet)}** ${CURRENCY}`)
      ).setFooter(balanceFooter(u));
      setEmbedMedia(finalEmbed, 'roulette', isWin ? 'win' : 'lose');

      const files = [];
      try {
        const card = await kit.rouletteCard({
          number: n, choiceLabel: LABELS[choice], outcome: isWin ? 'win' : 'lose', bet, net: isWin ? net : -bet, balance: u.balance,
          username: interaction.member?.displayName || interaction.user.username,
          avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
        });
        if (card) { files.push(new AttachmentBuilder(card.buffer, { name: 'roulette.png' })); finalEmbed.setImage('attachment://roulette.png'); }
      } catch {}
      const again = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`roulette_play_${bet}`).setLabel('🎡 جولة أخرى').setStyle(ButtonStyle.Primary)
      );
      await interaction.editReply({ embeds: [finalEmbed], components: [again], files, attachments: [] }).catch(() => {});
    };

    // رهان مباشر من الأمر: «روليت 500 احمر»
    const direct = parseChoice(interaction.options?.getString?.('choice'));
    if (direct) return play(direct);

    const msg = await safeReply(interaction, { embeds: [intro], components: [r1, r2] });
    if (!msg?.createMessageComponentCollector) return;

    const pickCol = msg.createMessageComponentCollector({ filter: i => i.user.id === userId && i.customId.startsWith('rl_'), time: 25000, max: 1 });
    pickCol.on('collect', async i => play(i.customId.replace('rl_', ''), i));

    pickCol.on('end', c => {
      if (c.size === 0) {
        const t = tieEmbed(interaction, 'انتهى الوقت', 'لم تراهن في الوقت المحدد.');
        setEmbedMedia(t, 'roulette', 'lose');
        interaction.editReply({ embeds: [t], components: [] }).catch(() => {});
      }
    });
  }
};
