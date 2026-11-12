// 📈 levelInfo v21 — معلومات المستوى الموحدة (الترتيب في السيرفر، اللقب، المكافأة القادمة، الشارات، سلسلة النشاط)
const config = require('../config');

/** ألقاب حسب المستوى */
const TITLES = [
  [1, '🌱 عضو جديد'], [5, '💬 متفاعل'], [10, '⭐ نشيط'], [15, '🔥 مميز'], [20, '💎 نجم السيرفر'],
  [30, '👑 نخبة'], [40, '🌌 أسطورة'], [50, '🐉 أسطورة خالدة'], [75, '☄️ كائن كوني'], [100, '♾️ ما بعد الأسطورة'],
];
const titleFor = (level) => {
  let t = TITLES[0][1];
  for (const [l, name] of TITLES) if (level >= l) t = name;
  return t;
};

/** شارات تلقائية من الإحصائيات */
function badgesFor(u = {}) {
  const s = u.stats || {};
  const b = [];
  if ((u.prestige || 0) > 0) b.push('🌟');
  if ((u.dungeon_wins || 0) >= 10) b.push('⚔️');
  if ((u.farm?.totalHarvested || 0) >= 50) b.push('🌾');
  if ((s.messages_count || 0) >= 1000) b.push('💬');
  if ((u.balance || 0) >= 100000) b.push('💰');
  if ((u.xp_streak || 0) >= 7) b.push('🔥');
  if ((s.slots_wins || 0) + (s.roulette_wins || 0) + (s.bj_wins || 0) >= 25) b.push('🎰');
  if ((u.shadow_army || []).length >= 10) b.push('🌑');
  return b;
}

/** ترتيب العضو في السيرفر حسب الخبرة الكلية */
function serverRank(g, userId) {
  const list = Object.entries(g.users || {})
    .filter(([, x]) => (x.xp || 0) > 0)
    .sort(([, a], [, b]) => ((b.prestige || 0) - (a.prestige || 0)) || ((b.xp || 0) - (a.xp || 0)));
  const idx = list.findIndex(([id]) => id === userId);
  return { rank: idx >= 0 ? idx + 1 : list.length + 1, totalUsers: Math.max(list.length, 1) };
}

/** أقرب رتبة مستوى قادمة (من levelroles) */
function nextLevelRole(g, guild, level) {
  const entries = Object.entries(g.levelRoles || {})
    .map(([l, roles]) => [parseInt(l, 10), roles])
    .filter(([l, roles]) => l > level && Array.isArray(roles) && roles.length)
    .sort((a, b) => a[0] - b[0]);
  if (!entries.length) return null;
  const [lvl, roles] = entries[0];
  const role = guild?.roles?.cache?.get(roles[0]);
  return { level: lvl, name: role?.name || 'رتبة جديدة' };
}

/** اسم الرتبة الممنوحة عند هذا المستوى بالضبط */
function roleAtLevel(g, guild, level) {
  const roles = g.levelRoles?.[String(level)];
  if (!Array.isArray(roles) || !roles.length) return null;
  return guild?.roles?.cache?.get(roles[0])?.name || null;
}

/**
 * سلسلة النشاط اليومي: كل يوم متتالٍ فيه تفاعل يرفع مضاعف الخبرة 5% (حتى +50%).
 * أول رسالة في اليوم تمنح مكافأة +50 XP. يُرجع { mult, dailyBonus, streak }.
 */
function touchStreak(u, now = Date.now()) {
  const day = Math.floor(now / 86_400_000);
  const last = u.xp_day ?? null;
  let dailyBonus = 0;
  if (last !== day) {
    u.xp_streak = last === day - 1 ? (u.xp_streak || 0) + 1 : 1;
    u.xp_day = day;
    dailyBonus = 50;
  }
  const mult = 1 + Math.min(0.5, Math.max(0, (u.xp_streak || 1) - 1) * 0.05);
  return { mult, dailyBonus, streak: u.xp_streak || 1 };
}

/** لقطة كاملة لبطاقة المستوى */
function levelSnapshot(g, guild, userId, xpForLevel) {
  const u = g.users?.[userId] || { xp: 0, level: 1, balance: 0 };
  const total = u.xp || 0;
  // المستوى المخزن قد يتأخر عن الخبرة الفعلية — نعرض الأعلى
  let level = u.level || 1;
  while (xpForLevel(level + 1) <= total) level++;
  const base = xpForLevel(level), next = xpForLevel(level + 1);
  const { rank, totalUsers } = serverRank(g, userId);
  const nr = nextLevelRole(g, guild, level);
  let nextReward = null;
  try {
    const { getRewardConfig, rewardForLevel } = require('./levelRewards');
    const gems = rewardForLevel(getRewardConfig(g), level + 1);
    const parts = [];
    if (gems) parts.push(`${gems.toLocaleString('en-US')} ${config.CURRENCY || '💎'}`);
    if (nr) parts.push(nr.level === level + 1 ? `رتبة ${nr.name}` : `رتبة ${nr.name} عند المستوى ${nr.level}`);
    nextReward = parts.join(' + ') || null;
  } catch {}
  return {
    u, level, totalXP: total, xp: Math.max(0, total - base), nextXP: Math.max(1, next - base),
    rank, totalUsers, prestige: u.prestige || 0, title: titleFor(level), nextReward, badges: badgesFor(u),
    streak: u.xp_streak || 0,
  };
}

module.exports = { TITLES, titleFor, badgesFor, serverRank, nextLevelRole, roleAtLevel, touchStreak, levelSnapshot };
