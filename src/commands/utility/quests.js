// مهام يومية ذكية — تتولد ديناميكياً
const { SlashCommandBuilder } = require('discord.js');
const { fmt, getUser, saveUser, brandedEmbed, balanceFooter, safeReply, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');

const TEMPLATES = [
  { id:'msg10', name:'أرسل 10 رسائل', stat:'messages_today', target:10, reward:200, xp:30 },
  { id:'msg30', name:'أرسل 30 رسالة', stat:'messages_today', target:30, reward:600, xp:80 },
  { id:'play3', name:'العب 3 ألعاب', stat:'game_today', target:3, reward:400, xp:50 },
  { id:'play5', name:'العب 5 ألعاب', stat:'game_today', target:5, reward:800, xp:100 },
  { id:'work2', name:'اعمل مرتين', stat:'work_today', target:2, reward:300, xp:40 },
  { id:'daily', name:'احصل على المكافأة اليومية', stat:'daily_today', target:1, reward:200, xp:20 }
];

function todayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

function rollQuests(u) {
  const day = todayKey();
  if (!u.quests || u.quests.day !== day) {
    const picks = [...TEMPLATES].sort(()=>Math.random()-0.5).slice(0,3).map(t => ({...t, claimed:false}));
    u.quests = { day, list: picks };
    // reset daily counters
    u.stats.messages_today = 0; u.stats.work_today = 0; u.stats.daily_today = 0; u.stats.game_today = 0;
  }
  return u.quests;
}

module.exports = {
  aliases: ['مهام','quests','daily-quests'],
  data: new SlashCommandBuilder().setName('quests').setDescription('📜 المهام اليومية')
    .addSubcommand(s => s.setName('view').setDescription('عرض المهام'))
    .addSubcommand(s => s.setName('claim').setDescription('استلام المكافآت المكتملة')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id, guildId = interaction.guild.id;
    const { g, u } = getUser(guildId, userId);
    const q = rollQuests(u);

    if (sub === 'view') {
      const lines = q.list.map(t => {
        const cur = u.stats[t.stat] || 0;
        const done = cur >= t.target;
        const bar = '█'.repeat(Math.min(10, Math.floor(cur/t.target*10))) + '░'.repeat(10 - Math.min(10, Math.floor(cur/t.target*10)));
        return `${t.claimed?'✅':done?'🎁':'⏳'} **${t.name}**\n  ${bar} ${Math.min(cur,t.target)}/${t.target}\n  💰 ${fmt(t.reward)} • ✨ ${t.xp} XP`;
      }).join('\n\n');
      saveUser(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'📜 مهام اليوم', COLORS.info).setDescription(lines).setFooter(balanceFooter(u))] });
    }
    if (sub === 'claim') {
      let total = 0, totalXp = 0, claimed = 0;
      for (const t of q.list) {
        if (t.claimed) continue;
        const cur = u.stats[t.stat] || 0;
        if (cur >= t.target) { t.claimed = true; total += t.reward; totalXp += t.xp; claimed++; }
      }
      if (!claimed) return safeReply(interaction, { embeds:[brandedEmbed(interaction,'لا شيء للاستلام', COLORS.warning).setDescription('أكمل مهامك أولاً.')], ephemeral:true });
      u.balance += total; u.xp += totalXp; saveUser(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'🎁 تم الاستلام!', COLORS.success).setDescription(`أكملت **${claimed}** مهمة\n💰 +${fmt(total)} ${CURRENCY} • ✨ +${totalXp} XP`).setFooter(balanceFooter(u))] });
    }
  }
};
