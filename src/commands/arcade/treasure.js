// 🧰 صناديق الكنز — اختر صندوقاً من ثلاثة: كنز ملكي ×2.2، عملات ×0.6، أو فارغ
const { SlashCommandBuilder } = require('discord.js');
const H = require('../../utils/gameHelpers');
const A = require('../../systems/arcade');
const K = require('../../utils/arcadeKit');
const cards = require('../../utils/arcadeCards');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  category: 'games',
  aliases: ['كنز', 'صندوق', 'صناديق', 'الكنز'],
  cooldown: 6,
  data: new SlashCommandBuilder()
    .setName('treasure')
    .setDescription('🧰 صناديق الكنز — اختر صندوقاً واحداً من ثلاثة')
    .addIntegerOption((o) => o.setName('bet').setDescription('الرهان (افتراضي 200)').setMinValue(10)),

  async execute(interaction) {
    const v = H.validateBet(interaction, { min: 10, defaultBet: 200 });
    if (!v.ok) return H.safeReply(interaction, { embeds: [v.errorEmbed], ephemeral: true });
    const { bet, guildId } = v;
    const userId = interaction.user.id;
    K.settle(guildId, userId, -bet);
    const chests = A.shuffleChests();
    const id = `trg_${userId}_${Date.now()}`;

    const row = new K.ActionRowBuilder().addComponents(...[0, 1, 2].map((i) => K.btn(`${id}_${i}`, `الصندوق ${i + 1}`, K.ButtonStyle.Secondary, false, '🧰')));
    const e = H.brandedEmbed(interaction, '🧰 صناديق الكنز', COLORS.primary)
      .setDescription(`💰 الرهان: **${H.fmt(bet)}** ${H.CURRENCY}\nواحد فيه **👑 كنز ملكي ×2.2** · واحد فيه **🪙 عملات ×0.6** · وواحد **🕸️ فارغ**\n\nاختر بحكمة!`);
    const first = await K.safeCard(() => cards.treasureCard({ chests, bet, ...K.who(interaction) }));
    const msg = await H.safeReply(interaction, K.withCard(e, first, { components: [row] }));
    const choice = await msg?.awaitMessageComponent?.({ filter: (i) => i.customId.startsWith(id) && (i.user.id === userId || (K.notYours(i), false)), time: 45000 }).catch(() => null);
    const picked = choice ? Number(choice.customId.split('_').pop()) : Math.floor(Math.random() * 3);
    const prize = chests[picked];
    const payout = Math.floor(bet * prize.m);
    const u = K.settle(guildId, userId, payout, { treasure_count: 1, ...(payout > bet ? { treasure_wins: 1 } : {}) });
    const net = payout - bet;
    const fe = (net > 0 ? H.winEmbed : H.loseEmbed)(interaction, `صناديق الكنز — ${prize.emoji} ${prize.label}`,
      `${choice ? '' : '⏱️ انتهى الوقت فاخترنا لك صندوقاً عشوائياً\n'}${net >= 0 ? `💰 **+${H.fmt(net)}**` : `💸 **-${H.fmt(-net)}**`} ${H.CURRENCY}\n\n${chests.map((c, i) => `${i === picked ? '👉' : '▫️'} الصندوق ${i + 1}: ${c.emoji} ${c.label}`).join('\n')}`).setFooter(H.balanceFooter(u));
    const card = await K.safeCard(() => cards.treasureCard({ chests, picked, bet, net, ...K.who(interaction) }));
    const p = K.withCard(fe, card, { components: [K.againRow(`treasure_again_${bet}`, `🔁 جولة أخرى (${H.fmt(bet)})`)] });
    if (choice) await choice.update(p).catch(() => interaction.editReply(p).catch(() => {}));
    else await interaction.editReply(p).catch(() => {});
  },
};
