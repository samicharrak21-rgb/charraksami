// 🔮 خمن الرقم — رقم سري من 1 إلى 100، سبع محاولات، وكل ما أسرعت زادت الجائزة
const { SlashCommandBuilder } = require('discord.js');
const H = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');
const A = require('../../systems/arcade');
const K = require('../../utils/arcadeKit');
const lockInput = require('../../utils/inputLock');

const active = new Set();

module.exports = {
  category: 'games',
  aliases: ['خمن', 'خمن_الرقم', 'تخمين_الرقم'],
  cooldown: 8,
  data: new SlashCommandBuilder()
    .setName('guess')
    .setDescription('🔮 خمن الرقم من 1 إلى 100 — كل ما أسرعت زادت الجائزة (حتى ×10)')
    .addIntegerOption((o) => o.setName('bet').setDescription('الرهان (افتراضي 100)').setMinValue(10)),

  async execute(interaction) {
    const v = H.validateBet(interaction, { min: 10, defaultBet: 100 });
    if (!v.ok) return H.safeReply(interaction, { embeds: [v.errorEmbed], ephemeral: true });
    const { bet, guildId } = v;
    const userId = interaction.user.id;
    const channelId = interaction.channelId || interaction.channel?.id;
    const key = `${channelId}:${userId}`;
    if (active.has(key)) return H.safeReply(interaction, { content: '⏳ عندك لعبة تخمين شغالة هنا — كمّلها أولاً.', ephemeral: true });
    active.add(key);
    K.settle(guildId, userId, -bet);

    const target = 1 + Math.floor(Math.random() * 100);
    const tries = [];
    let low = A.GUESS.min, high = A.GUESS.max, ended = false;
    const id = `guessg_${userId}_${Date.now()}`;
    const row = (dis = false) => new K.ActionRowBuilder().addComponents(K.btn(`${id}_quit`, '🏳️ استسلام', K.ButtonStyle.Secondary, dis));
    const embed = (note) => H.brandedEmbed(interaction, '🔮 خمن الرقم', COLORS.phantom).setDescription([
      'فكّرت في رقم بين **1** و **100** — **اكتب تخمينك في الشات** 👇',
      '',
      `🎯 المحاولات: **${tries.length}/${A.GUESS.tries}**  ·  💰 الرهان: **${H.fmt(bet)}** ${H.CURRENCY}`,
      `📏 النطاق: **${low} — ${high}**  ·  ✨ الجائزة الآن: **×${A.guessMultiplier(tries.length + 1)}**`,
      tries.length ? `\n${tries.map((t) => `\`${String(t.n).padStart(3, ' ')}\`  ${t.hint.dir === 'up' ? '⬆️ أكبر' : '⬇️ أصغر'}  ·  ${t.hint.heat}`).join('\n')}` : '',
      note ? `\n${note}` : '',
    ].join('\n'));

    const msg = await H.safeReply(interaction, { embeds: [embed()], components: [row()] });
    lockInput.lock(channelId, userId, 125000);
    const channel = interaction.channel;
    const msgCol = channel.createMessageCollector({ filter: (m) => m.author.id === userId && A.toNum(m.content) !== null, time: 120000 });
    const btnCol = msg?.createMessageComponentCollector?.({ time: 120000 });

    const finish = async (outcome) => {
      if (ended) return; ended = true;
      active.delete(key); lockInput.unlock(channelId, userId);
      msgCol.stop('done'); btnCol?.stop('done');
      const win = outcome === 'win';
      const mult = win ? A.guessMultiplier(tries.length) : 0;
      const payout = Math.floor(bet * mult);
      const u = K.settle(guildId, userId, payout, { guess_count: 1, ...(win ? { guess_wins: 1 } : {}) });
      const titleTxt = win ? `صح من ${tries.length === 1 ? 'أول محاولة!' : `${tries.length} محاولات`}` : outcome === 'quit' ? 'استسلمت' : outcome === 'timeout' ? 'انتهى الوقت' : 'نفدت المحاولات';
      const e = (win ? H.winEmbed : H.loseEmbed)(interaction, `خمن الرقم — ${titleTxt}`,
        `🔢 الرقم السري: **${target}**\n${win ? `✨ المضاعف ×${mult} — 💰 **+${H.fmt(payout - bet)}** ${H.CURRENCY}` : `💸 **-${H.fmt(bet)}** ${H.CURRENCY}`}`).setFooter(H.balanceFooter(u));
      const card = await K.safeCard(() => require('../../utils/cardKit').gameResultCard({
        game: '🔮 خمن الرقم', outcome: win ? 'win' : 'lose', title: titleTxt, subtitle: `الرقم السري كان ${target}`,
        ...K.who(interaction), amount: payout - bet, balance: u.balance, bg: 'guess', icon: win ? '🎯' : '🔮',
        details: [['الرقم', String(target), '🔢'], ['المحاولات', `${tries.length}/${A.GUESS.tries}`, '🎯'], ['المضاعف', `×${mult}`, '✨']],
      }));
      await interaction.editReply(K.withCard(e, card, { components: [K.againRow(`guess_again_${bet}`, `🔁 جولة أخرى (${H.fmt(bet)})`)] })).catch(() => {});
    };

    msgCol.on('collect', async (m) => {
      if (ended) return;
      const n = A.toNum(m.content);
      if (n < A.GUESS.min || n > A.GUESS.max) return m.react('❔').catch(() => {});
      const hint = A.guessHint(target, n);
      tries.push({ n, hint });
      if (hint.dir === 'hit') { m.react('🎯').catch(() => {}); return finish('win'); }
      if (hint.dir === 'up') low = Math.max(low, n + 1); else high = Math.min(high, n - 1);
      m.react(hint.dir === 'up' ? '⬆️' : '⬇️').catch(() => {});
      if (tries.length >= A.GUESS.tries) return finish('lose');
      await interaction.editReply({ embeds: [embed()], components: [row()] }).catch(() => {});
    });
    btnCol?.on('collect', async (i) => {
      if (!i.customId.startsWith(id)) return;
      if (i.user.id !== userId) return K.notYours(i);
      await i.deferUpdate().catch(() => {});
      finish('quit');
    });
    msgCol.on('end', () => { if (!ended) finish('timeout'); });
  },
};
