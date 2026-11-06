// 🃏 بلاك جاك v19 — طاولة مرسومة بالكامل، سحب / وقوف / مضاعفة، دفع 3:2 للبلاك جاك الطبيعي
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { fmt, validateBet, saveUser, bumpStat, balanceFooter, playAgainRow, safeReply, CURRENCY } = require('../../utils/gameHelpers');
const kit = require('../../utils/cardKit');

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function newDeck() {
  const d = [];
  for (const suit of SUITS) for (const rank of RANKS) d.push({ rank, suit });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
const cardVal = (c) => (c.rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(c.rank) ? 10 : Number(c.rank));
function total(hand) {
  let t = hand.reduce((a, c) => a + cardVal(c), 0);
  let aces = hand.filter((c) => c.rank === 'A').length;
  while (t > 21 && aces--) t -= 10;
  return t;
}
const handText = (h) => h.map((c) => `\`${c.rank}${c.suit}\``).join(' ');
const COLORS = { win: 0x3ee6a0, blackjack: 0xf5c451, lose: 0xff5d73, bust: 0xff5d73, tie: 0xc9d1e0, play: 0xf5c451 };

module.exports = {
  aliases: ['بلاك', 'بلاك_جاك', 'بلاكجاك', 'bj', 'blackjack'],
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('🃏 بلاك جاك — تحدّى الموزع للوصول إلى 21')
    .addIntegerOption((o) => o.setName('bet').setDescription('مبلغ الرهان').setRequired(false).setMinValue(10)),

  async execute(interaction) {
    const val = validateBet(interaction, { min: 10, defaultBet: 100 });
    if (!val.ok) return safeReply(interaction, { embeds: [val.errorEmbed], ephemeral: true });
    const { bet, g, u, guildId, userId } = val;
    const username = interaction.member?.displayName || interaction.user.username;
    const nonce = `${userId}_${Date.now().toString(36)}`;

    u.balance -= bet;
    saveUser(guildId, g);

    const deck = newDeck();
    const player = [deck.pop(), deck.pop()];
    const dealer = [deck.pop(), deck.pop()];
    let stake = bet;

    const view = async (status, extra = '') => {
      const reveal = !!status;
      const e = new EmbedBuilder()
        .setColor(COLORS[status || 'play'])
        .setAuthor({ name: `${username} • بلاك جاك`, iconURL: interaction.user.displayAvatarURL() })
        .setFooter(balanceFooter(u));
      const lines = [
        `**الموزّع:** ${reveal ? `${handText(dealer)} — **${total(dealer)}**` : `${handText([dealer[0]])} \`??\``}`,
        `**يدك:** ${handText(player)} — **${total(player)}**`,
        `**الرهان:** ${fmt(stake)} ${CURRENCY}`,
      ];
      if (extra) lines.push('', extra);
      e.setDescription(lines.join('\n'));
      const payload = { embeds: [e], files: [], attachments: [] };
      try {
        const card = await kit.blackjackCard({
          username, bet: stake, player, dealer, playerTotal: total(player), dealerTotal: total(dealer),
          hideDealer: !reveal, status,
        });
        if (card) { payload.files = [new AttachmentBuilder(card.buffer, { name: 'blackjack.png' })]; e.setImage('attachment://blackjack.png'); }
      } catch {}
      return payload;
    };

    const controls = (canDouble) => new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bjx_hit_${nonce}`).setLabel('سحب').setEmoji('🃏').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`bjx_stand_${nonce}`).setLabel('وقوف').setEmoji('✋').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`bjx_double_${nonce}`).setLabel('مضاعفة').setEmoji('✖️').setStyle(ButtonStyle.Primary).setDisabled(!canDouble),
    );
    const again = () => playAgainRow(`bj_again_${bet}`, '🃏 جولة أخرى');

    const settle = () => {
      while (total(dealer) < 17) dealer.push(deck.pop());
      const p = total(player), d = total(dealer);
      if (p > 21) return { status: 'bust', payout: 0 };
      if (d > 21 || p > d) return { status: 'win', payout: stake * 2 };
      if (p === d) return { status: 'tie', payout: stake };
      return { status: 'lose', payout: 0 };
    };
    const finish = ({ status, payout }) => {
      u.balance += payout;
      bumpStat(u, 'bj_count');
      if (payout > stake) bumpStat(u, 'bj_wins');
      saveUser(guildId, g);
      const net = payout - stake;
      const msg = {
        win: `🏆 فزت! **+${fmt(net)}** ${CURRENCY}`,
        blackjack: `🌟 بلاك جاك طبيعي! **+${fmt(net)}** ${CURRENCY} (3:2)`,
        tie: '🤝 تعادل — استرجعت رهانك.',
        lose: `💸 الموزّع فاز. **-${fmt(stake)}** ${CURRENCY}`,
        bust: `💥 تجاوزت 21! **-${fmt(stake)}** ${CURRENCY}`,
      }[status];
      return view(status, msg);
    };

    // بلاك جاك طبيعي
    if (total(player) === 21) {
      const dealerBJ = total(dealer) === 21;
      const res = dealerBJ ? { status: 'tie', payout: stake } : { status: 'blackjack', payout: Math.floor(stake * 2.5) };
      return safeReply(interaction, { ...(await finish(res)), components: [again()] });
    }

    const msg = await safeReply(interaction, { ...(await view(null)), components: [controls(u.balance >= stake)] });
    if (!msg?.createMessageComponentCollector) return;

    const collector = msg.createMessageComponentCollector({ filter: (i) => i.customId.endsWith(nonce), time: 120000 });
    let done = false;

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) return i.reply({ content: '❌ هذه ليست طاولتك. ابدأ لعبتك بأمر `بلاك`.', ephemeral: true }).catch(() => {});
      if (done) return i.deferUpdate().catch(() => {});
      const action = i.customId.split('_')[1];
      await i.deferUpdate().catch(() => {});

      if (action === 'double') {
        if (u.balance < stake) return i.followUp({ content: '❌ رصيدك لا يكفي للمضاعفة.', ephemeral: true }).catch(() => {});
        u.balance -= stake; stake *= 2; saveUser(guildId, g);
        player.push(deck.pop());
        done = true; collector.stop('done');
        const res = total(player) > 21 ? { status: 'bust', payout: 0 } : settle();
        return interaction.editReply({ ...(await finish(res)), components: [again()] }).catch(() => {});
      }
      if (action === 'hit') {
        player.push(deck.pop());
        const p = total(player);
        if (p > 21 || p === 21) {
          done = true; collector.stop('done');
          const res = p > 21 ? { status: 'bust', payout: 0 } : settle();
          return interaction.editReply({ ...(await finish(res)), components: [again()] }).catch(() => {});
        }
        return interaction.editReply({ ...(await view(null)), components: [controls(false)] }).catch(() => {});
      }
      if (action === 'stand') {
        done = true; collector.stop('done');
        return interaction.editReply({ ...(await finish(settle())), components: [again()] }).catch(() => {});
      }
    });

    collector.on('end', async (_c, reason) => {
      if (done || reason === 'done') return;
      // انتهى الوقت: وقوف تلقائي بدلاً من ضياع الرهان
      done = true;
      const payload = await finish(settle());
      payload.embeds[0].setDescription(payload.embeds[0].data.description + '\n\n⏰ انتهى الوقت — تم الوقوف تلقائياً.');
      interaction.editReply({ ...payload, components: [again()] }).catch(() => {});
    });
  },
};
