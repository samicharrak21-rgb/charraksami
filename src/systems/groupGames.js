// 🎉 نظام الألعاب الجماعية — لوبي موحّد + 7 ألعاب جماعية
// يمكن تشغيله من الأمر /group أو من الشات بوت مباشرة.
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder,
} = require('discord.js');
const cards = require('../utils/groupCards');
const { getUser, saveUser, bumpStat, fmt, CURRENCY } = require('../utils/gameHelpers');
const { COLORS } = require('../utils/embeds');
const logger = require('../utils/logger');

const active = new Set(); // channelIds with a running game

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const norm = (t) => String(t || '').trim().toLowerCase()
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/[\u064B-\u0652]/g, '');

// ───────────── بيانات الألعاب ─────────────
const WORDS = ['سيرفر', 'ديسكورد', 'برمجة', 'مغامرة', 'تنين', 'قلعة', 'كنز', 'صحراء', 'محيط', 'بركان',
  'فضاء', 'نجمة', 'قمر', 'شمس', 'سحابة', 'مطر', 'برق', 'جبل', 'غابة', 'نهر', 'حاسوب', 'لوحة',
  'شاشة', 'سماعة', 'كاميرا', 'بطل', 'فارس', 'ساحر', 'محارب', 'سفينة', 'طائرة', 'قطار', 'دراجة',
  'مكتبة', 'مدرسة', 'جامعة', 'مستشفى', 'حديقة', 'ملعب', 'مطعم', 'قهوة', 'شوكولاتة', 'برتقال', 'فراولة'];

const QUIZ = [
  { q: 'ما عاصمة اليابان؟', a: ['طوكيو', 'أوساكا', 'كيوتو', 'بكين'], c: 0 },
  { q: 'كم عدد قارات العالم؟', a: ['5', '6', '7', '8'], c: 2 },
  { q: 'ما أكبر كوكب في المجموعة الشمسية؟', a: ['زحل', 'المشتري', 'الأرض', 'نبتون'], c: 1 },
  { q: 'ما أطول نهر في العالم؟', a: ['الأمازون', 'النيل', 'الفرات', 'المسيسيبي'], c: 1 },
  { q: 'كم عدد أيام السنة الكبيسة؟', a: ['364', '365', '366', '367'], c: 2 },
  { q: 'ما الغاز الذي تمتصه النباتات؟', a: ['الأكسجين', 'النيتروجين', 'ثاني أكسيد الكربون', 'الهيليوم'], c: 2 },
  { q: 'ما أسرع حيوان بري؟', a: ['الأسد', 'الفهد', 'الحصان', 'الغزال'], c: 1 },
  { q: 'من مخترع المصباح الكهربائي (المشهور)؟', a: ['نيوتن', 'إديسون', 'تسلا', 'آينشتاين'], c: 1 },
  { q: 'كم عدد أضلاع السداسي؟', a: ['5', '6', '7', '8'], c: 1 },
  { q: 'ما عاصمة المغرب؟', a: ['الدار البيضاء', 'فاس', 'الرباط', 'مراكش'], c: 2 },
  { q: 'ما أكبر محيط في العالم؟', a: ['الأطلسي', 'الهندي', 'الهادئ', 'المتجمد'], c: 2 },
  { q: 'ما العنصر الكيميائي الذي رمزه O؟', a: ['ذهب', 'أكسجين', 'حديد', 'فضة'], c: 1 },
  { q: 'كم دقيقة في الساعة؟', a: ['30', '60', '90', '100'], c: 1 },
  { q: 'ما لغة البرمجة التي يعمل بها هذا البوت؟', a: ['Python', 'Java', 'JavaScript', 'C#'], c: 2 },
  { q: 'ما عاصمة مصر؟', a: ['الإسكندرية', 'القاهرة', 'الجيزة', 'أسوان'], c: 1 },
  { q: 'كم عدد لاعبي فريق كرة القدم في الملعب؟', a: ['9', '10', '11', '12'], c: 2 },
  { q: 'ما أصغر عدد أولي؟', a: ['0', '1', '2', '3'], c: 2 },
  { q: 'في أي قارة تقع البرازيل؟', a: ['أفريقيا', 'أمريكا الجنوبية', 'أوروبا', 'آسيا'], c: 1 },
];

const UNICODE_EMOJIS = ['🍕', '🚀', '🐉', '🎸', '🌵', '🦊', '🍩', '⚽', '🎯', '🧊', '🌈', '🐙', '🍉', '🦄', '🔥', '💎'];

const GAMES = {
  fastest: { name: 'أسرع كاتب', emoji: '⌨️', desc: 'أول من يكتب الكلمة يأخذ النقطة.' },
  quiz: { name: 'تحدي المعلومات', emoji: '🧠', desc: 'أسئلة بأزرار، الأسرع والأصح يربح.' },
  emoji: { name: 'صيد الإيموجي', emoji: '🎯', desc: 'أرسل نفس إيموجي السيرفر الظاهر بأسرع وقت.' },
  math: { name: 'سباق الرياضيات', emoji: '➗', desc: 'حلّ المسألة قبل الجميع.' },
  scramble: { name: 'الكلمة المبعثرة', emoji: '🔀', desc: 'رتّب الحروف واكتب الكلمة الصحيحة.' },
  elimination: { name: 'روليت الإقصاء', emoji: '💀', desc: 'في كل جولة يُقصى لاعب عشوائياً، آخر ناجٍ يفوز.' },
  chairs: { name: 'الكراسي الموسيقية', emoji: '🪑', desc: 'اضغط على كرسي بسرعة، من يبقى واقفاً يخرج!' },
};

// ───────────── أدوات مشتركة ─────────────
/** معلومات لاعب للرسم (الاسم + الصورة) */
async function playerInfo(guild, id) {
  try {
    const m = guild.members.cache.get(id) || await guild.members.fetch(id).catch(() => null);
    const u = m?.user || guild.client.users.cache.get(id);
    return { id, name: m?.displayName || u?.username || 'لاعب', avatarURL: u?.displayAvatarURL?.({ extension: 'png', size: 128 }) || null };
  } catch { return { id, name: 'لاعب', avatarURL: null }; }
}
const playersInfo = (guild, ids) => Promise.all(ids.map((id) => playerInfo(guild, id)));

/** يحوّل بطاقة إلى رسالة: embed + صورة مرفقة. إن فشل الرسم يُرجع embed فقط */
async function withCard(embed, cardPromise) {
  let card = null;
  try { card = await cardPromise; } catch (e) { logger.warn(`groupCards: ${e.message}`); }
  if (!card) return { embeds: [embed], files: [] };
  const name = `${Date.now()}_${card.name}`;
  return { embeds: [embed.setImage(`attachment://${name}`)], files: [new AttachmentBuilder(card.buffer, { name })], attachments: [] };
}

function baseEmbed(title, color = COLORS.royal) {
  return new EmbedBuilder().setTitle(title).setColor(color).setTimestamp();
}

function rewardPlayer(guildId, userId, amount, statKey) {
  try {
    const { g, u } = getUser(guildId, userId);
    u.balance += amount;
    u.xp = (u.xp || 0) + Math.floor(amount / 5);
    bumpStat(u, statKey || 'group_wins');
    saveUser(guildId, g);
  } catch (e) {
    logger.warn(`groupGames reward failed: ${e.message}`);
  }
}

function scoreboard(scores) {
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return '— لا أحد سجّل نقاطاً —';
  const medals = ['🥇', '🥈', '🥉'];
  return sorted.slice(0, 10).map(([id, s], i) => `${medals[i] || `**${i + 1}.**`} <@${id}> — **${s}** نقطة`).join('\n');
}

function getServerEmojis(guild) {
  const list = guild?.emojis?.cache?.filter((e) => e.available !== false).map((e) => e) || [];
  return list;
}

/** لوبي انضمام بأزرار. يُرجع مصفوفة معرفات اللاعبين */
async function runLobby(channel, host, game, { min = 2, max = 20, time = 30000 } = {}) {
  const players = new Set([host.id]);
  const id = `glob_${Date.now()}`;
  const row = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${id}_join`).setLabel('انضمام').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${id}_leave`).setLabel('خروج').setEmoji('🚪').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${id}_start`).setLabel('ابدأ الآن').setEmoji('▶️').setStyle(ButtonStyle.Primary),
  );
  const embed = () => baseEmbed(`${game.emoji} ${game.name} — لوبي الانضمام`)
    .setDescription(`${game.desc}\n\n👑 المضيف: <@${host.id}>\n⏳ يبدأ تلقائياً خلال **${time / 1000}** ثانية\n\n**اللاعبون (${players.size}/${max}):**\n${[...players].map((p) => `• <@${p}>`).join('\n')}`)
    .setFooter({ text: `الحد الأدنى ${min} لاعبين` });

  const guild = channel.guild;
  const view = async () => withCard(embed(), cards.lobbyCard({
    game: game.name, emoji: game.emoji, desc: game.desc, max, seconds: time / 1000,
    host: (await playerInfo(guild, host.id)).name, players: await playersInfo(guild, [...players]),
  }));
  const msg = await channel.send({ ...(await view()), components: [row()] });
  return new Promise((resolve) => {
    const col = msg.createMessageComponentCollector({ time });
    col.on('collect', async (i) => {
      try {
        if (i.customId === `${id}_join`) {
          if (players.size >= max) return i.reply({ content: '❌ اللوبي ممتلئ.', ephemeral: true });
          players.add(i.user.id);
        } else if (i.customId === `${id}_leave`) {
          if (i.user.id === host.id) return i.reply({ content: '👑 المضيف لا يمكنه الخروج.', ephemeral: true });
          players.delete(i.user.id);
        } else if (i.customId === `${id}_start`) {
          if (i.user.id !== host.id) return i.reply({ content: '❌ فقط المضيف يمكنه البدء.', ephemeral: true });
          await i.deferUpdate();
          return col.stop('start');
        }
        await i.deferUpdate().catch(() => {});
        await msg.edit({ ...(await view()), components: [row()] }).catch(() => {});
      } catch { /* ignore */ }
    });
    col.on('end', async () => {
      await msg.edit({ components: [] }).catch(() => {});
      resolve([...players]);
    });
  });
}

/** جولات قائمة على الرسائل: أول من يكتب الإجابة الصحيحة يأخذ نقطة */
async function messageRounds(channel, { rounds, makeRound, title, color, time = 20000, theme = 'azure' }) {
  const scores = new Map();
  for (let r = 1; r <= rounds; r++) {
    const round = makeRound();
    const emb = baseEmbed(`${title} — الجولة ${r}/${rounds}`, color).setFooter({ text: `⏳ ${time / 1000} ثانية` });
    if (round.image) {
      const payload = await withCard(emb.setDescription(round.hint || ''), cards.wordCard({ word: round.image, title, hint: round.hint, round: r, total: rounds, seconds: time / 1000, theme }));
      if (!payload.files.length) emb.setDescription(round.prompt);
      await channel.send(payload);
    } else {
      await channel.send({ embeds: [emb.setDescription(round.prompt)] });
    }
    const winner = await new Promise((resolve) => {
      const col = channel.createMessageCollector({ filter: (m) => !m.author.bot, time });
      col.on('collect', (m) => {
        if (round.check(m.content)) {
          m.react('✅').catch(() => {});
          col.stop('won');
          resolve(m.author);
        }
      });
      col.on('end', (_c, reason) => { if (reason !== 'won') resolve(null); });
    });
    if (winner) {
      scores.set(winner.id, (scores.get(winner.id) || 0) + 1);
      await channel.send(`🎉 <@${winner.id}> أجاب أولاً! الإجابة: **${round.answerText}**`);
    } else {
      await channel.send(`⌛ انتهى الوقت! الإجابة كانت: **${round.answerText}**`);
    }
    await sleep(2000);
  }
  return scores;
}

async function finishScores(channel, guildId, scores, title, prize) {
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const embed = baseEmbed(`🏆 نتائج ${title}`, COLORS.gold).setDescription(scoreboard(scores));
  if (sorted.length) {
    const [winnerId] = sorted[0];
    rewardPlayer(guildId, winnerId, prize, 'group_wins');
    embed.addFields({ name: '🎁 الجائزة', value: `<@${winnerId}> ربح **${fmt(prize)}** ${CURRENCY}` });
    const top = await Promise.all(sorted.slice(0, 3).map(async ([id, score]) => ({ ...(await playerInfo(channel.guild, id)), score })));
    return channel.send(await withCard(embed, cards.podiumCard({ title, entries: top, prize, currency: CURRENCY })));
  }
  await channel.send({ embeds: [embed] });
}

// ───────────── الألعاب ─────────────
async function playFastest(channel, guild, rounds) {
  return messageRounds(channel, {
    rounds, title: '⌨️ أسرع كاتب', color: COLORS.cyan,
    makeRound: () => {
      const w = pick(WORDS);
      return { image: w, hint: 'اكتب الكلمة الظاهرة في الصورة بأسرع ما يمكن', prompt: `اكتب الكلمة التالية بأسرع ما يمكن:\n# \`${w.split('').join('\u200b')}\``, check: (t) => norm(t) === norm(w), answerText: w };
    },
  });
}

async function playScramble(channel, guild, rounds) {
  return messageRounds(channel, {
    rounds, title: '🔀 الكلمة المبعثرة', color: COLORS.phantom, time: 30000, theme: 'violet',
    makeRound: () => {
      const w = pick(WORDS);
      let s = w;
      for (let i = 0; i < 5 && s === w; i++) s = shuffle(w.split('')).join('');
      return { image: s.split('').join(' '), hint: 'رتّب الحروف واكتب الكلمة الصحيحة', prompt: `رتّب الحروف لتكوين كلمة صحيحة:\n# ${s.split('').join(' ')}`, check: (t) => norm(t) === norm(w), answerText: w };
    },
  });
}

async function playMath(channel, guild, rounds) {
  return messageRounds(channel, {
    rounds, title: '➗ سباق الرياضيات', color: COLORS.info, time: 20000, theme: 'emerald',
    makeRound: () => {
      const op = pick(['+', '-', '×']);
      const a = Math.floor(Math.random() * (op === '×' ? 15 : 90)) + 2;
      const b = Math.floor(Math.random() * (op === '×' ? 12 : 90)) + 2;
      const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
      return { image: `${a} ${op} ${b} = ?`, hint: 'اكتب الناتج', prompt: `# ${a} ${op} ${b} = ?`, check: (t) => t.trim().replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) === String(ans), answerText: String(ans) };
    },
  });
}

async function playEmoji(channel, guild, rounds) {
  const serverEmojis = getServerEmojis(guild);
  return messageRounds(channel, {
    rounds, title: '🎯 صيد الإيموجي', color: COLORS.warning, time: 20000,
    makeRound: () => {
      if (serverEmojis.length) {
        const e = pick(serverEmojis);
        return {
          prompt: `أرسل هذا الإيموجي من السيرفر بأسرع وقت:\n# ${e.toString()}\nأو اكتب اسمه: \`${e.name}\``,
          check: (t) => t.includes(e.id) || norm(t) === norm(e.name),
          answerText: `${e.toString()} (${e.name})`,
        };
      }
      const e = pick(UNICODE_EMOJIS);
      return { prompt: `أرسل هذا الإيموجي بأسرع وقت:\n# ${e}`, check: (t) => t.trim() === e, answerText: e };
    },
  });
}

async function playQuiz(channel, guild, rounds) {
  const scores = new Map();
  const qs = shuffle(QUIZ).slice(0, rounds);
  const letters = ['🇦', '🇧', '🇨', '🇩'];
  for (let r = 0; r < qs.length; r++) {
    const q = qs[r];
    const id = `gquiz_${Date.now()}`;
    const row = new ActionRowBuilder().addComponents(
      q.a.map((ans, i) => new ButtonBuilder().setCustomId(`${id}_${i}`).setLabel(ans.slice(0, 70)).setEmoji(letters[i]).setStyle(ButtonStyle.Secondary)),
    );
    const msg = await channel.send({
      ...(await withCard(baseEmbed(`🧠 تحدي المعلومات — السؤال ${r + 1}/${qs.length}`, COLORS.royal).setDescription(`## ${q.q}\n\nلديك **15** ثانية • إجابة واحدة لكل لاعب`),
        cards.questionCard({ question: q.q, answers: q.a, index: r + 1, total: qs.length, seconds: 15 }))),
      components: [row],
    });
    const answered = new Map(); // userId -> {choice, order}
    await new Promise((resolve) => {
      const col = msg.createMessageComponentCollector({ time: 15000 });
      col.on('collect', async (i) => {
        if (answered.has(i.user.id)) return i.reply({ content: '❌ لقد أجبت بالفعل!', ephemeral: true }).catch(() => {});
        answered.set(i.user.id, { choice: Number(i.customId.split('_').pop()), order: answered.size });
        await i.reply({ content: '📩 تم تسجيل إجابتك!', ephemeral: true }).catch(() => {});
      });
      col.on('end', resolve);
    });
    const correct = [...answered.entries()].filter(([, v]) => v.choice === q.c).sort((a, b) => a[1].order - b[1].order);
    correct.forEach(([uid], idx) => scores.set(uid, (scores.get(uid) || 0) + (idx === 0 ? 3 : idx === 1 ? 2 : 1)));
    const done = new ActionRowBuilder().addComponents(
      q.a.map((ans, i) => new ButtonBuilder().setCustomId(`${id}_d${i}`).setLabel(ans.slice(0, 70)).setEmoji(letters[i])
        .setStyle(i === q.c ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(true)),
    );
    await msg.edit({ components: [done] }).catch(() => {});
    await channel.send(correct.length
      ? `✅ الإجابة: **${q.a[q.c]}** — أصاب: ${correct.map(([u]) => `<@${u}>`).join('، ')}`
      : `❌ لم يُصب أحد! الإجابة: **${q.a[q.c]}**`);
    await sleep(2500);
  }
  return scores;
}

async function playElimination(channel, guild, players, prize) {
  let alive = shuffle(players);
  let round = 1;
  const deathLines = ['سقط في فخ 🕳️', 'التهمه التنين 🐉', 'أصابته رصاصة الحظ 🔫', 'ضاع في المتاهة 🌀', 'انزلق على قشرة موز 🍌', 'انفجر به اللغم 💣'];
  while (alive.length > 1) {
    const infos = await playersInfo(guild, alive);
    const msg = await channel.send(await withCard(baseEmbed(`💀 روليت الإقصاء — الجولة ${round}`, COLORS.error).setDescription(`🎲 العجلة تدور...\n\n**الناجون (${alive.length}):**\n${alive.map((p) => `<@${p}>`).join(' ')}`),
      cards.rouletteCard({ players: infos, subtitle: `الجولة ${round}` })));
    await sleep(3000);
    const out = alive.splice(Math.floor(Math.random() * alive.length), 1)[0];
    const line = pick(deathLines);
    const pickedInfo = { ...infos.find((p) => p.id === out), label: 'خرج من اللعبة ☠️' };
    await msg.edit(await withCard(baseEmbed(`💀 روليت الإقصاء — الجولة ${round}`, COLORS.error).setDescription(`☠️ <@${out}> ${line}\n\n**المتبقون (${alive.length}):**\n${alive.map((p) => `<@${p}>`).join(' ')}`),
      cards.rouletteCard({ players: infos, picked: pickedInfo, subtitle: `الجولة ${round}` }))).catch(() => {});
    round++;
    await sleep(2000);
  }
  rewardPlayer(guild.id, alive[0], prize, 'group_wins');
  const w = await playerInfo(guild, alive[0]);
  await channel.send(await withCard(baseEmbed('👑 الناجي الأخير!', COLORS.gold).setDescription(`🎉 <@${alive[0]}> نجا من الروليت وربح **${fmt(prize)}** ${CURRENCY}`),
    cards.podiumCard({ title: 'الناجي الأخير', entries: [{ ...w, score: 1 }], prize, currency: CURRENCY })));
}

async function playChairs(channel, guild, players, prize) {
  let alive = [...players];
  let round = 1;
  while (alive.length > 1) {
    const chairsCount = alive.length - 1;
    const infos = await playersInfo(guild, alive);
    await channel.send(await withCard(baseEmbed(`🪑 الكراسي الموسيقية — الجولة ${round}`, COLORS.info).setDescription(`🎵 الموسيقى تعزف...\n${alive.map((p) => `<@${p}>`).join(' ')}`),
      cards.chairsCard({ players: infos, round, phase: 'music' })));
    await sleep(2000 + Math.random() * 3000);
    const id = `gchair_${Date.now()}`;
    const buttons = Array.from({ length: chairsCount }, (_, i) => new ButtonBuilder().setCustomId(`${id}_${i}`).setEmoji('🪑').setStyle(ButtonStyle.Primary));
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    const msg = await channel.send({ content: '🛑 **توقفت الموسيقى! اجلس بسرعة!**', components: rows.slice(0, 5) });
    const seated = new Map(); // chairIdx -> userId
    const seatedUsers = new Set();
    await new Promise((resolve) => {
      const col = msg.createMessageComponentCollector({ time: 10000 });
      col.on('collect', async (i) => {
        if (!alive.includes(i.user.id)) return i.reply({ content: '❌ لست في اللعبة.', ephemeral: true }).catch(() => {});
        if (seatedUsers.has(i.user.id)) return i.reply({ content: '🪑 أنت جالس بالفعل!', ephemeral: true }).catch(() => {});
        const idx = Number(i.customId.split('_').pop());
        if (seated.has(idx)) return i.reply({ content: '😅 هذا الكرسي محجوز!', ephemeral: true }).catch(() => {});
        seated.set(idx, i.user.id); seatedUsers.add(i.user.id);
        await i.reply({ content: '✅ جلست!', ephemeral: true }).catch(() => {});
        if (seated.size >= chairsCount) col.stop('full');
      });
      col.on('end', resolve);
    });
    await msg.edit({ components: [] }).catch(() => {});
    const standing = alive.filter((p) => !seatedUsers.has(p));
    alive = alive.filter((p) => seatedUsers.has(p));
    if (!alive.length) { // لا أحد جلس — اقصِ واحداً عشوائياً فقط
      alive = standing; const out = alive.splice(Math.floor(Math.random() * alive.length), 1)[0];
      await channel.send(`😴 لم يجلس أحد! تم إقصاء <@${out}> عشوائياً.`);
    } else {
      await channel.send(await withCard(baseEmbed(`🪑 نتيجة الجولة ${round}`, COLORS.error).setDescription(`🚶 خرج من اللعبة: ${standing.map((p) => `<@${p}>`).join('، ')}`),
        cards.chairsCard({ players: infos, seated: alive, round, phase: 'result' })));
    }
    round++;
    await sleep(1500);
  }
  rewardPlayer(guild.id, alive[0], prize, 'group_wins');
  const champ = await playerInfo(guild, alive[0]);
  await channel.send(await withCard(baseEmbed('🏆 بطل الكراسي!', COLORS.gold).setDescription(`🎉 <@${alive[0]}> فاز بآخر كرسي وربح **${fmt(prize)}** ${CURRENCY}`),
    cards.podiumCard({ title: 'بطل الكراسي', entries: [{ ...champ, score: 1 }], prize, currency: CURRENCY })));
}

/**
 * نقطة الدخول الرئيسية
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
async function startGroupGame(channel, host, type, { rounds = 5, prize = 1500 } = {}) {
  const game = GAMES[type];
  if (!game) return { ok: false, error: 'لعبة غير معروفة.' };
  if (active.has(channel.id)) return { ok: false, error: 'هناك لعبة جماعية جارية في هذه القناة بالفعل.' };
  active.add(channel.id);
  rounds = Math.max(1, Math.min(15, Number(rounds) || 5));
  prize = Math.max(0, Math.min(100000, Number(prize) || 1500));
  const guild = channel.guild;
  try {
    const lobbyBased = type === 'elimination' || type === 'chairs';
    const players = await runLobby(channel, host, game, { min: 2, time: lobbyBased ? 30000 : 15000 });
    if (players.length < 2) {
      await channel.send(`❌ لم يكتمل العدد لبدء **${game.name}** (الحد الأدنى لاعبان).`);
      return { ok: false, error: 'not enough players' };
    }
    await channel.send(`🚀 تبدأ **${game.emoji} ${game.name}** بعد 3 ثوانٍ! (${players.length} لاعبين)`);
    await sleep(3000);
    if (type === 'elimination') await playElimination(channel, guild, players, prize);
    else if (type === 'chairs') await playChairs(channel, guild, players, prize);
    else {
      const fn = { fastest: playFastest, quiz: playQuiz, emoji: playEmoji, math: playMath, scramble: playScramble }[type];
      const scores = await fn(channel, guild, rounds);
      await finishScores(channel, guild.id, scores, game.name, prize);
    }
    return { ok: true };
  } catch (e) {
    logger.error(`groupGame ${type} crashed: ${e.message}`);
    await channel.send('⚠️ حدث خطأ أثناء اللعبة، تم إيقافها.').catch(() => {});
    return { ok: false, error: e.message };
  } finally {
    active.delete(channel.id);
  }
}

module.exports = { startGroupGame, GAMES, isActive: (id) => active.has(id) };
