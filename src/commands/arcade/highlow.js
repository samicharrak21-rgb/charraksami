// 🃏 أعلى أو أقل — خمن الورقة التالية، كل تخمين صحيح يرفع المضاعف، واسحب قبل أن تخسر
const { SlashCommandBuilder } = require('discord.js');
const H = require('../../utils/gameHelpers');
const A = require('../../systems/arcade');
const K = require('../../utils/arcadeKit');
const cards = require('../../utils/arcadeCards');
const { COLORS } = require('../../utils/embeds');

const label = (c) => `${c.rank}${c.suit}`;

module.exports = {
  category: 'games',
  aliases: ['اعلى', 'أعلى', 'اعلي_اقل', 'هاي_لو', 'هايلو'],
  cooldown: 6,
  data: new SlashCommandBuilder()
    .setName('highlow')
    .setDescription('🃏 أعلى أو أقل — خمن الورقة التالية واسحب أرباحك في الوقت المناسب')
    .addIntegerOption((o) => o.setName('bet').setDescription('الرهان (افتراضي 200)').setMinValue(10)),

  async execute(interaction) {
    const v = H.validateBet(interaction, { min: 10, defaultBet: 200 });
    if (!v.ok) return H.safeReply(interaction, { embeds: [v.errorEmbed], ephemeral: true });
    const { bet, guildId } = v;
    const userId = interaction.user.id;
    K.settle(guildId, userId, -bet);

    let current = A.drawCard(), previous = null, mult = 1, round = 0, ended = false;
    const history = [label(current)];
    const id = `hlg_${userId}_${Date.now()}`;

    const controls = (dis = false) => {
      const up = A.hlStep(current.v, 'up'), down = A.hlStep(current.v, 'down');
      return [new K.ActionRowBuilder().addComponents(
        K.btn(`${id}_up`, up ? `أعلى ×${up}` : 'أعلى', K.ButtonStyle.Success, dis || !up, '⬆️'),
        K.btn(`${id}_down`, down ? `أقل ×${down}` : 'أقل', K.ButtonStyle.Primary, dis || !down, '⬇️'),
        K.btn(`${id}_cash`, `اسحب ${H.fmt(Math.floor(bet * mult))}`, K.ButtonStyle.Secondary, dis || round === 0, '💰'),
      )];
    };
    const view = async (status = null, note = '', u = null) => {
      const e = (status === 'lose' ? H.loseEmbed : status ? H.winEmbed : (i, t, d) => H.brandedEmbed(i, t, COLORS.primary).setDescription(d))(
        interaction, status === 'lose' ? 'أعلى أو أقل — خسرت' : status ? 'أعلى أو أقل — سحبت أرباحك' : '🃏 أعلى أو أقل',
        `${note ? `${note}\n` : ''}الورقة الحالية: **${label(current)}** · المضاعف: **×${mult.toFixed(2)}** · الجولة **${round}/${A.HL_MAX_ROUNDS}**`);
      if (u) e.setFooter(H.balanceFooter(u));
      const card = await K.safeCard(() => cards.highlowCard({
        current, previous, history, mult, bet, round, maxRounds: A.HL_MAX_ROUNDS, status,
        potential: Math.floor(bet * mult), net: Math.floor(bet * mult) - bet,
        chances: { up: A.hlChance(current.v, 'up'), down: A.hlChance(current.v, 'down') }, ...K.who(interaction),
      }));
      const components = status ? [K.againRow(`highlow_again_${bet}`, `🔁 جولة أخرى (${H.fmt(bet)})`)] : controls();
      return K.withCard(e, card, { components });
    };

    const msg = await H.safeReply(interaction, await view());
    const col = msg?.createMessageComponentCollector?.({ idle: 60000, time: 5 * 60000 });
    if (!col) return;

    const end = async (i, status, note) => {
      ended = true; col.stop('done');
      const payout = status === 'lose' ? 0 : Math.floor(bet * mult);
      const u = K.settle(guildId, userId, payout, { highlow_count: 1, ...(payout > bet ? { highlow_wins: 1 } : {}) });
      const p = await view(status, note, u);
      if (i) await i.update(p).catch(() => interaction.editReply(p).catch(() => {}));
      else await interaction.editReply(p).catch(() => {});
    };

    col.on('collect', async (i) => {
      if (!i.customId.startsWith(id) || ended) return;
      if (i.user.id !== userId) return K.notYours(i);
      const act = i.customId.slice(id.length + 1);
      if (act === 'cash') return end(i, 'cashout', `💰 سحبت عند ×${mult.toFixed(2)}`);
      const dir = act === 'up' ? 'up' : 'down';
      const step = A.hlStep(current.v, dir);
      if (!step) return i.deferUpdate().catch(() => {});
      const next = A.drawCard();
      const res = A.hlResolve(current.v, next.v, dir);
      previous = current; current = next; history.push(label(next));
      if (res === 'lose') return end(i, 'lose', `❌ ${label(next)} — تخمينك ${dir === 'up' ? 'أعلى' : 'أقل'} لم يصب`);
      let note = `🔁 ${label(next)} نفس القيمة — لا ربح ولا خسارة`;
      if (res === 'win') { mult = A.round2(mult * step); round += 1; note = `✅ ${label(next)} — صح! المضاعف ×${mult.toFixed(2)}`; }
      if (round >= A.HL_MAX_ROUNDS) return end(i, 'cashout', `🏆 وصلت للحد الأقصى ${A.HL_MAX_ROUNDS} جولات!`);
      await i.update(await view(null, note)).catch(() => {});
    });
    col.on('end', () => { if (!ended) end(null, 'cashout', round > 0 ? '⏱️ سحب تلقائي بسبب عدم النشاط' : '⏱️ انتهى الوقت — أُعيد رهانك'); });
  },
};
