const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const kit = require('../../utils/cardKit');

/** يرسم بطاقة النتيجة ويضيفها للإمبد */
async function withCard(embed, data) {
  try {
    const card = await kit.rpsCard(data);
    if (card) { embed.setImage('attachment://rps.png'); return [new AttachmentBuilder(card.buffer, { name: 'rps.png' })]; }
  } catch {}
  return [];
}
const pickFromWord = (w) => {
  const v = String(w || '').replace(/ة/g, 'ه').trim();
  return { 'حجره': 'rock', 'حجر': 'rock', rock: 'rock', 'ورقه': 'paper', 'ورق': 'paper', paper: 'paper', 'مقص': 'scissors', scissors: 'scissors' }[v] || null;
};
const {
  fmt, getUser, saveUser, bumpStat,
  brandedEmbed, winEmbed, loseEmbed, tieEmbed,
  balanceFooter, playAgainRow, safeReply, errorEmbed, CURRENCY
} = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');
const { setEmbedMedia } = require('../../utils/mediaRegistry');

const C = {
  rock:     { e: '🪨', name: 'حجرة',  beats: 'scissors', gif: 'https://i.imgur.com/7mEo7tA.png' },
  paper:    { e: '📄', name: 'ورقة',   beats: 'rock',     gif: 'https://i.imgur.com/3Mb4gGC.png' },
  scissors: { e: '✂️', name: 'مقص',   beats: 'paper',    gif: 'https://i.imgur.com/p5MrB5l.png' }
};

// Visual countdown row
function controls(prefix) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${prefix}_rock`).setLabel('🪨 حجرة').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${prefix}_paper`).setLabel('📄 ورقة').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`${prefix}_scissors`).setLabel('✂️ مقص').setStyle(ButtonStyle.Danger)
  );
}

function vsDisplay(p1name, p2name, m1 = null, m2 = null) {
  const s1 = m1 ? `${C[m1].e} ${C[m1].name}` : '❓ يختار...';
  const s2 = m2 ? `${C[m2].e} ${C[m2].name}` : '❓ يختار...';
  return `\`\`\`\n👤 ${p1name.padEnd(12)} VS  👤 ${p2name}\n   ${s1.padEnd(14)}     ${s2}\n\`\`\``;
}

module.exports = {
  aliases: ['حجرة', 'مقص', 'ورقة', 'rps'],
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('🪨📄✂️ حجرة ورقة مقص — العب ضد البوت أو تحدّ صديق')
    .addUserOption(o => o.setName('opponent').setDescription('الخصم (اختياري)'))
    .addIntegerOption(o => o.setName('bet').setDescription('الرهان (للتحدي)').setMinValue(50)),

  async execute(interaction) {
    if (interaction.isButton?.()) return this.solo(interaction);
    const opponent = interaction.options?.getUser?.('opponent');
    const bet = interaction.options?.getInteger?.('bet') || 0;
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (!opponent || opponent.id === interaction.client.user.id) return this.solo(interaction);
    if (opponent.id === userId) return safeReply(interaction, { embeds: [errorEmbed('غير مسموح', 'لا يمكنك تحدي نفسك.')], ephemeral: true });
    if (opponent.bot) return safeReply(interaction, { embeds: [errorEmbed('غير مسموح', 'لا يمكنك تحدي البوتات.')], ephemeral: true });

    const { g } = getUser(guildId, userId);
    const u1 = getUser(guildId, userId).u;
    const u2 = getUser(guildId, opponent.id).u;
    if (bet > 0 && u1.balance < bet) return safeReply(interaction, { embeds: [errorEmbed('رصيد غير كافٍ', `تحتاج ${fmt(bet)} للرهان.`)], ephemeral: true });
    if (bet > 0 && u2.balance < bet) return safeReply(interaction, { embeds: [errorEmbed('رصيد الخصم غير كافٍ', `الخصم لا يملك ${fmt(bet)}.`)], ephemeral: true });

    const invite = brandedEmbed(interaction, '⚔️ تحدي حجرة ورقة مقص', COLORS.info)
      .setDescription(
        `${vsDisplay(interaction.user.username, opponent.username)}\n` +
        `<@${userId}> يتحدى <@${opponent.id}>` +
        (bet > 0 ? `\n💰 الرهان: **${fmt(bet)}** ${CURRENCY}` : '') +
        `\n\n*اضغط للقبول خلال 60 ثانية.*`
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
    setEmbedMedia(invite, 'rps', 'play');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rps_accept').setLabel('قبول ✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('rps_decline').setLabel('رفض ❌').setStyle(ButtonStyle.Danger)
    );
    const msg = await safeReply(interaction, { content: `<@${opponent.id}>`, embeds: [invite], components: [row] });

    const accept = msg.createMessageComponentCollector({ filter: i => i.user.id === opponent.id, time: 60000, max: 1 });
    accept.on('collect', async i => {
      if (i.customId === 'rps_decline') {
        const t = tieEmbed(interaction, 'رُفض التحدي', `<@${opponent.id}> رفض التحدي.`);
        setEmbedMedia(t, 'rps', 'lose');
        return i.update({ content: null, embeds: [t], components: [] });
      }

      const game = brandedEmbed(interaction, '🎮 اختر سلاحك!', COLORS.primary)
        .setDescription(
          `${vsDisplay(interaction.user.username, opponent.username)}\n` +
          `<@${userId}> ضد <@${opponent.id}>\n` +
          (bet > 0 ? `💰 رهان: **${fmt(bet)}** ${CURRENCY}\n` : '') +
          `\nكلاكما اختر **سراً** — لديكما **30 ثانية**.`
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
      setEmbedMedia(game, 'rps', 'play');
      await i.update({ content: null, embeds: [game], components: [controls('rps_pvp')] });

      const moves = {};
      const choose = msg.createMessageComponentCollector({
        filter: c => [userId, opponent.id].includes(c.user.id) && c.customId.startsWith('rps_pvp_'),
        time: 30000
      });

      choose.on('collect', async c => {
        if (moves[c.user.id]) return c.reply({ content: '✅ لقد اخترت بالفعل!', ephemeral: true });
        moves[c.user.id] = c.customId.replace('rps_pvp_', '');
        await c.reply({ content: `🤫 سرّك: ${C[moves[c.user.id]].e} **${C[moves[c.user.id]].name}**`, ephemeral: true });
        if (Object.keys(moves).length === 2) choose.stop('done');
      });

      choose.on('end', async (_x, reason) => {
        if (reason !== 'done') {
          const t = tieEmbed(interaction, 'انتهى الوقت', 'لم يكمل اللاعبون اختياراتهم.');
          setEmbedMedia(t, 'rps', 'lose');
          return interaction.editReply({ embeds: [t], components: [] }).catch(() => {});
        }

        const m1 = moves[userId], m2 = moves[opponent.id];
        let result, winnerId = null;
        if (m1 === m2) result = 'tie';
        else if (C[m1].beats === m2) { result = 'p1'; winnerId = userId; }
        else { result = 'p2'; winnerId = opponent.id; }

        const fg = getUser(guildId, userId).g;
        fg.users[userId] = fg.users[userId] || {};
        fg.users[opponent.id] = fg.users[opponent.id] || {};
        bumpStat(fg.users[userId], 'rps_count');
        bumpStat(fg.users[opponent.id], 'rps_count');
        if (winnerId && bet > 0) {
          const loser = winnerId === userId ? opponent.id : userId;
          fg.users[winnerId].balance = (fg.users[winnerId].balance || 0) + bet;
          fg.users[loser].balance    = Math.max(0, (fg.users[loser].balance || 0) - bet);
          bumpStat(fg.users[winnerId], 'rps_wins');
        }
        saveUser(guildId, fg);

        const desc =
          `${vsDisplay(interaction.user.username, opponent.username, m1, m2)}\n` +
          `👤 <@${userId}>: ${C[m1].e} **${C[m1].name}**\n` +
          `👤 <@${opponent.id}>: ${C[m2].e} **${C[m2].name}**\n\n` +
          (winnerId
            ? `🏆 الفائز: <@${winnerId}>` + (bet ? `\n💰 **+${fmt(bet)}** ${CURRENCY}` : '')
            : '🤝 **تعادل!**');

        let out;
        if (result === 'tie') {
          out = tieEmbed(interaction, 'تعادل!', desc);
          setEmbedMedia(out, 'rps', 'tie');
        } else {
          out = winEmbed(interaction, 'فوز!', desc);
          setEmbedMedia(out, 'rps', 'win');
        }
        const files = await withCard(out, {
          p: m1, o: m2, result: result === 'tie' ? 'tie' : result === 'p1' ? 'win' : 'lose',
          username: interaction.user.username, avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
          opponent: opponent.username, opponentAvatar: opponent.displayAvatarURL({ extension: 'png', size: 256 }),
          delta: winnerId ? (winnerId === userId ? bet : -bet) : 0,
        });
        await interaction.editReply({ embeds: [out], components: [], files, attachments: [] }).catch(() => {});
      });
    });
  },

  async solo(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const embed = brandedEmbed(interaction, '🪨📄✂️ تحدّى البوت', COLORS.info)
      .setDescription(
        `${vsDisplay(interaction.user.username, 'البوت 🤖')}\n` +
        `اختر سلاحك — البوت سيختار في نفس اللحظة!`
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
    setEmbedMedia(embed, 'rps', 'play');

    // «حجرة» / «ورقة» / «مقص» كأمر نصي = اختيار مباشر ضد البوت
    const typed = interaction._originalMessage ? pickFromWord(interaction._originalMessage.content.split(/\s+/)[0]) : null;
    const resolve = async (p, i = null) => {
      const bot = ['rock','paper','scissors'][Math.floor(Math.random()*3)];
      const { g, u } = getUser(guildId, userId);

      let result, delta = 0;
      if (p === bot) result = 'tie';
      else if (C[p].beats === bot) { result = 'win'; delta = 100; u.balance += delta; }
      else { result = 'lose'; delta = 50; u.balance = Math.max(0, u.balance - delta); }

      bumpStat(u, 'rps_count');
      if (result === 'win') bumpStat(u, 'rps_wins');
      saveUser(guildId, g);

      const desc =
        `${vsDisplay(interaction.user.username, 'البوت 🤖', p, bot)}\n` +
        `👤 **أنت:** ${C[p].e} ${C[p].name}\n` +
        `🤖 **البوت:** ${C[bot].e} ${C[bot].name}\n\n` +
        (result === 'win' ? `🏆 **انتصرت!** 💰 **+${fmt(delta)}** ${CURRENCY}`
          : result === 'lose' ? `😢 **خسرت!** 💸 **-${fmt(delta)}** ${CURRENCY}`
          : `🤝 **تعادل!** لا ربح ولا خسارة`);

      let out;
      if (result === 'win')  { out = winEmbed(interaction, 'فوز!', desc);   setEmbedMedia(out, 'rps', 'win'); }
      else if (result === 'lose') { out = loseEmbed(interaction, 'خسارة!', desc); setEmbedMedia(out, 'rps', 'lose'); }
      else                   { out = tieEmbed(interaction, 'تعادل!', desc); setEmbedMedia(out, 'rps', 'tie'); }

      out.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true })).setFooter(balanceFooter(u));
      const files = await withCard(out, {
        p, o: bot, result, username: interaction.member?.displayName || interaction.user.username,
        avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
        opponent: 'البوت', opponentAvatar: interaction.client.user.displayAvatarURL({ extension: 'png', size: 256 }),
        delta: result === 'win' ? delta : result === 'lose' ? -delta : 0, balance: u.balance,
      });
      const payload = { embeds: [out], components: [playAgainRow('rps_again', '🔁 جولة أخرى')], files, attachments: [] };
      if (i) await i.update(payload).catch(() => {});
      else await safeReply(interaction, payload);
    };

    if (typed) return resolve(typed);

    const msg = await safeReply(interaction, { embeds: [embed], components: [controls('rps_solo')] });
    if (!msg?.createMessageComponentCollector) return;
    const col = msg.createMessageComponentCollector({
      filter: i => i.user.id === userId && i.customId.startsWith('rps_solo_'),
      time: 20000, max: 1
    });
    col.on('collect', (i) => resolve(i.customId.replace('rps_solo_', ''), i));
    col.on('end', c => { if (c.size === 0) interaction.editReply({ components: [] }).catch(() => {}); });
  }
};
