// ============= Achievements & Badges System =============
// نظام إنجازات يعمل تلقائياً: عند أي حدث (لعب، فوز، يومي…) يتم استدعاء
// checkAchievements ويُمنح المستخدم وسام جديد + مكافأة وإشعار.

const { readGuild, writeGuild } = require('../utils/guildStorage');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embeds');

// تعريف الإنجازات. كل إنجاز:
//   id, emoji, name, desc, reward (جواهر), xp, condition(u, g) → bool
const ACHIEVEMENTS = [
  // عامة
  { id: 'first_steps',  emoji: '👶', name: 'الخطوات الأولى', desc: 'أرسل أول 10 رسائل.',
    reward: 200, xp: 50,  cond: u => (u.stats?.messages_count || 0) >= 10 },
  { id: 'chatterbox',   emoji: '🗣️', name: 'ثرثار', desc: 'أرسل 1000 رسالة.',
    reward: 2000, xp: 500, cond: u => (u.stats?.messages_count || 0) >= 1000 },
  { id: 'social',       emoji: '🌐', name: 'محبوب', desc: 'أرسل 5000 رسالة.',
    reward: 10000, xp: 2000, cond: u => (u.stats?.messages_count || 0) >= 5000 },

  // مستويات
  { id: 'lvl_5',  emoji: '🥉', name: 'البداية', desc: 'وصلت للمستوى 5.',
    reward: 500,  xp: 0, cond: u => (u.level || 1) >= 5 },
  { id: 'lvl_10', emoji: '🥈', name: 'مثابر', desc: 'وصلت للمستوى 10.',
    reward: 1500, xp: 0, cond: u => (u.level || 1) >= 10 },
  { id: 'lvl_25', emoji: '🥇', name: 'محترف', desc: 'وصلت للمستوى 25.',
    reward: 5000, xp: 0, cond: u => (u.level || 1) >= 25 },
  { id: 'lvl_50', emoji: '👑', name: 'أسطورة', desc: 'وصلت للمستوى 50.',
    reward: 25000, xp: 0, cond: u => (u.level || 1) >= 50 },

  // ثروة
  { id: 'rich_10k',  emoji: '💰', name: 'ثري صغير', desc: 'اجمع 10,000 جوهرة.',
    reward: 1000, xp: 100, cond: u => (u.balance || 0) >= 10000 },
  { id: 'rich_100k', emoji: '🏦', name: 'ثري كبير', desc: 'اجمع 100,000 جوهرة.',
    reward: 5000, xp: 500, cond: u => (u.balance || 0) >= 100000 },
  { id: 'tycoon',    emoji: '💎', name: 'قطب مالي', desc: 'اجمع 1,000,000 جوهرة.',
    reward: 50000, xp: 5000, cond: u => (u.balance || 0) >= 1000000 },

  // ألعاب
  { id: 'lucky',       emoji: '🎰', name: 'محظوظ', desc: 'افز بالسلوتس 10 مرات.',
    reward: 1000, xp: 100, cond: u => (u.stats?.slots_wins || 0) >= 10 },
  { id: 'jackpot',     emoji: '💥', name: 'ضربة الجاكبوت', desc: 'افز بالسلوتس 50 مرة.',
    reward: 7500, xp: 500, cond: u => (u.stats?.slots_wins || 0) >= 50 },
  { id: 'gambler',     emoji: '🃏', name: 'مقامر', desc: 'العب البلاك جاك 50 مرة.',
    reward: 1500, xp: 200, cond: u => (u.stats?.blackjack_count || 0) >= 50 },
  { id: 'fisher',      emoji: '🎣', name: 'صياد ماهر', desc: 'اصطد 25 مرة.',
    reward: 1000, xp: 100, cond: u => (u.stats?.fish_count || 0) >= 25 },
  { id: 'thief',       emoji: '🥷', name: 'لص محترف', desc: 'انجح في 10 سرقات.',
    reward: 2500, xp: 200, cond: u => (u.stats?.rob_wins || 0) >= 10 },

  // مواظبة
  { id: 'streak_7',  emoji: '🔥', name: 'أسبوع كامل', desc: 'سلسلة هدية يومية 7 أيام.',
    reward: 2000, xp: 200, cond: u => (u.daily_streak || 0) >= 7 },
  { id: 'streak_14', emoji: '💫', name: 'لا يتوقف', desc: 'سلسلة هدية يومية 14 يوم.',
    reward: 7500, xp: 500, cond: u => (u.daily_streak || 0) >= 14 },

  // اجتماعي
  { id: 'generous', emoji: '🎁', name: 'كريم', desc: 'حوّل لشخص آخر 5 مرات.',
    reward: 1000, xp: 100, cond: u => (u.stats?.pay_count || 0) >= 5 },
];

const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

/**
 * يفحص جميع الإنجازات للمستخدم. يضيف الجديد منها ويرسل إشعار للقناة (اختياري).
 * يُستدعى بعد كل تعديل مهم (مكافأة، فوز، رسالة…).
 */
async function checkAchievements(guildId, userId, channel = null) {
  const g = readGuild(guildId);
  g.users = g.users || {};
  const u = g.users[userId];
  if (!u) return [];

  u.achievements = u.achievements || [];
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (u.achievements.includes(a.id)) continue;
    try {
      if (a.cond(u, g)) {
        u.achievements.push(a.id);
        u.balance = (u.balance || 0) + (a.reward || 0);
        u.xp = (u.xp || 0) + (a.xp || 0);
        newly.push(a);
      }
    } catch {}
  }
  if (newly.length) {
    g.users[userId] = u;
    writeGuild(guildId, g);
    if (channel && channel.isTextBased?.()) {
      for (const a of newly) {
        const e = new EmbedBuilder()
          .setColor(COLORS.gold)
          .setTitle(`🏆 إنجاز جديد: ${a.emoji} ${a.name}`)
          .setDescription(`<@${userId}> فتح إنجازاً!\n\n*${a.desc}*\n\n💰 **+${a.reward.toLocaleString()}** جوهرة` +
            (a.xp ? `  •  ✨ **+${a.xp}** XP` : ''))
          .setTimestamp();
        channel.send({ embeds: [e] }).catch(() => {});
      }
    }
  }
  return newly;
}

function listAchievements() { return ACHIEVEMENTS; }
function getAchievement(id) { return ACHIEVEMENTS_BY_ID[id]; }

module.exports = { checkAchievements, listAchievements, getAchievement, ACHIEVEMENTS };
