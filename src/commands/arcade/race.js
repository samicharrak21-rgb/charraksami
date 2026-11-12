// 🐪 سباق الهجن — راهن على هجين من أربعة وشاهد السباق مباشرة (الفوز ×3.5)
const { SlashCommandBuilder } = require('discord.js');
const H = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');
const A = require('../../systems/arcade');
const K = require('../../utils/arcadeKit');
const cards = require('../../utils/arcadeCards');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lane = (pos) => {
  const n = 14, at = Math.min(n, Math.round((pos / A.RACE_LEN) * n));
  return `${'▰'.repeat(at)}${'▱'.repeat(n - at)}`;
};

module.exports = {
  category: 'games',
  aliases: ['سباق', 'هجن', 'سباق_الهجن', 'جمال'],
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('race')
    .setDescription('🐪 سباق الهجن — اختر هجيناً من 4 وراهن عليه (الفوز ×3.5)')
    .addIntegerOption((o) => o.setName('bet').setDescription('الرهان (افتراضي 200)').setMinValue(10))
    .addIntegerOption((o) => o.setName('racer').setDescription('رقم الهجين').addChoices(
      ...A.RACERS.map((r) => ({ name: `${r.id}. ${r.name}`, value: r.id })))),

  async execute(interaction) {
    const v = H.validateBet(interaction, { min: 10, defaultBet: 200 });
    if (!v.ok) return H.safeReply(interaction, { embeds: [v.errorEmbed], ephemeral: true });
    const { bet, guildId } = v;
    const userId = interaction.user.id;
    let pick = interaction.options?.getInteger?.('racer');
    const fromBtn = interaction.customId?.match(/^race_again_(\d)_/);
    if (fromBtn) pick = Number(fromBtn[1]);
    if (!A.RACERS.some((r) => r.id === pick)) pick = null;

    const id = `raceg_${userId}_${Date.now()}`;
    let target = interaction; // من سيُعدَّل عليه الرد

    if (!pick) {
      const row = new K.ActionRowBuilder().addComponents(...A.RACERS.map((r) => K.btn(`${id}_p_${r.id}`, `${r.id}. ${r.name}`, K.ButtonStyle.Secondary, false, r.emoji)));
      const e = H.brandedEmbed(interaction, '🐪 سباق الهجن — اختر هجينك', COLORS.primary)
        .setDescription(`💰 الرهان: **${H.fmt(bet)}** ${H.CURRENCY}\n🏆 الفوز: **×${A.RACE_PAYOUT}** (${H.fmt(Math.floor(bet * A.RACE_PAYOUT))} ${H.CURRENCY})\n\n${A.RACERS.map((r) => `${r.emoji} **${r.id}. ${r.name}**`).join('\n')}\n\n⏱️ عندك 30 ثانية للاختيار`);
      const msg = await H.safeReply(interaction, { embeds: [e], components: [row] });
      const choice = await msg?.awaitMessageComponent?.({ filter: (i) => i.customId.startsWith(id) && (i.user.id === userId || (K.notYours(i), false)), time: 30000 }).catch(() => null);
      if (!choice) return interaction.editReply({ components: [] }).catch(() => {});
      pick = Number(choice.customId.split('_').pop());
      await choice.deferUpdate().catch(() => {});
    }

    const { u: fresh } = H.getUser(guildId, userId);
    if (fresh.balance < bet) return interaction.editReply({ embeds: [H.errorEmbed('رصيد غير كافٍ', `تحتاج **${H.fmt(bet)}** ${H.CURRENCY}.`)], components: [] }).catch(() => {});
    K.settle(guildId, userId, -bet);

    const sim = A.simulateRace();
    const mine = A.RACERS.find((r) => r.id === pick);
    const frameIdx = [...new Set([0, Math.floor(sim.frames.length * 0.33), Math.floor(sim.frames.length * 0.66), sim.frames.length - 1])];
    for (const fi of frameIdx.slice(0, -1)) {
      const pos = sim.frames[fi];
      const e = H.brandedEmbed(interaction, '🏁 السباق بدأ!', COLORS.warning).setDescription(
        `اخترت: ${mine.emoji} **${mine.name}** · 💰 ${H.fmt(bet)} ${H.CURRENCY}\n\n` +
        A.RACERS.map((r, i) => `${r.id === pick ? '⭐' : '▫️'} \`${lane(pos[i])}\` ${r.emoji} **${r.name}**`).join('\n'));
      const payload = { embeds: [e], components: [], attachments: [] };
      if (fi === 0 && target === interaction && !interaction.replied && !interaction.deferred) await H.safeReply(interaction, payload);
      else await interaction.editReply(payload).catch(() => {});
      await sleep(1300);
    }

    const payout = A.racePayout(bet, pick, sim.winner);
    const win = payout > 0;
    const u = K.settle(guildId, userId, payout, { race_count: 1, ...(win ? { race_wins: 1 } : {}) });
    const w = A.RACERS.find((r) => r.id === sim.winner);
    const e = (win ? H.winEmbed : H.loseEmbed)(interaction, win ? `فاز ${mine.name}!` : `فاز ${w.name}`,
      `${sim.order.map((rid, i) => `${['🥇', '🥈', '🥉', '4️⃣'][i]} ${A.RACERS.find((r) => r.id === rid).name}`).join('  ·  ')}\n\n` +
      (win ? `💰 **+${H.fmt(payout - bet)}** ${H.CURRENCY}` : `💸 **-${H.fmt(bet)}** ${H.CURRENCY}`)).setFooter(H.balanceFooter(u));
    const card = await K.safeCard(() => cards.raceCard({ racers: A.RACERS, positions: sim.frames[sim.frames.length - 1], length: A.RACE_LEN, pick, winner: sim.winner, order: sim.order, bet, net: payout - bet, ...K.who(interaction) }));
    await interaction.editReply(K.withCard(e, card, { components: [K.againRow(`race_again_${pick}_${bet}`, `🔁 نفس الهجين (${mine.name})`)] })).catch(() => {});
  },
};
