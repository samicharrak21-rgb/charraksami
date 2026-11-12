// 🚀 الصاروخ — المضاعف يرتفع كل ثانية ونصف؛ اسحب قبل أن ينفجر (أو حدد سحباً تلقائياً)
const { SlashCommandBuilder } = require('discord.js');
const H = require('../../utils/gameHelpers');
const A = require('../../systems/arcade');
const K = require('../../utils/arcadeKit');
const cards = require('../../utils/arcadeCards');
const { COLORS } = require('../../utils/embeds');

const TICK = 1500;
const meter = (m) => { const n = Math.min(12, Math.max(1, Math.round(Math.log2(m) * 4) + 1)); return '🟧'.repeat(n) + '⬛'.repeat(12 - n); };

module.exports = {
  category: 'games',
  aliases: ['صاروخ', 'كراش', 'الصاروخ', 'انفجار'],
  cooldown: 8,
  data: new SlashCommandBuilder()
    .setName('crash')
    .setDescription('🚀 الصاروخ — اسحب أرباحك قبل أن ينفجر (حتى ×50)')
    .addIntegerOption((o) => o.setName('bet').setDescription('الرهان (افتراضي 200)').setMinValue(10))
    .addNumberOption((o) => o.setName('auto').setDescription('سحب تلقائي عند مضاعف (مثلاً 2)').setMinValue(1.1).setMaxValue(50)),

  async execute(interaction) {
    const v = H.validateBet(interaction, { min: 10, defaultBet: 200 });
    if (!v.ok) return H.safeReply(interaction, { embeds: [v.errorEmbed], ephemeral: true });
    const { bet, guildId } = v;
    const userId = interaction.user.id;
    let auto = Number(interaction.options?.getNumber?.('auto')) || null;
    if (auto && (auto < 1.1 || auto === bet)) auto = null; // النص «صاروخ 500» يعطي نفس الرقم مرتين
    if (auto) auto = Math.min(50, auto);
    K.settle(guildId, userId, -bet);

    const point = A.crashPoint();
    const visible = A.crashVisible(point);
    const id = `crg_${userId}_${Date.now()}`;
    let step = 0, ended = false, timer = null;
    const mult = () => visible[step] || 1;

    const live = () => H.brandedEmbed(interaction, '🚀 الصاروخ ينطلق!', COLORS.warning).setDescription(
      `# ×${mult().toFixed(2)}\n${meter(mult())}\n\n💰 الرهان: **${H.fmt(bet)}** ${H.CURRENCY} · الربح الآن: **${H.fmt(Math.floor(bet * mult()))}**` +
      (auto ? `\n🤖 سحب تلقائي عند **×${auto}**` : '\n⚠️ اضغط **اسحب** قبل الانفجار!'));
    const row = (dis = false) => [new K.ActionRowBuilder().addComponents(K.btn(`${id}_cash`, `اسحب ${H.fmt(Math.floor(bet * mult()))}`, K.ButtonStyle.Success, dis, '💰'))];

    const msg = await H.safeReply(interaction, { embeds: [live()], components: row() });
    const col = msg?.createMessageComponentCollector?.({ time: 60000 });

    const finish = async (i, cashed) => {
      if (ended) return; ended = true; clearTimeout(timer); col?.stop('done');
      const m = cashed ? mult() : 0;
      const payout = cashed ? A.crashPayout(bet, m) : 0;
      const u = K.settle(guildId, userId, payout, { crash_count: 1, ...(cashed ? { crash_wins: 1 } : {}) });
      const e = (cashed ? H.winEmbed : H.loseEmbed)(interaction, cashed ? `الصاروخ — سحبت عند ×${m.toFixed(2)}` : `الصاروخ — انفجر عند ×${point.toFixed(2)} 💥`,
        cashed ? `💰 **+${H.fmt(payout - bet)}** ${H.CURRENCY}\n💥 كان سينفجر عند ×${point.toFixed(2)}` : `💸 **-${H.fmt(bet)}** ${H.CURRENCY}`).setFooter(H.balanceFooter(u));
      const card = await K.safeCard(() => cards.crashCard({ steps: visible.slice(0, step + 1).concat(cashed ? [] : [point]), mult: mult(), crashed: !cashed, cashed: cashed ? m : null, point, bet, net: payout - bet, ...K.who(interaction) }));
      const p = K.withCard(e, card, { components: [K.againRow(`crash_again_${bet}`, `🔁 إطلاق جديد (${H.fmt(bet)})`)] });
      if (i) await i.update(p).catch(() => interaction.editReply(p).catch(() => {}));
      else await interaction.editReply(p).catch(() => {});
    };

    const tick = async () => {
      if (ended) return;
      if (step + 1 >= visible.length) return finish(null, false);
      step += 1;
      if (auto && mult() >= auto) return finish(null, true);
      await interaction.editReply({ embeds: [live()], components: row() }).catch(() => {});
      timer = setTimeout(tick, TICK);
    };
    col?.on('collect', async (i) => {
      if (!i.customId.startsWith(id)) return;
      if (i.user.id !== userId) return K.notYours(i);
      if (ended) return i.deferUpdate().catch(() => {});
      finish(i, true);
    });
    timer = setTimeout(tick, TICK);
  },
};
