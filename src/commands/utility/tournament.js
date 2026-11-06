// نظام البطولات — تسجيل وانطلاق وقوائم متصدرين
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fmt, getUser, saveUser, brandedEmbed, errorEmbed, balanceFooter, safeReply, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');
const { readGuild, writeGuild } = require('../../utils/guildStorage');

module.exports = {
  aliases: ['بطولة','tournament'],
  data: new SlashCommandBuilder().setName('tournament').setDescription('🏆 البطولات')
    .addSubcommand(s => s.setName('create').setDescription('إنشاء بطولة').addStringOption(o => o.setName('name').setRequired(true).setDescription('الاسم')).addIntegerOption(o => o.setName('entry').setDescription('رسوم الدخول').setRequired(true).setMinValue(50)))
    .addSubcommand(s => s.setName('join').setDescription('الانضمام').addStringOption(o => o.setName('id').setRequired(true).setDescription('معرف البطولة')))
    .addSubcommand(s => s.setName('list').setDescription('قائمة البطولات'))
    .addSubcommand(s => s.setName('start').setDescription('بدء البطولة').addStringOption(o => o.setName('id').setRequired(true).setDescription('المعرف'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id, userId = interaction.user.id;
    const g = readGuild(guildId);
    g.tournaments = g.tournaments || {};

    if (sub === 'create') {
      const name = interaction.options.getString('name');
      const entry = interaction.options.getInteger('entry');
      const id = Date.now().toString(36);
      g.tournaments[id] = { id, name, entry, host: userId, players: [userId], pool: 0, started: false };
      const { u } = getUser(guildId, userId);
      if (u.balance < entry) { delete g.tournaments[id]; return safeReply(interaction, { embeds:[errorEmbed('رصيد غير كافٍ','')], ephemeral:true }); }
      u.balance -= entry; g.tournaments[id].pool += entry; g.users[userId] = u;
      writeGuild(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'🏆 تم الإنشاء', COLORS.success).setDescription(`**${name}**\n🆔 \`${id}\`\n💰 الدخول: ${fmt(entry)} ${CURRENCY}\nاستخدم \`/tournament join id:${id}\``).setFooter(balanceFooter(u))] });
    }
    if (sub === 'list') {
      const arr = Object.values(g.tournaments).filter(t => !t.started);
      if (!arr.length) return safeReply(interaction, { embeds:[brandedEmbed(interaction,'لا توجد بطولات', COLORS.dark).setDescription('أنشئ واحدة بـ /tournament create')] });
      const lines = arr.map(t => `🆔 \`${t.id}\` — **${t.name}**\n  💰 ${fmt(t.entry)} • 👥 ${t.players.length} • جائزة ${fmt(t.pool)}`).join('\n\n');
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'🏆 البطولات المفتوحة', COLORS.info).setDescription(lines)] });
    }
    const id = interaction.options.getString('id');
    const t = g.tournaments[id];
    if (!t) return safeReply(interaction, { embeds:[errorEmbed('بطولة غير موجودة','')], ephemeral:true });
    if (sub === 'join') {
      if (t.started) return safeReply(interaction, { embeds:[errorEmbed('بدأت بالفعل','')], ephemeral:true });
      if (t.players.includes(userId)) return safeReply(interaction, { embeds:[errorEmbed('مسجل بالفعل','')], ephemeral:true });
      const { u } = getUser(guildId, userId);
      if (u.balance < t.entry) return safeReply(interaction, { embeds:[errorEmbed('رصيد','')], ephemeral:true });
      u.balance -= t.entry; t.pool += t.entry; t.players.push(userId);
      g.users[userId] = u; writeGuild(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'✅ انضممت', COLORS.success).setDescription(`**${t.name}** — اللاعبين: ${t.players.length}`).setFooter(balanceFooter(u))] });
    }
    if (sub === 'start') {
      if (t.host !== userId) return safeReply(interaction, { embeds:[errorEmbed('فقط المضيف يبدأ','')], ephemeral:true });
      if (t.players.length < 2) return safeReply(interaction, { embeds:[errorEmbed('لاعبون غير كافين','')], ephemeral:true });
      // عشوائياً: اختر الفائز بناء على إجمالي XP (نظام بسيط)
      const players = t.players.map(pid => ({ pid, score: (g.users[pid]?.xp || 0) + Math.random()*1000 })).sort((a,b)=>b.score-a.score);
      const winner = players[0];
      g.users[winner.pid].balance += t.pool;
      t.started = true; t.winner = winner.pid;
      writeGuild(guildId, g);
      const lines = players.slice(0,5).map((p,i) => `${['🥇','🥈','🥉','4.','5.'][i]} <@${p.pid}>`).join('\n');
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,`🏆 انتهت ${t.name}`, COLORS.gold).setDescription(`👑 الفائز: <@${winner.pid}>\n💰 جائزة: **${fmt(t.pool)}** ${CURRENCY}\n\n${lines}`)] });
    }
  }
};
