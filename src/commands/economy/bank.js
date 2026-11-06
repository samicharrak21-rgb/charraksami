// نظام البنك — إيداع/سحب/فائدة يومية + قروض
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fmt, getUser, saveUser, brandedEmbed, errorEmbed, balanceFooter, safeReply, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');

const INTEREST_RATE = 0.02; // 2% يومياً
const MAX_BANK = 1_000_000;

function ensureBank(u) {
  u.bank = u.bank || { balance: 0, lastInterest: Date.now(), loan: 0, loanDue: 0 };
  return u.bank;
}

function applyInterest(u) {
  const b = ensureBank(u);
  const now = Date.now();
  const days = Math.floor((now - b.lastInterest) / (24*3600*1000));
  if (days >= 1) {
    const gained = Math.floor(b.balance * INTEREST_RATE * days);
    b.balance = Math.min(MAX_BANK, b.balance + gained);
    b.lastInterest = now;
    return gained;
  }
  return 0;
}

module.exports = {
  aliases: ['بنك','bank'],
  data: new SlashCommandBuilder().setName('bank').setDescription('🏦 البنك — إيداع وسحب وفائدة')
    .addSubcommand(s => s.setName('view').setDescription('عرض البنك'))
    .addSubcommand(s => s.setName('deposit').setDescription('إيداع').addIntegerOption(o => o.setName('amount').setDescription('المبلغ').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('withdraw').setDescription('سحب').addIntegerOption(o => o.setName('amount').setDescription('المبلغ').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('loan').setDescription('طلب قرض').addIntegerOption(o => o.setName('amount').setDescription('المبلغ').setRequired(true).setMinValue(100).setMaxValue(50000)))
    .addSubcommand(s => s.setName('repay').setDescription('تسديد القرض').addIntegerOption(o => o.setName('amount').setDescription('المبلغ').setRequired(true).setMinValue(1))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id, guildId = interaction.guild.id;
    const { g, u } = getUser(guildId, userId);
    const b = ensureBank(u);
    const interest = applyInterest(u);

    if (sub === 'view') {
      saveUser(guildId, g);
      return safeReply(interaction, { embeds: [brandedEmbed(interaction, '🏦 حسابك البنكي', COLORS.gold).setDescription(
        `💼 الرصيد البنكي: **${fmt(b.balance)}** / ${fmt(MAX_BANK)} ${CURRENCY}\n` +
        `💵 محفظتك: **${fmt(u.balance)}** ${CURRENCY}\n` +
        `📈 الفائدة اليومية: **${(INTEREST_RATE*100)}%**\n` +
        (interest ? `\n✨ تمت إضافة فائدة: **+${fmt(interest)}** ${CURRENCY}\n` : '') +
        (b.loan ? `\n🔴 قرض مستحق: **${fmt(b.loan)}** ${CURRENCY}` : '')
      ).setFooter(balanceFooter(u))] });
    }

    const amount = interaction.options.getInteger('amount');
    if (sub === 'deposit') {
      if (u.balance < amount) return safeReply(interaction, { embeds:[errorEmbed('رصيد غير كافٍ','')], ephemeral:true });
      if (b.balance + amount > MAX_BANK) return safeReply(interaction, { embeds:[errorEmbed('سقف البنك',`الحد الأقصى ${fmt(MAX_BANK)}`)], ephemeral:true });
      u.balance -= amount; b.balance += amount; saveUser(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'✅ تم الإيداع', COLORS.success).setDescription(`أودعت **${fmt(amount)}** ${CURRENCY}\nالبنك: ${fmt(b.balance)}`).setFooter(balanceFooter(u))] });
    }
    if (sub === 'withdraw') {
      if (b.balance < amount) return safeReply(interaction, { embeds:[errorEmbed('رصيد بنكي غير كافٍ','')], ephemeral:true });
      b.balance -= amount; u.balance += amount; saveUser(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'💵 تم السحب', COLORS.success).setDescription(`سحبت **${fmt(amount)}** ${CURRENCY}`).setFooter(balanceFooter(u))] });
    }
    if (sub === 'loan') {
      if (b.loan > 0) return safeReply(interaction, { embeds:[errorEmbed('قرض قائم',`لديك قرض ${fmt(b.loan)} يجب تسديده أولاً.`)], ephemeral:true });
      b.loan = Math.floor(amount * 1.15);
      b.loanDue = Date.now() + 7*24*3600*1000;
      u.balance += amount; saveUser(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'🔴 تم منحك قرضاً', COLORS.warning).setDescription(`استلمت **${fmt(amount)}** ${CURRENCY}\nالمستحق: **${fmt(b.loan)}** خلال 7 أيام (فائدة 15%)`).setFooter(balanceFooter(u))] });
    }
    if (sub === 'repay') {
      if (b.loan <= 0) return safeReply(interaction, { embeds:[errorEmbed('لا يوجد قرض','')], ephemeral:true });
      const pay = Math.min(amount, b.loan, u.balance);
      u.balance -= pay; b.loan -= pay;
      if (b.loan <= 0) b.loanDue = 0;
      saveUser(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'✅ تسديد', COLORS.success).setDescription(`سددت **${fmt(pay)}** ${CURRENCY}\nالمتبقي: **${fmt(b.loan)}**`).setFooter(balanceFooter(u))] });
    }
  }
};
