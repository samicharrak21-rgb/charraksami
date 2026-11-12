// البورصة — أسهم وهمية بأسعار تتغير
const { SlashCommandBuilder } = require('discord.js');
const { fmt, getUser, saveUser, brandedEmbed, errorEmbed, balanceFooter, safeReply, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');
const { readGuild, writeGuild } = require('../../utils/guildStorage');

const STOCKS = {
  TECH: { name: 'تك جلوبل', base: 100, vol: 0.08, emoji: '💻' },
  OIL:  { name: 'النفط', base: 80, vol: 0.05, emoji: '🛢️' },
  GOLD: { name: 'الذهب', base: 300, vol: 0.03, emoji: '🥇' },
  GAME: { name: 'صناعة الألعاب', base: 50, vol: 0.12, emoji: '🎮' },
  AI:   { name: 'الذكاء الاصطناعي', base: 200, vol: 0.15, emoji: '🤖' }
};

function getMarket(g) {
  g.market = g.market || { prices: {}, lastUpdate: 0 };
  const now = Date.now();
  if (now - g.market.lastUpdate > 5*60*1000) {
    for (const [k, s] of Object.entries(STOCKS)) {
      const prev = g.market.prices[k] || s.base;
      const change = (Math.random() - 0.5) * 2 * s.vol;
      const next = Math.max(s.base * 0.3, Math.min(s.base * 5, prev * (1 + change)));
      g.market.prices[k] = Math.round(next * 100) / 100;
    }
    g.market.lastUpdate = now;
  }
  return g.market.prices;
}

module.exports = {
  defaultSub: 'view', subAliases: { 'محفظتي': 'portfolio', 'اسهمي': 'portfolio', 'شراء': 'buy', 'اشتري': 'buy', 'بيع': 'sell', 'بع': 'sell' },
  aliases: ['بورصة','stocks','market'],
  data: new SlashCommandBuilder().setName('stocks').setDescription('📈 البورصة')
    .addSubcommand(s => s.setName('view').setDescription('عرض السوق'))
    .addSubcommand(s => s.setName('portfolio').setDescription('محفظتي'))
    .addSubcommand(s => s.setName('buy').setDescription('شراء سهم').addStringOption(o => o.setName('symbol').setDescription('رمز السهم').setRequired(true).addChoices(...Object.keys(STOCKS).map(k=>({name:k,value:k})))).addIntegerOption(o => o.setName('shares').setDescription('عدد الأسهم').setRequired(true).setMinValue(1)))
    .addSubcommand(s => s.setName('sell').setDescription('بيع سهم').addStringOption(o => o.setName('symbol').setDescription('رمز السهم').setRequired(true).addChoices(...Object.keys(STOCKS).map(k=>({name:k,value:k})))).addIntegerOption(o => o.setName('shares').setDescription('عدد الأسهم').setRequired(true).setMinValue(1))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id, userId = interaction.user.id;
    const g = readGuild(guildId);
    const prices = getMarket(g);
    g.users = g.users || {};
    g.users[userId] = g.users[userId] || { balance: 1000, xp: 0, level: 1, stats: {}, inventory: {} };
    const u = g.users[userId];
    u.portfolio = u.portfolio || {};

    if (sub === 'view') {
      const lines = Object.entries(STOCKS).map(([k,s]) => `${s.emoji} **${k}** — ${s.name}\n  💰 ${fmt(prices[k])} ${CURRENCY}`).join('\n\n');
      writeGuild(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction, '📈 سوق الأسهم', COLORS.info).setDescription(lines + '\n\n*الأسعار تتحدث كل 5 دقائق*')] });
    }
    if (sub === 'portfolio') {
      const items = Object.entries(u.portfolio).filter(([,n]) => n > 0);
      let total = 0;
      const lines = items.map(([k, n]) => { const v = n * prices[k]; total += v; return `${STOCKS[k].emoji} **${k}** ×${n} — ${fmt(v)} ${CURRENCY}`; }).join('\n') || '*لا تملك أسهم*';
      writeGuild(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'💼 محفظتي', COLORS.info).setDescription(`${lines}\n\n💰 القيمة الإجمالية: **${fmt(total)}** ${CURRENCY}`).setFooter(balanceFooter(u))] });
    }
    const sym = interaction.options.getString('symbol');
    const n = interaction.options.getInteger('shares');
    const price = prices[sym];
    if (sub === 'buy') {
      const cost = Math.ceil(price * n);
      if (u.balance < cost) return safeReply(interaction, { embeds:[errorEmbed('رصيد غير كافٍ', `تحتاج ${fmt(cost)} ${CURRENCY}`)], ephemeral:true });
      u.balance -= cost; u.portfolio[sym] = (u.portfolio[sym] || 0) + n;
      writeGuild(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'✅ شراء', COLORS.success).setDescription(`اشتريت **${n}** سهم ${sym} بـ **${fmt(cost)}** ${CURRENCY}`).setFooter(balanceFooter(u))] });
    }
    if (sub === 'sell') {
      if ((u.portfolio[sym] || 0) < n) return safeReply(interaction, { embeds:[errorEmbed('أسهم غير كافية','')], ephemeral:true });
      const rev = Math.floor(price * n);
      u.balance += rev; u.portfolio[sym] -= n;
      writeGuild(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'💵 بيع', COLORS.success).setDescription(`بعت **${n}** سهم ${sym} بـ **${fmt(rev)}** ${CURRENCY}`).setFooter(balanceFooter(u))] });
    }
  }
};
