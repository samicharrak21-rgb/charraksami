const { SlashCommandBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const {
  fmt, validateBet, saveUser, brandedEmbed, gifEmbed,
  winEmbed, loseEmbed, balanceFooter, safeReply, CURRENCY
} = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');

/**
 * /lottery — يومي/مجمع. كل تذكرة 100 جوهرة. يجمع الكل في pot.
 *   buy <count>      شراء تذاكر
 *   info             حالة الجائزة
 *   draw  (admin)    سحب الفائز
 */
module.exports = {
  aliases: ['يانصيب', 'lottery'],
  data: new SlashCommandBuilder()
    .setName('lottery')
    .setDescription('🎟️ يانصيب السيرفر — اشترِ تذاكر واربح الجائزة الكبرى')
    .addSubcommand(s => s.setName('buy')
      .setDescription('شراء تذاكر')
      .addIntegerOption(o => o.setName('count').setDescription('عدد التذاكر').setRequired(true).setMinValue(1).setMaxValue(50)))
    .addSubcommand(s => s.setName('info').setDescription('عرض حالة اليانصيب'))
    .addSubcommand(s => s.setName('draw').setDescription('سحب الفائز (للإدارة)')),

  async execute(interaction) {
    const TICKET = 100;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const g = readGuild(guildId);
    g.lottery = g.lottery || { pot: 0, tickets: {} }; // tickets: userId -> count
    g.users = g.users || {};

    if (sub === 'info') {
      const total = Object.values(g.lottery.tickets).reduce((a, b) => a + b, 0);
      const top = Object.entries(g.lottery.tickets)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([id, n], i) => `**#${i + 1}** <@${id}> — \`${n}\` تذكرة`).join('\n') || 'لا يوجد مشاركون بعد.';
      const e = gifEmbed(interaction, '🎟️ يانصيب السيرفر', '', 'generic', 'loading', COLORS.gold)
        .setDescription(
          `💰 **الجائزة الحالية:** \`${fmt(g.lottery.pot)}\` ${CURRENCY}\n` +
          `🎫 **مجموع التذاكر:** \`${total}\`\n` +
          `🪙 **سعر التذكرة:** \`${TICKET}\` ${CURRENCY}\n\n` +
          `**كبار المشاركين:**\n${top}`
        );
      return safeReply(interaction, { embeds: [e] });
    }

    if (sub === 'buy') {
      const count = interaction.options.getInteger('count');
      const cost = TICKET * count;
      const u = g.users[interaction.user.id] = g.users[interaction.user.id] || { balance: 1000, xp: 0, level: 1, stats: {} };
      if (u.balance < cost) {
        return safeReply(interaction, { embeds: [loseEmbed(interaction, 'رصيد غير كافٍ', `تحتاج \`${fmt(cost)}\` ${CURRENCY} لشراء ${count} تذكرة.`)] });
      }
      u.balance -= cost;
      g.lottery.pot += cost;
      g.lottery.tickets[interaction.user.id] = (g.lottery.tickets[interaction.user.id] || 0) + count;
      writeGuild(guildId, g);
      const e = winEmbed(interaction, 'تم شراء التذاكر!',
        `🎫 اشتريت **${count}** تذكرة بسعر **${fmt(cost)}** ${CURRENCY}\n💰 الجائزة الجديدة: \`${fmt(g.lottery.pot)}\` ${CURRENCY}`)
        .setFooter(balanceFooter(u));
      return safeReply(interaction, { embeds: [e] });
    }

    if (sub === 'draw') {
      if (!interaction.member.permissions.has('Administrator')) {
        return safeReply(interaction, { content: '❌ هذا الأمر للمشرفين فقط.', ephemeral: true });
      }
      const entries = [];
      for (const [uid, n] of Object.entries(g.lottery.tickets)) for (let i = 0; i < n; i++) entries.push(uid);
      if (!entries.length) return safeReply(interaction, { content: 'لا يوجد مشاركون.', ephemeral: true });
      const winner = entries[Math.floor(Math.random() * entries.length)];
      const prize = g.lottery.pot;
      g.users[winner] = g.users[winner] || { balance: 0, xp: 0, level: 1, stats: {} };
      g.users[winner].balance += prize;
      g.lottery = { pot: 0, tickets: {} };
      writeGuild(guildId, g);
      const e = winEmbed(interaction, '🎉 سحب اليانصيب!',
        `الفائز: <@${winner}>\n💰 الجائزة: **${fmt(prize)}** ${CURRENCY}\n\nمبروك! 🎊`, 'generic');
      return safeReply(interaction, { content: `<@${winner}>`, embeds: [e] });
    }
  }
};
