// 🎭 /fun — أوامر ترفيهية ببطاقات صور: توافق الحب، تقييم عضو، مبارزة سريعة، عجلة الحظ
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { loveCard, rateCard, duelCard, luckyWheelCard } = require('../../utils/funCards');
const { getUser, saveUser, fmt, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');

const norm = (t) => String(t || '').trim().toLowerCase()
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');

// الكلمات العربية لكل أمر فرعي (تعمل بعد «مرح» أو مباشرة في الشات)
const SUB_WORDS = {
  love: ['حب', 'توافق', 'love'],
  rate: ['تقييم', 'قيم', 'rate'],
  duel: ['مبارزه', 'مبارزة', 'نزال', 'duel'],
  wheel: ['عجله', 'عجلة', 'حظ', 'wheel'],
};
const subFromWord = (w) => {
  const n = norm(w);
  return Object.keys(SUB_WORDS).find((k) => SUB_WORDS[k].some((x) => norm(x) === n)) || null;
};

const WHEEL = [
  { label: '+500', amount: 500 }, { label: 'لا شيء', amount: 0 }, { label: '+1500', amount: 1500 },
  { label: '+100', amount: 100 }, { label: '-300', amount: -300 }, { label: '+3000', amount: 3000 },
  { label: '+250', amount: 250 }, { label: 'لا شيء', amount: 0 },
];
const wheelCooldown = new Map(); // `${guild}:${user}` -> timestamp
const WHEEL_CD = 60 * 60 * 1000;

const info = (member, user) => ({
  id: user.id,
  name: member?.displayName || user.globalName || user.username,
  avatarURL: user.displayAvatarURL({ extension: 'png', size: 256 }),
});
// نسبة ثابتة لنفس الشخصين في نفس اليوم (حتى لا تتغير مع كل محاولة)
const seeded = (str, mod) => {
  let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % mod;
};

async function send(interaction, embed, card) {
  if (!card) return interaction.reply({ embeds: [embed] });
  const file = new AttachmentBuilder(card.buffer, { name: card.name });
  return interaction.reply({ embeds: [embed.setImage(`attachment://${card.name}`)], files: [file] });
}

module.exports = {
  aliases: ['مرح', 'ترفيه'],
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('fun')
    .setDescription('🎭 أوامر ترفيهية ببطاقات صور')
    .addSubcommand((s) => s.setName('love').setDescription('💘 نسبة التوافق بين عضوين')
      .addUserOption((o) => o.setName('user').setDescription('العضو الأول').setRequired(true))
      .addUserOption((o) => o.setName('user2').setDescription('العضو الثاني (افتراضياً أنت)')))
    .addSubcommand((s) => s.setName('rate').setDescription('⭐ تقييم عضو من 10')
      .addUserOption((o) => o.setName('user').setDescription('العضو')))
    .addSubcommand((s) => s.setName('duel').setDescription('⚔️ مبارزة سريعة ضد عضو')
      .addUserOption((o) => o.setName('user').setDescription('الخصم').setRequired(true)))
    .addSubcommand((s) => s.setName('wheel').setDescription('🎡 عجلة الحظ (مرة كل ساعة)')),

  async execute(interaction) {
    const msg = interaction._originalMessage;
    let sub = null;
    if (msg) {
      const [first, second] = msg.content.trim().split(/\s+/);
      sub = subFromWord(first) || subFromWord(second);
    } else {
      sub = interaction.options.getSubcommand();
    }
    if (!sub) {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.royal).setTitle('🎭 أوامر المرح')
        .setDescription('💘 `حب @عضو` — نسبة التوافق\n⭐ `تقييم @عضو` — تقييم من 10\n⚔️ `مبارزة @عضو` — نزال سريع\n🎡 `عجلة` — عجلة الحظ (مرة كل ساعة)\n\nأو بالسلاش: `/fun love` · `/fun rate` · `/fun duel` · `/fun wheel`')] });
    }

    const guild = interaction.guild;
    const me = info(interaction.member, interaction.user);
    const mentioned = msg ? [...msg.mentions.users.values()] : [];
    const pickUser = (name, idx) => (msg ? mentioned[idx] || null : interaction.options.getUser(name));
    const toInfo = async (u) => info(guild.members.cache.get(u.id) || await guild.members.fetch(u.id).catch(() => null), u);

    if (sub === 'love') {
      const u1 = pickUser('user', 0);
      if (!u1) return interaction.reply({ content: '❌ منشن عضواً: `حب @عضو`', ephemeral: true });
      const u2 = pickUser('user2', 1);
      const a = await toInfo(u1);
      const b = u2 && u2.id !== u1.id ? await toInfo(u2) : me;
      const day = new Date().toISOString().slice(0, 10);
      const percent = seeded([a.id, b.id].sort().join(':') + day, 101);
      const verdict = percent >= 90 ? 'توأم الروح 💞' : percent >= 70 ? 'ثنائي رائع 💖' : percent >= 50 ? 'فيه أمل 😊' : percent >= 25 ? 'صداقة فقط 🤝' : 'ابتعدوا! 💔';
      const embed = new EmbedBuilder().setColor(COLORS.error || 0xff5d73).setTitle('💘 توافق الحب')
        .setDescription(`<@${a.id}> ❤️ <@${b.id}>\n**${percent}%** — ${verdict}`);
      return send(interaction, embed, await loveCard({ a, b, percent, verdict }));
    }

    if (sub === 'rate') {
      const u = pickUser('user', 0) || interaction.user;
      const target = await toInfo(u);
      const score = seeded(target.id + new Date().toISOString().slice(0, 10), 11);
      const label = ['كارثة 😵', 'ضعيف جداً', 'ضعيف', 'مقبول', 'لا بأس', 'متوسط', 'جيد', 'جيد جداً', 'رائع', 'ممتاز', 'أسطورة 👑'][score];
      const embed = new EmbedBuilder().setColor(COLORS.gold || 0xf5c451).setTitle('⭐ تقييم العضو')
        .setDescription(`<@${target.id}> حصل على **${score}/10** — ${label}`);
      return send(interaction, embed, await rateCard({ user: target, score, label }));
    }

    if (sub === 'duel') {
      const u = pickUser('user', 0);
      if (!u || u.id === interaction.user.id || u.bot) return interaction.reply({ content: '❌ منشن خصماً حقيقياً: `مبارزة @عضو`', ephemeral: true });
      const a = me, b = await toInfo(u);
      let hpA = 100, hpB = 100; const log = []; let turn = Math.random() < 0.5 ? 0 : 1;
      const moves = ['ضربة سيف ⚔️', 'سهم 🏹', 'كرة نار 🔥', 'لكمة 👊', 'برق ⚡'];
      while (hpA > 0 && hpB > 0) {
        const dmg = 12 + Math.floor(Math.random() * 22);
        const mv = moves[Math.floor(Math.random() * moves.length)];
        if (turn === 0) { hpB = Math.max(0, hpB - dmg); log.push(`${a.name} ← ${mv} (-${dmg})`); }
        else { hpA = Math.max(0, hpA - dmg); log.push(`${b.name} ← ${mv} (-${dmg})`); }
        turn = 1 - turn;
      }
      const winner = hpA > 0 ? a.id : b.id;
      const embed = new EmbedBuilder().setColor(COLORS.info || 0x5cc8ff).setTitle('⚔️ مبارزة سريعة')
        .setDescription(`<@${a.id}> ضد <@${b.id}>\n\n${log.slice(-4).join('\n')}\n\n🏆 الفائز: <@${winner}>`);
      return send(interaction, embed, await duelCard({ a, b, hpA, hpB, winner, log }));
    }

    if (sub === 'wheel') {
      const key = `${interaction.guildId}:${interaction.user.id}`;
      const last = wheelCooldown.get(key) || 0;
      if (Date.now() - last < WHEEL_CD) {
        const mins = Math.ceil((WHEEL_CD - (Date.now() - last)) / 60000);
        return interaction.reply({ content: `⏳ يمكنك تدوير العجلة مرة أخرى بعد **${mins}** دقيقة.`, ephemeral: true });
      }
      wheelCooldown.set(key, Date.now());
      const index = Math.floor(Math.random() * WHEEL.length);
      const prize = WHEEL[index];
      const { g, u } = getUser(interaction.guildId, interaction.user.id);
      u.balance = Math.max(0, u.balance + prize.amount);
      saveUser(interaction.guildId, g);
      const prizeText = prize.amount > 0 ? `ربحت ${fmt(prize.amount)}` : prize.amount < 0 ? `خسرت ${fmt(-prize.amount)}` : 'لا شيء هذه المرة';
      const embed = new EmbedBuilder().setColor(COLORS.success || 0x3ee6a0).setTitle('🎡 عجلة الحظ')
        .setDescription(`${prizeText} ${prize.amount ? CURRENCY : ''}\nرصيدك الآن: **${fmt(u.balance)}** ${CURRENCY}`);
      return send(interaction, embed, await luckyWheelCard({ user: me, prizes: WHEEL, index, prizeText }));
    }
  },
};
