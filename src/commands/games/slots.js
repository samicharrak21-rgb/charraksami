const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const {
  fmt, validateBet, saveUser, bumpStat,
  brandedEmbed, winEmbed, loseEmbed,
  balanceFooter, playAgainRow, safeReply, CURRENCY
} = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');
const { setEmbedMedia } = require('../../utils/mediaRegistry');

const SYMBOLS = [
  { s: '💎', w: 2,  m: 50,  name: 'الجوهرة الكبرى',   color: 0x00FFFF },
  { s: '7️⃣', w: 5,  m: 15,  name: 'السباعية الذهبية', color: 0xF1C40F },
  { s: '🔔', w: 8,  m: 10,  name: 'جرس الحظ',          color: 0xE67E22 },
  { s: '🍇', w: 12, m: 6,   name: 'عنقود العنب',        color: 0x9B59B6 },
  { s: '🍊', w: 18, m: 4,   name: 'البرتقال',           color: 0xE74C3C },
  { s: '🍋', w: 22, m: 3,   name: 'الليمون',            color: 0xF1C40F },
  { s: '🍒', w: 33, m: 2,   name: 'الكرز',              color: 0xE74C3C }
];
const TOTAL_W = SYMBOLS.reduce((a, b) => a + b.w, 0);

function spin() {
  let r = Math.random() * TOTAL_W;
  for (const it of SYMBOLS) { if (r < it.w) return it; r -= it.w; }
  return SYMBOLS[SYMBOLS.length - 1];
}

function reelBox(symbols) {
  const top    = '╔═══╦═══╦═══╗';
  const mid    = `║ ${symbols.map(x => x.s || x).join(' ║ ')} ║`;
  const bottom = '╚═══╩═══╩═══╝';
  return `\`\`\`\n${top}\n${mid}\n${bottom}\n\`\`\``;
}

const REEL_SPINNERS = ['🎲', '❓', '🔄'];

module.exports = {
  aliases: ['سلوتس', 'slots'],
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('🎰 ماكينة الحظ — جرّب حظك واربح الجائزة الكبرى!')
    .addIntegerOption(o => o.setName('bet').setDescription('مبلغ الرهان').setRequired(false).setMinValue(10)),

  async execute(interaction) {
    const v = validateBet(interaction, { min: 10, defaultBet: 100 });
    if (!v.ok) return safeReply(interaction, { embeds: [v.errorEmbed], ephemeral: true });
    const { bet, g, u, guildId } = v;

    u.balance -= bet;
    saveUser(guildId, g);

    // ─── Spinning Intro ──────────────────────────────────
    const intro = brandedEmbed(interaction, '🎰 ماكينة الحظ', COLORS.primary)
      .setDescription(
        `💰 الرهان: **${fmt(bet)}** ${CURRENCY}\n\n` +
        reelBox(REEL_SPINNERS) +
        `\n*🎲 تدور البكرات...*`
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
    setEmbedMedia(intro, 'slots', 'spin');

    await safeReply(interaction, { embeds: [intro], components: [] });
    await new Promise(r => setTimeout(r, 700));

    const reels = [spin(), spin(), spin()];

    // ─── Reveal Step 1 ───────────────────────────────────
    const mid1 = brandedEmbed(interaction, '🎰 ماكينة الحظ', COLORS.primary)
      .setDescription(`💰 الرهان: **${fmt(bet)}** ${CURRENCY}\n\n` + reelBox([reels[0].s, '🎲', '🎲']) + `\n*🎲 يدور...*`)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
    setEmbedMedia(mid1, 'slots', 'spin');
    await interaction.editReply({ embeds: [mid1] }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));

    // ─── Reveal Step 2 ───────────────────────────────────
    const mid2 = brandedEmbed(interaction, '🎰 ماكينة الحظ', COLORS.primary)
      .setDescription(`💰 الرهان: **${fmt(bet)}** ${CURRENCY}\n\n` + reelBox([reels[0].s, reels[1].s, '🎲']) + `\n*🎲 الأخيرة...*`)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
    setEmbedMedia(mid2, 'slots', 'spin');
    await interaction.editReply({ embeds: [mid2] }).catch(() => {});
    await new Promise(r => setTimeout(r, 700));

    // ─── Calculate Result ─────────────────────────────────
    const allSame = reels[0].s === reels[1].s && reels[1].s === reels[2].s;
    const twoSame = (reels[0].s === reels[1].s) || (reels[1].s === reels[2].s) || (reels[0].s === reels[2].s);

    let multiplier = 0, winType = '';
    if (allSame)   { multiplier = reels[0].m; winType = `🌟 **${reels[0].name}** الثلاثية!`; }
    else if (twoSame) { multiplier = 1.5;  winType = '✨ ثنائية متطابقة'; }

    const winAmount = Math.floor(bet * multiplier);
    u.balance += winAmount;
    bumpStat(u, 'slots_count');
    if (multiplier > 0) bumpStat(u, 'slots_wins');
    saveUser(guildId, g);

    // ─── Final Embed ──────────────────────────────────────
    const isWin = multiplier > 0;
    const isJackpot = allSame && multiplier >= 15;

    let finalEmbed;
    if (isJackpot) {
      finalEmbed = new EmbedBuilder()
        .setColor(reels[0].color || 0xF1C40F)
        .setTitle(`🌟 جاكبوت أسطوري! — ${reels[0].name}`)
        .setTimestamp();
      setEmbedMedia(finalEmbed, 'slots', 'jackpot');
    } else if (isWin) {
      finalEmbed = winEmbed(interaction, 'فوز!', '', 'slots');
      setEmbedMedia(finalEmbed, 'slots', 'win');
    } else {
      finalEmbed = loseEmbed(interaction, 'حظاً أوفر!', '', 'slots');
      setEmbedMedia(finalEmbed, 'slots', 'lose');
    }

    finalEmbed
      .setDescription(
        reelBox(reels.map(r => r.s)) +
        (isWin
          ? `\n${winType}\n💰 **+${fmt(winAmount)}** ${CURRENCY}  *(×${multiplier})*`
          : `\n💸 لم يحالفك الحظ!\n الخسارة: **-${fmt(bet)}** ${CURRENCY}`)
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter(balanceFooter(u));

    const row = playAgainRow(`slots_again_${bet}`, '🎰 جولة أخرى');
    const files = [];
    try {
      const card = await require('../../utils/cardKit').gameResultCard({
        game: 'ماكينة الحظ', outcome: isWin ? 'win' : 'lose',
        title: isJackpot ? 'جاكبوت' : isWin ? 'فوز' : 'حظاً أوفر',
        subtitle: reels.map((r) => r.s).join('   '),
        username: interaction.member?.displayName || interaction.user.username,
        avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
        amount: isWin ? winAmount - bet : -bet, balance: u.balance,
        details: [['الرهان', fmt(bet)], ['المضاعف', `x${multiplier}`], ['النتيجة', isWin ? (allSame ? 'ثلاثية' : 'ثنائية') : '—']],
      });
      if (card) { files.push(new AttachmentBuilder(card.buffer, { name: 'slots.png' })); finalEmbed.setImage('attachment://slots.png'); }
    } catch {}
    await safeReply(interaction, { embeds: [finalEmbed], components: [row], files, attachments: [] });
  }
};
