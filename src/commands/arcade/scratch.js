// 🎟️ بطاقة الكشط — اكشط 9 خانات، ثلاثة رموز متطابقة = فوز حتى ×20
const { SlashCommandBuilder } = require('discord.js');
const H = require('../../utils/gameHelpers');
const A = require('../../systems/arcade');
const K = require('../../utils/arcadeKit');
const cards = require('../../utils/arcadeCards');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  category: 'games',
  aliases: ['كشط', 'اكشط', 'بطاقه_كشط', 'سكراتش'],
  cooldown: 6,
  data: new SlashCommandBuilder()
    .setName('scratch')
    .setDescription('🎟️ بطاقة الكشط — 3 رموز متطابقة تربح حتى ×20')
    .addIntegerOption((o) => o.setName('bet').setDescription('سعر البطاقة (افتراضي 200)').setMinValue(10)),

  async execute(interaction) {
    const v = H.validateBet(interaction, { min: 10, defaultBet: 200 });
    if (!v.ok) return H.safeReply(interaction, { embeds: [v.errorEmbed], ephemeral: true });
    const { bet, guildId } = v;
    const userId = interaction.user.id;
    K.settle(guildId, userId, -bet);

    const cells = A.makeScratch();
    const revealed = [];
    const id = `scrg_${userId}_${Date.now()}`;
    let ended = false;

    const grid = (dis = false) => {
      const rows = [];
      for (let r = 0; r < 3; r++) {
        rows.push(new K.ActionRowBuilder().addComponents(...[0, 1, 2].map((c) => {
          const i = r * 3 + c, open = revealed.includes(i);
          return K.btn(`${id}_c_${i}`, open ? '\u200b' : `${i + 1}`, open ? K.ButtonStyle.Success : K.ButtonStyle.Secondary, dis || open, open ? cells[i] : '🟨');
        })));
      }
      rows.push(new K.ActionRowBuilder().addComponents(K.btn(`${id}_all`, 'اكشف الكل', K.ButtonStyle.Primary, dis, '✨')));
      return rows;
    };
    const intro = H.brandedEmbed(interaction, '🎟️ بطاقة الكشط', COLORS.primary)
      .setDescription(`💰 سعر البطاقة: **${H.fmt(bet)}** ${H.CURRENCY}\nاضغط على الخانات لكشطها — **3 رموز متطابقة = فوز**\n💎 ×20 · 👑 ×8 · 🍀 ×4 · 🍒 ×2 · 🪙 ×1`);
    const first = await K.safeCard(() => cards.scratchCard({ cells, revealed, bet, ...K.who(interaction) }));
    const msg = await H.safeReply(interaction, K.withCard(intro, first, { components: grid() }));
    const col = msg?.createMessageComponentCollector?.({ idle: 60000, time: 3 * 60000 });
    if (!col) return;

    const finish = async (i) => {
      if (ended) return; ended = true; col.stop('done');
      const result = A.scratchResult(cells);
      const payout = Math.floor(bet * result.mult);
      const u = K.settle(guildId, userId, payout, { scratch_count: 1, ...(payout > 0 ? { scratch_wins: 1 } : {}) });
      const e = (payout > 0 ? H.winEmbed : H.loseEmbed)(interaction, payout > 0 ? `بطاقة الكشط — ${result.symbol} ${result.name} ×${result.mult}` : 'بطاقة الكشط — لا يوجد تطابق',
        payout > 0 ? `💰 **+${H.fmt(payout - bet)}** ${H.CURRENCY} (ربحت ${H.fmt(payout)})` : `💸 **-${H.fmt(bet)}** ${H.CURRENCY}`).setFooter(H.balanceFooter(u));
      const card = await K.safeCard(() => cards.scratchCard({ cells, revealed: [...Array(9).keys()], done: true, result, bet, net: payout - bet, ...K.who(interaction) }));
      const p = K.withCard(e, card, { components: [K.againRow(`scratch_again_${bet}`, `🔁 بطاقة جديدة (${H.fmt(bet)})`)] });
      if (i) await i.update(p).catch(() => interaction.editReply(p).catch(() => {}));
      else await interaction.editReply(p).catch(() => {});
    };

    col.on('collect', async (i) => {
      if (!i.customId.startsWith(id) || ended) return;
      if (i.user.id !== userId) return K.notYours(i);
      const act = i.customId.slice(id.length + 1);
      if (act === 'all') return finish(i);
      const idx = Number(act.split('_')[1]);
      if (!revealed.includes(idx)) revealed.push(idx);
      if (revealed.length >= 9) return finish(i);
      await i.update({ components: grid() }).catch(() => {});
    });
    col.on('end', () => { if (!ended) finish(null); });
  },
};
