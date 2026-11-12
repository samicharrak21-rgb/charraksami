// 🏦 نظام البنك v24 — إيداع/سحب/فائدة يومية/قروض + بطاقة مصممة
// يعمل بالسلاش (/bank deposit) وبالعربي مباشرة: «بنك» «ايداع 500» «ايداع الكل» «سحب نص» «قرض 5000» «سدد الكل»
const { SlashCommandBuilder } = require('discord.js');
const { fmt, getUser, saveUser, brandedEmbed, errorEmbed, balanceFooter, safeReply, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');
const { cardMessage } = require('../../utils/cardEmbed');

const INTEREST_RATE = 0.02;      // 2% يومياً
const MAX_BANK = 1_000_000;      // سقف البنك
const LOAN_MIN = 100, LOAN_MAX = 50_000, LOAN_FEE = 0.15, LOAN_DAYS = 7;
const DAY = 24 * 3600 * 1000;

function ensureBank(u) {
  u.bank = u.bank || {};
  const b = u.bank;
  b.balance = Number(b.balance) || 0;
  b.lastInterest = Number(b.lastInterest) || Date.now();
  b.loan = Number(b.loan) || 0;
  b.loanDue = Number(b.loanDue) || 0;
  return b;
}

/** فائدة يومية مركبة على الأيام الفائتة (بحد أقصى 30 يوماً) — لا فائدة لمن عليه قرض متأخر */
function applyInterest(u, now = Date.now()) {
  const b = ensureBank(u);
  const days = Math.min(30, Math.floor((now - b.lastInterest) / DAY));
  if (days < 1) return 0;
  b.lastInterest += days * DAY;
  if (b.loan > 0 && b.loanDue && now > b.loanDue) return 0;
  const before = b.balance;
  b.balance = Math.min(MAX_BANK, Math.floor(b.balance * Math.pow(1 + INTEREST_RATE, days)));
  return b.balance - before;
}

/** قرض متأخر: يُخصم تلقائياً من البنك ثم المحفظة */
function collectOverdue(u, now = Date.now()) {
  const b = ensureBank(u);
  if (!(b.loan > 0 && b.loanDue && now > b.loanDue)) return 0;
  let taken = 0;
  const fromBank = Math.min(b.balance, b.loan); b.balance -= fromBank; b.loan -= fromBank; taken += fromBank;
  const fromWallet = Math.min(Math.max(0, u.balance), b.loan); u.balance -= fromWallet; b.loan -= fromWallet; taken += fromWallet;
  if (b.loan <= 0) { b.loan = 0; b.loanDue = 0; }
  return taken;
}

const SUB_WORDS = {
  view: ['عرض', 'بنك', 'البنك', 'حسابي', 'رصيد', 'مصرف', 'خزنه', 'ودائع', 'حساب'],
  deposit: ['ايداع', 'اودع', 'إيداع', 'حط', 'deposit', 'dep'],
  withdraw: ['سحب', 'اسحب', 'withdraw', 'with'],
  loan: ['قرض', 'اقترض', 'سلفه', 'سلفة', 'loan'],
  repay: ['سدد', 'تسديد', 'رجع', 'سداد', 'repay'],
};
const subAliases = {};
for (const [sub, words] of Object.entries(SUB_WORDS)) for (const w of words) subAliases[w] = sub;

/** يقرأ المبلغ: رقم، أو «الكل/نص/ربع» حسب المصدر */
function readAmount(interaction, sub, u, b) {
  let n = interaction.options.getInteger('amount');
  const raw = (interaction.options._args || []).map((a) => String(a).toLowerCase());
  const src = { deposit: u.balance, withdraw: b.balance, repay: Math.min(b.loan, u.balance), loan: LOAN_MAX }[sub] || 0;
  const has = (...w) => raw.some((a) => w.includes(a));
  if (has('نص', 'نصف', 'half')) return Math.floor(src / 2);
  if (has('ربع')) return Math.floor(src / 4);
  // في الأوامر النصية «الكل» تُحوَّل إلى رصيد المحفظة — نصححها حسب العملية
  if (has('الكل', 'كل', 'all', 'max', 'كامل')) return src;
  return n;
}

async function send(interaction, u, b, extra = {}) {
  const user = interaction.user;
  const member = interaction.guild?.members?.cache?.get(user.id);
  try {
    const { bankCard } = require('../../utils/modernCards');
    const card = await bankCard({
      username: member?.displayName || user.globalName || user.username,
      avatarURL: user.displayAvatarURL?.({ extension: 'png', size: 256 }),
      wallet: u.balance, bank: b.balance, max: MAX_BANK, rate: INTEREST_RATE,
      loan: b.loan, loanDue: b.loanDue, action: extra.action, amount: extra.amount, interest: extra.interest,
      nextInterestMs: Math.max(0, b.lastInterest + DAY - Date.now()),
    });
    if (card?.buffer) {
      return safeReply(interaction, cardMessage(card, {
        color: extra.color ?? COLORS.gold, title: extra.title, description: extra.description,
        footer: `💡 ايداع 500 · سحب الكل · قرض 5000 · سدد الكل — ${balanceFooter(u).text || ''}`.trim(),
      }));
    }
  } catch (e) { console.error('bank card failed:', e.message); }
  const e = brandedEmbed(interaction, extra.title || '🏦 حسابك البنكي', extra.color ?? COLORS.gold).setDescription([
    extra.description,
    `💼 البنك: **${fmt(b.balance)}** / ${fmt(MAX_BANK)} ${CURRENCY}`,
    `💵 المحفظة: **${fmt(u.balance)}** ${CURRENCY}`,
    `📈 الفائدة اليومية: **${INTEREST_RATE * 100}%**`,
    b.loan ? `🔴 قرض مستحق: **${fmt(b.loan)}** ${CURRENCY}` : null,
  ].filter(Boolean).join('\n')).setFooter(balanceFooter(u));
  return safeReply(interaction, { embeds: [e] });
}

const fail = (interaction, title, desc = '') => safeReply(interaction, { embeds: [errorEmbed(title, desc || '\u200b')], ephemeral: true });

module.exports = {
  aliases: ['بنك', 'bank', 'ايداع', 'سحب', 'قرض', 'سدد'],
  subAliases,
  defaultSub: 'view',
  gif: false,
  cooldown: 3,
  data: new SlashCommandBuilder().setName('bank').setDescription('🏦 البنك — إيداع وسحب وفائدة وقروض')
    .addSubcommand((s) => s.setName('view').setDescription('عرض حسابك البنكي'))
    .addSubcommand((s) => s.setName('deposit').setDescription('إيداع في البنك').addIntegerOption((o) => o.setName('amount').setDescription('المبلغ (اتركه فارغاً لإيداع الكل)').setMinValue(1)))
    .addSubcommand((s) => s.setName('withdraw').setDescription('سحب من البنك').addIntegerOption((o) => o.setName('amount').setDescription('المبلغ (اتركه فارغاً لسحب الكل)').setMinValue(1)))
    .addSubcommand((s) => s.setName('loan').setDescription('طلب قرض').addIntegerOption((o) => o.setName('amount').setDescription('المبلغ').setRequired(true).setMinValue(LOAN_MIN).setMaxValue(LOAN_MAX)))
    .addSubcommand((s) => s.setName('repay').setDescription('تسديد القرض').addIntegerOption((o) => o.setName('amount').setDescription('المبلغ (اتركه فارغاً لتسديد الكل)').setMinValue(1))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand(false) || 'view';
    const guildId = interaction.guild.id, userId = interaction.user.id;
    const { g, u } = getUser(guildId, userId);
    const b = ensureBank(u);
    const interest = applyInterest(u);
    const overdue = collectOverdue(u);
    const notes = [];
    if (interest) notes.push(`✨ أضيفت فائدة: **+${fmt(interest)}** ${CURRENCY}`);
    if (overdue) notes.push(`⚠️ تأخرت في سداد القرض — خُصم **${fmt(overdue)}** ${CURRENCY} تلقائياً`);

    if (sub === 'view') {
      saveUser(guildId, g);
      return send(interaction, u, b, { title: '🏦 حسابك البنكي', description: notes.join('\n') || null, interest });
    }

    let amount = readAmount(interaction, sub, u, b);
    // بدون مبلغ: الإيداع/السحب/التسديد = الكل
    if (amount == null && sub === 'deposit') amount = u.balance;
    if (amount == null && sub === 'withdraw') amount = b.balance;
    if (amount == null && sub === 'repay') amount = Math.min(b.loan, u.balance);
    amount = Math.floor(Number(amount) || 0);

    if (sub === 'deposit') {
      const room = MAX_BANK - b.balance;
      if (room <= 0) return fail(interaction, 'البنك ممتلئ', `وصلت للسقف **${fmt(MAX_BANK)}** ${CURRENCY}`);
      amount = Math.min(amount, room);
      if (amount <= 0) return fail(interaction, 'مبلغ غير صالح', 'اكتب مثلاً: `ايداع 500` أو `ايداع الكل`');
      if (u.balance < amount) return fail(interaction, 'رصيد غير كافٍ', `محفظتك: **${fmt(u.balance)}** ${CURRENCY}`);
      u.balance -= amount; b.balance += amount; saveUser(guildId, g);
      return send(interaction, u, b, { action: 'deposit', amount, color: COLORS.success, title: '✅ تم الإيداع', description: [`أودعت **${fmt(amount)}** ${CURRENCY} — أموالك الآن في أمان من السرقة 🛡️`, ...notes].join('\n') });
    }
    if (sub === 'withdraw') {
      if (amount <= 0) return fail(interaction, 'مبلغ غير صالح', 'اكتب مثلاً: `سحب 500` أو `سحب الكل`');
      if (b.balance < amount) return fail(interaction, 'رصيد بنكي غير كافٍ', `في البنك: **${fmt(b.balance)}** ${CURRENCY}`);
      b.balance -= amount; u.balance += amount; saveUser(guildId, g);
      return send(interaction, u, b, { action: 'withdraw', amount, color: COLORS.success, title: '💵 تم السحب', description: [`سحبت **${fmt(amount)}** ${CURRENCY} إلى محفظتك`, ...notes].join('\n') });
    }
    if (sub === 'loan') {
      if (b.loan > 0) return fail(interaction, 'لديك قرض قائم', `سدد **${fmt(b.loan)}** ${CURRENCY} أولاً — اكتب \`سدد الكل\``);
      if (amount < LOAN_MIN || amount > LOAN_MAX) return fail(interaction, 'مبلغ القرض', `من **${fmt(LOAN_MIN)}** إلى **${fmt(LOAN_MAX)}** ${CURRENCY}`);
      b.loan = Math.floor(amount * (1 + LOAN_FEE));
      b.loanDue = Date.now() + LOAN_DAYS * DAY;
      u.balance += amount; saveUser(guildId, g);
      return send(interaction, u, b, { action: 'loan', amount, color: COLORS.warning, title: '📝 تمت الموافقة على القرض', description: [`استلمت **${fmt(amount)}** ${CURRENCY}`, `المستحق: **${fmt(b.loan)}** خلال ${LOAN_DAYS} أيام (رسوم ${LOAN_FEE * 100}%)`, '⚠️ بعد المهلة يُخصم تلقائياً ولا تحصل على فائدة', ...notes].join('\n') });
    }
    if (sub === 'repay') {
      if (b.loan <= 0) return fail(interaction, 'لا يوجد قرض', 'حسابك نظيف 🟢');
      const pay = Math.min(amount, b.loan, u.balance);
      if (pay <= 0) return fail(interaction, 'رصيد غير كافٍ', `محفظتك: **${fmt(u.balance)}** ${CURRENCY}`);
      u.balance -= pay; b.loan -= pay;
      if (b.loan <= 0) { b.loan = 0; b.loanDue = 0; }
      saveUser(guildId, g);
      return send(interaction, u, b, { action: 'repay', amount: pay, color: COLORS.success, title: '✔️ تم التسديد', description: [`سددت **${fmt(pay)}** ${CURRENCY}`, b.loan ? `المتبقي: **${fmt(b.loan)}**` : '🎉 تم سداد القرض بالكامل!', ...notes].join('\n') });
    }
    return send(interaction, u, b, { title: '🏦 حسابك البنكي' });
  },
  _test: { applyInterest, collectOverdue, ensureBank, readAmount, MAX_BANK, INTEREST_RATE, LOAN_FEE },
};
