const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { fmt, validateBet, saveUser, bumpStat, brandedEmbed, winEmbed, loseEmbed, playAgainRow, balanceFooter, safeReply, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');
const { setEmbedMedia } = require('../../utils/mediaRegistry');

const COIN_SIDES = {
  h: { name: 'صورة 🪙', emoji: '🪙', color: 0xF1C40F },
  t: { name: 'كتابة 💰', emoji: '💰', color: 0x95A5A6 }
};

// Coin flip ASCII art
function coinArt(side) {
  if (side === 'h') return `\`\`\`\n  ╭───────╮\n  │  👑   │\n  │ HEADS │\n  ╰───────╯\n\`\`\``;
  return       `\`\`\`\n  ╭───────╮\n  │  💰   │\n  │ TAILS │\n  ╰───────╯\n\`\`\``;
}
function coinSpin() {
  return `\`\`\`\n  ╭───────╮\n  │  🌀   │\n  │  ???  │\n  ╰───────╯\n\`\`\``;
}

module.exports = {
  aliases: ['عملة','coinflip','flip'],
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('🪙 رمي العملة — صورة أم كتابة؟')
    .addStringOption(o => o.setName('side').setDescription('اختر الوجه').setRequired(true)
      .addChoices({ name: '🪙 صورة', value: 'h' }, { name: '💰 كتابة', value: 't' }))
    .addIntegerOption(o => o.setName('bet').setDescription('الرهان').setMinValue(10).setRequired(true)),

  async execute(interaction) {
    const v = validateBet(interaction);
    if (!v.ok) return safeReply(interaction, { embeds: [v.errorEmbed], ephemeral: true });
    const { bet, g, u, guildId } = v;

    // For replay buttons, no options available — keep same side from customId or random
    let pick = interaction.options?.getString?.('side');
    if (!pick && interaction.customId?.startsWith('coinflip_again_')) {
      pick = Math.random() < 0.5 ? 'h' : 't';
    }
    if (!pick) pick = 'h';
    const pickSide = COIN_SIDES[pick];

    // ─── Spinning Animation ──────────────────────────────
    const spinEmbed = brandedEmbed(interaction, '🪙 رمي العملة', COLORS.warning)
      .setDescription(
        `اخترت: **${pickSide.name}**\n` +
        `الرهان: **${fmt(bet)}** ${CURRENCY}\n\n` +
        coinSpin() +
        `\n*🌀 تدور في الهواء...*`
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
    setEmbedMedia(spinEmbed, 'coinflip', 'flip');
    await safeReply(interaction, { embeds: [spinEmbed], components: [] });
    await new Promise(r => setTimeout(r, 1200));

    // ─── Result ───────────────────────────────────────────
    const result = Math.random() < 0.5 ? 'h' : 't';
    const resultSide = COIN_SIDES[result];
    const win = pick === result;
    if (win) u.balance += bet; else u.balance -= bet;
    bumpStat(u, 'coinflip_count');
    if (win) bumpStat(u, 'coinflip_wins');
    saveUser(guildId, g);

    const finalEmbed = win
      ? winEmbed(interaction, `فوز! ${resultSide.emoji}`)
      : loseEmbed(interaction, `خسارة! ${resultSide.emoji}`);

    finalEmbed.setDescription(
      `اخترت: **${pickSide.name}**\n` +
      `العملة: **${resultSide.name}**\n\n` +
      coinArt(result) +
      (win
        ? `\n✅ **تطابق!** — 💰 **+${fmt(bet)}** ${CURRENCY}`
        : `\n❌ **لم يتطابق!** — 💸 **-${fmt(bet)}** ${CURRENCY}`)
    )
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setFooter(balanceFooter(u));

    setEmbedMedia(finalEmbed, 'coinflip', win ? 'win' : 'lose');

    const files = [];
    try {
      const card = await require('../../utils/cardKit').gameResultCard({
        game: 'رمي العملة', outcome: win ? 'win' : 'lose', title: win ? 'تطابق' : 'لم يتطابق',
        subtitle: `اخترت ${pickSide.name.split(' ')[0]} · ظهرت ${resultSide.name.split(' ')[0]}`,
        username: interaction.member?.displayName || interaction.user.username,
        avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
        amount: win ? bet : -bet, balance: u.balance,
      });
      if (card) { files.push(new AttachmentBuilder(card.buffer, { name: 'coin.png' })); finalEmbed.setImage('attachment://coin.png'); }
    } catch {}
    const msg = await safeReply(interaction, {
      files, attachments: [],
      embeds: [finalEmbed],
      components: [playAgainRow(`coinflip_again_${bet}`, '🔁 جولة أخرى')]
    });
  }
};
