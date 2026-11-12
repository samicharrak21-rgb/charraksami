const RANK_TIERS = [
  { minLevel: 0, maxLevel: 9, name: 'برونز', emoji: '🥉', color: 0x9E9E9E },
  { minLevel: 10, maxLevel: 29, name: 'فضة', emoji: '🥈', color: 0xC0C0C0 },
  { minLevel: 30, maxLevel: 59, name: 'ذهب', emoji: '🥇', color: 0xFFD700 },
  { minLevel: 60, maxLevel: 94, name: 'الماس', emoji: '💎', color: 0x00BCD4, special: 'صلاحيات خاصة' },
  { minLevel: 95, maxLevel: Infinity, name: 'VIP', emoji: '👑', color: 0x9C27B0, special: 'كل الامتيازات' }
];

function getRankForLevel(level) {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (level >= RANK_TIERS[i].minLevel) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

function getRankForXP(xp) {
  // Convert XP to level (xp / 1000)
  const level = Math.floor(xp / 100); // 100 XP per level
  return getRankForLevel(level);
}

module.exports = {
  RANK_TIERS,
  getRankForXP,
  getRankForLevel
};
